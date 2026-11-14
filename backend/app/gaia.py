"""Overlay de Gaia DR3 con posiciones propagadas a cada época (regla 2)."""
from __future__ import annotations

import logging
import math

import astropy.units as u
import numpy as np
from astropy.coordinates import Distance, SkyCoord
from astropy.time import Time

from . import cache, config
from .grid import Query

log = logging.getLogger(__name__)

GAIA_EPOCH = Time(2016.0, format="jyear")


def _query(q: Query) -> list[dict]:
    p = cache.path("gaia", f"{q.key}_{config.GAIA_MAG_LIMIT:g}", "json")
    hit = cache.read_json(p)
    if hit is not None:
        return hit
    from astroquery.gaia import Gaia

    # radio que cubre el cuadrado del FOV + margen por movimiento propio (Barnard: ~1.5' desde 2016)
    radius = q.fov_arcmin / 60.0 * math.sqrt(2) / 2.0 + 2.0 / 60.0
    adql = f"""
        SELECT TOP {config.GAIA_ROW_LIMIT} source_id, ra, dec, phot_g_mean_mag, pmra, pmdec, parallax
        FROM {config.GAIA_TABLE}
        WHERE 1 = CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', {q.ra_deg}, {q.dec_deg}, {radius}))
          AND phot_g_mean_mag < {config.GAIA_MAG_LIMIT}
        ORDER BY phot_g_mean_mag
    """
    tab = Gaia.launch_job(adql).get_results()

    def val(r, c):
        v = r[c]
        return None if np.ma.is_masked(v) or not np.isfinite(float(v)) else float(v)

    rows = [{
        "source_id": str(int(r["source_id"])),  # string: int64 pierde precisión en JS
        "ra_deg": round(float(r["ra"]), 7),
        "dec_deg": round(float(r["dec"]), 7),
        "g_mag": None if val(r, "phot_g_mean_mag") is None else round(val(r, "phot_g_mean_mag"), 3),
        "pmra_mas_yr": val(r, "pmra"),
        "pmdec_mas_yr": val(r, "pmdec"),
        "parallax_mas": val(r, "parallax"),
    } for r in tab]
    cache.write_json(p, rows)
    return rows


def propagate(ra, dec, pmra, pmdec, parallax, ref: Time, targets: list[Time]) -> list[tuple[np.ndarray, np.ndarray]]:
    """Propaga (vectorizado) con SkyCoord.apply_space_motion. pm/paralaje faltantes -> 0 / muy lejos.

    Acepta escalares o arrays; devuelve una tupla (ra, dec) en grados por cada tiempo de `targets`.
    """
    def arr(x, fill):
        a = np.array([fill if v is None else v for v in np.atleast_1d(x)], dtype=float)
        return np.where(np.isfinite(a), a, fill)

    plx = arr(parallax, 1e-3)
    plx = np.where(plx > 0, plx, 1e-3)
    c = SkyCoord(
        ra=arr(ra, 0) * u.deg, dec=arr(dec, 0) * u.deg,
        pm_ra_cosdec=arr(pmra, 0) * u.mas / u.yr, pm_dec=arr(pmdec, 0) * u.mas / u.yr,
        distance=Distance(parallax=plx * u.mas),
        obstime=ref, frame="icrs",
    )
    out = []
    for t in targets:
        n = c.apply_space_motion(new_obstime=t)
        out.append((np.round(n.ra.deg, 7), np.round(n.dec.deg, 7)))
    return out


def overlay(q: Query, epochs: list[dict]) -> dict:
    try:
        sources = _query(q)
    except Exception as e:  # noqa: BLE001  Gaia caída no debe romper /api/sky
        log.warning("Consulta Gaia falló: %s", e)
        sources = []
    times = [Time(e["mjd_mid"], format="mjd") for e in epochs]
    pos = []
    if sources and times:
        pos = propagate([s["ra_deg"] for s in sources], [s["dec_deg"] for s in sources],
                        [s["pmra_mas_yr"] for s in sources], [s["pmdec_mas_yr"] for s in sources],
                        [s["parallax_mas"] for s in sources], GAIA_EPOCH, times)
    out = []
    for i, s in enumerate(sources):
        s = dict(s)
        s["pos_by_epoch"] = {e["id"]: {"ra_deg": float(p[0][i]), "dec_deg": float(p[1][i])}
                             for e, p in zip(epochs, pos)}
        for k in ("pmra_mas_yr", "pmdec_mas_yr", "parallax_mas"):
            if s[k] is not None:
                s[k] = round(s[k], 3)
        out.append(s)
    return {
        "catalog": "gaiadr3",
        "ref_epoch": "J2016.0",
        "mag_limit_g": config.GAIA_MAG_LIMIT,
        "sources": out,
    }
