"""Acceso a SPHEREx en IRSA: colecciones, consulta SIA, épocas y cutouts.

Referencia: https://caltech-ipac.github.io/irsa-tutorials/spherex/
"""
from __future__ import annotations

import logging
import random
import re
import time
from dataclasses import dataclass
from functools import cached_property
from typing import Any

import numpy as np
import requests
from astropy.io import fits
from astropy.time import Time
from astropy.wcs import WCS, FITSFixedWarning

from . import cache, config
from .errors import ApiError, no_coverage, upstream_timeout
from .grid import Query

log = logging.getLogger(__name__)

import warnings  # noqa: E402

warnings.simplefilter("ignore", FITSFixedWarning)

from astropy import log as _astropy_log  # noqa: E402

_astropy_log.setLevel("WARNING")  # el WCS espectral "W" trae SIP sin sufijo: aviso inofensivo

DETECTORS = {
    "D1": (0.75, 1.09),
    "D2": (1.10, 1.62),
    "D3": (1.63, 2.41),
    "D4": (2.42, 3.82),
    "D5": (3.83, 4.41),
    "D6": (4.42, 5.00),
}
DETECTOR_IDS = list(DETECTORS)

_COLL_RE = re.compile(r"^spherex_(dr|qr)(\d*)$")


# ----------------------------------------------------------------------------- colecciones

def _collection_priority(name: str) -> tuple:
    """DR antes que QR; dentro de cada tipo, la versión más nueva primero."""
    m = _COLL_RE.match(name)
    if not m:
        return (9, 0)
    kind, num = m.groups()
    return (0 if kind == "dr" else 1, -(int(num) if num else 0))


def collections() -> list[str]:
    if config.COLLECTIONS:
        return list(config.COLLECTIONS)
    p = cache.path("meta", "collections", "json")
    cached = cache.read_json(p, max_age_s=config.SIA_CACHE_TTL_S)
    if cached:
        return cached
    try:
        from astroquery.ipac.irsa import Irsa

        tab = Irsa.list_collections(servicetype="SIA", filter="spherex")
        names = [str(n) for n in tab["collection"] if _COLL_RE.match(str(n))]
    except Exception as e:  # noqa: BLE001
        log.warning("No pude listar colecciones de IRSA (%s); uso default", e)
        names = []
    if not names:
        names = ["spherex_dr1", "spherex_qr"]
    names = sorted(set(names), key=_collection_priority)
    cache.write_json(p, names)
    return names


# ----------------------------------------------------------------------------- consulta SIA

def _detector_from_band(band: str) -> str | None:
    m = re.search(r"D([1-6])", str(band))
    return f"D{m.group(1)}" if m else None


def _isot_z(mjd: float) -> str:
    return Time(mjd, format="mjd", scale="utc").isot[:23] + "Z"


def _query_collection(ra: float, dec: float, coll: str) -> list[dict]:
    from astropy.coordinates import SkyCoord
    import astropy.units as u
    from astroquery.ipac.irsa import Irsa

    Irsa.TIMEOUT = config.HTTP_TIMEOUT_S
    coord = SkyCoord(ra * u.deg, dec * u.deg, frame="icrs")
    tab = Irsa.query_sia(pos=(coord, 1 * u.arcsec), collection=coll)
    rows = []
    cols = set(tab.colnames)
    for r in tab:
        if "dataproduct_type" in cols and str(r["dataproduct_type"]).strip() not in ("image", ""):
            continue
        det = _detector_from_band(r["energy_bandpassname"]) if "energy_bandpassname" in cols else None
        if det is None:
            continue
        obs_id = str(r["obs_id"]).strip()
        # algunos obs_id ya traen el detector como sufijo: no duplicarlo
        base = re.sub(r"[_-]?D[1-6]$", "", obs_id)
        t_min, t_max = float(r["t_min"]), float(r["t_max"])
        rows.append({
            "id": f"{base}_{det}",
            "obs_id": base,
            "collection": str(r["obs_collection"]).strip() if "obs_collection" in cols else coll,
            "detector": det,
            "mjd": round((t_min + t_max) / 2.0, 6),
            "exptime_s": float(r["t_exptime"]) if "t_exptime" in cols else None,
            "em_min_um": float(r["em_min"]) * 1e6 if "em_min" in cols else None,
            "em_max_um": float(r["em_max"]) * 1e6 if "em_max" in cols else None,
            "access_url": str(r["access_url"]).strip(),
        })
    return rows


def dedupe(rows: list[dict], priority: list[str]) -> list[dict]:
    """Regla 1: mismo obs_id+detector en varias colecciones -> gana la de mayor prioridad (DR1)."""
    rank = {c: i for i, c in enumerate(priority)}
    best: dict[str, dict] = {}
    for r in rows:
        cur = best.get(r["id"])
        if cur is None or rank.get(r["collection"], 99) < rank.get(cur["collection"], 99):
            best[r["id"]] = r
    return sorted(best.values(), key=lambda r: (r["mjd"], r["detector"]))


def find_frames(ra: float, dec: float) -> list[dict]:
    """Todos los frames de SPHEREx que contienen (ra, dec). Cacheado SIA_CACHE_TTL_S."""
    colls = collections()
    key = f"{ra:.4f}_{dec:+.4f}_{'-'.join(colls)}"
    p = cache.path("sia", key, "json")
    cached = cache.read_json(p, max_age_s=config.SIA_CACHE_TTL_S)
    if cached is not None:
        return cached
    with cache.lock_for(f"sia/{key}"):
        cached = cache.read_json(p, max_age_s=config.SIA_CACHE_TTL_S)
        if cached is not None:
            return cached
        rows: list[dict] = []
        for c in colls:
            try:
                rows += _query_collection(ra, dec, c)
            except (requests.Timeout, requests.ConnectionError) as e:
                raise upstream_timeout("IRSA (SIA)") from e
            except Exception as e:  # noqa: BLE001  colección inexistente, etc.
                log.warning("SIA falló para %s: %s", c, e)
        frames = dedupe(rows, colls)
        for f in frames:
            f["date_utc"] = _isot_z(f["mjd"])
        cache.write_json(p, frames)
        return frames


def get_frame(q: Query, frame_id: str) -> dict:
    for f in find_frames(q.ra_deg, q.dec_deg):
        if f["id"] == frame_id:
            return f
    raise no_coverage(f"El frame '{frame_id}' no cubre estas coordenadas.")
