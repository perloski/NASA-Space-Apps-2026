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


# ----------------------------------------------------------------------------- épocas

def _month_label(mjd: float) -> str:
    return Time(mjd, format="mjd").datetime.strftime("%b %Y")


def group_epochs(frames: list[dict]) -> tuple[str, list[dict]]:
    """Asigna epoch_id a cada frame (in place) y devuelve (estrategia, épocas)."""
    if not frames:
        return "gap", []
    frames.sort(key=lambda f: f["mjd"])
    groups: list[list[dict]] = [[frames[0]]]
    for f in frames[1:]:
        if f["mjd"] - groups[-1][-1]["mjd"] > config.EPOCH_GAP_DAYS:
            groups.append([f])
        else:
            groups[-1].append(f)
    strategy = "gap"
    if any(g[-1]["mjd"] - g[0]["mjd"] > config.EPOCH_MAX_SPAN_DAYS for g in groups):
        # cobertura continua (cerca de los polos eclípticos): cortar en bins fijos de 30 días
        strategy = "bins_30d"
        t0 = frames[0]["mjd"]
        bins: dict[int, list[dict]] = {}
        for f in frames:
            bins.setdefault(int((f["mjd"] - t0) // config.EPOCH_BIN_DAYS), []).append(f)
        groups = [bins[k] for k in sorted(bins)]

    epochs, seen_labels = [], {}
    for i, g in enumerate(groups, start=1):
        eid = f"E{i}"
        start, end = g[0]["mjd"], g[-1]["mjd"]
        mid = (start + end) / 2.0
        label = _month_label(mid)
        n = seen_labels.get(label, 0)
        seen_labels[label] = n + 1
        if n:
            label = f"{label} ({n + 1})"
        for f in g:
            f["epoch_id"] = eid
        epochs.append({
            "id": eid, "label": label,
            "mjd_start": round(start, 6), "mjd_end": round(end, 6), "mjd_mid": round(mid, 6),
            "frames": g,
        })
    return strategy, epochs


# ----------------------------------------------------------------------------- cutouts

def _cutout_url(access_url: str, q: Query) -> str:
    size_deg = q.fov_arcmin * config.CUTOUT_MARGIN / 60.0
    sep = "&" if "?" in access_url else "?"
    return f"{access_url}{sep}center={q.ra_deg:.6f},{q.dec_deg:.6f}deg&size={size_deg:.5f}deg"


# Extensiones que guardamos en caché. EPSF (~3.8 MB por cutout) no se usa y se descarta.
_KEEP_EXT = ("IMAGE", "FLAGS", "VARIANCE", "ZODI", "WCS-WAVE")
_RETRY_STATUS = {429, 500, 502, 503, 504}


def _http_get_fits(url: str, what: str) -> bytes:
    """GET con reintentos y backoff: IRSA responde 503 'Server busy' de forma intermitente."""
    last = None
    for attempt in range(config.HTTP_RETRIES):
        try:
            r = requests.get(url, timeout=config.HTTP_TIMEOUT_S)
        except (requests.Timeout, requests.ConnectionError) as e:
            last = e
        else:
            if r.status_code == 200 and r.content.startswith(b"SIMPLE"):
                return r.content
            if r.status_code not in _RETRY_STATUS:
                raise ApiError("INTERNAL", f"IRSA devolvió {r.status_code} para {what}: {r.text[:120]}")
            last = f"HTTP {r.status_code}"
        time.sleep(min(8.0, 0.5 * 2 ** attempt) + random.random() * 0.5)
    log.warning("IRSA sin respuesta para %s tras %d intentos (%s)", what, config.HTTP_RETRIES, last)
    raise upstream_timeout("IRSA (cutout)")


def _strip_extensions(raw: bytes) -> bytes:
    import io

    with fits.open(io.BytesIO(raw), memmap=False) as hdul:
        keep = [hdul[0]] + [h for h in hdul[1:] if h.name in _KEEP_EXT]
        buf = io.BytesIO()
        fits.HDUList(keep).writeto(buf)
        return buf.getvalue()


def download_cutout(frame: dict, q: Query) -> bytes:
    def build() -> bytes:
        raw = _http_get_fits(_cutout_url(frame["access_url"], q), f"el cutout de {frame['id']}")
        return _strip_extensions(raw)

    return cache.cached_bytes("cutouts", f"{frame['id']}__{q.key}", "fits", build)


@dataclass
class Cutout:
    """Un cutout de SPHEREx ya parseado. image = IMAGE − ZODI (regla 4), en MJy/sr."""
    frame: dict
    image: np.ndarray
    flags: np.ndarray | None
    variance: np.ndarray | None
    header: fits.Header
    hdul: fits.HDUList
    flags_header: fits.Header | None = None

    @cached_property
    def wcs(self) -> WCS:
        return WCS(self.header)

    @cached_property
    def bad_mask_bits(self) -> int:
        """Bits "malos" según MSKNnnnn (nombre del plano n) del header de FLAGS."""
        bits = 0
        found = False
        for k, v in (self.flags_header or {}).items():
            m = re.fullmatch(r"MSKN(\d{4})", k)
            if m:
                found = True
                if str(v).strip() in config.BAD_FLAG_NAMES:
                    bits |= 1 << int(m.group(1))
        if not found:
            for b in config.BAD_FLAG_BITS_DEFAULT:
                bits |= 1 << b
        return bits

    def bad_pixels(self) -> np.ndarray | None:
        if self.flags is None:
            return None
        return (self.flags.astype(np.int64) & self.bad_mask_bits) != 0

    def world_to_pixel(self, ra: float, dec: float) -> tuple[float, float]:
        x, y = self.wcs.all_world2pix([[ra, dec]], 0)[0]
        return float(x), float(y)

    def wavelength_um(self, x: float, y: float) -> float | None:
        """Longitud de onda en el píxel (x, y) usando el WCS espectral alternativo 'W' (WCS-WAVE)."""
        try:
            ww = WCS(self.header, fobj=self.hdul, key="W")
            vals = ww.pixel_to_world_values(x, y)
            lam = float(np.atleast_1d(vals[0] if isinstance(vals, (tuple, list)) else vals)[0])
            if np.isfinite(lam) and lam > 0:
                return round(lam, 4)
        except Exception as e:  # noqa: BLE001
            log.debug("WCS espectral no disponible para %s: %s", self.frame["id"], e)
        return None  # sin WCS espectral no inventamos un valor (el detector cubre un rango amplio)


def _ext(hdul: fits.HDUList, name: str, fallback_index: int):
    try:
        return hdul[name]
    except KeyError:
        return hdul[fallback_index] if len(hdul) > fallback_index else None


def load_cutout(frame: dict, q: Query) -> Cutout:
    import io

    raw = download_cutout(frame, q)
    hdul = fits.open(io.BytesIO(raw), memmap=False)
    img_hdu = _ext(hdul, "IMAGE", 1)
    if img_hdu is None or img_hdu.data is None:
        raise ApiError("INTERNAL", f"Cutout sin extensión IMAGE: {frame['id']}")
    image = np.asarray(img_hdu.data, dtype=np.float64)
    zodi = _ext(hdul, "ZODI", 4)
    if zodi is not None and zodi.data is not None and zodi.data.shape == image.shape:
        image = image - np.asarray(zodi.data, dtype=np.float64)
    flags_hdu = _ext(hdul, "FLAGS", 2)
    var_hdu = _ext(hdul, "VARIANCE", 3)
    flags = np.asarray(flags_hdu.data) if flags_hdu is not None and flags_hdu.data is not None else None
    var = np.asarray(var_hdu.data, dtype=np.float64) if var_hdu is not None and var_hdu.data is not None else None
    return Cutout(frame=frame, image=image, flags=flags, variance=var, header=img_hdu.header, hdul=hdul,
                  flags_header=flags_hdu.header if flags_hdu is not None else None)


def frames_by_id(frames: list[dict]) -> dict[str, dict]:
    return {f["id"]: f for f in frames}


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def public_frame_fields(f: dict) -> dict[str, Any]:
    return {k: f[k] for k in ("id", "obs_id", "collection", "epoch_id", "detector", "mjd", "date_utc", "exptime_s")}
