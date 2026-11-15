"""Overlay de Gaia DR3 con posiciones propagadas a cada época (regla 2)."""
from __future__ import annotations

import logging
import math
import threading
import time
from concurrent.futures import Future, ThreadPoolExecutor, TimeoutError as FutureTimeout

import astropy.units as u
import numpy as np
from astropy.coordinates import Distance, SkyCoord
from astropy.time import Time

from . import cache, config
from .errors import gaia_unavailable
from .grid import Query

log = logging.getLogger(__name__)

# ERFA avisa "distance overridden" (estrellas sin paralaje: se usa una distancia enorme a propósito)
# y "dubious year" (fechas futuras, sin tabla de segundos intercalares): ninguno es un error y
# llenaban el log del servidor.
import warnings  # noqa: E402

from erfa import ErfaWarning  # noqa: E402

warnings.filterwarnings("ignore", category=ErfaWarning)

GAIA_EPOCH = Time(2016.0, format="jyear")


def _cache_path(q: Query):
    return cache.path("gaia2", f"{q.key}_{config.GAIA_MAG_LIMIT:g}", "json")


def _query(q: Query) -> list[dict]:
    """Caché o consulta a Gaia (bloqueante: si Gaia está caído puede tardar ~50 s en fallar)."""
    p = _cache_path(q)
    hit = cache.read_json(p)
    if hit is not None:
        return hit
    if config.GAIA_SIMULATE == "slow":
        time.sleep(config.GAIA_TIMEOUT_S + 5)
    if config.GAIA_SIMULATE != "0":
        raise ConnectionError("Gaia caído (simulado con SPHEREX_GAIA_DOWN)")
    from astroquery.gaia import Gaia

    # radio que cubre la vista del frontend (alto = FOV, ancho hasta VIEW_ASPECT x FOV: los costados
    # muestran el cielo alrededor del recorte) + margen por movimiento propio (Barnard: ~1.5' desde 2016)
    half_diag = math.hypot(config.VIEW_ASPECT / 2.0, 0.5)
    radius = q.fov_arcmin / 60.0 * half_diag + 2.0 / 60.0
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


# --------------------------------------------------------------------------- consulta con tope de tiempo
# La consulta corre en un hilo aparte: si Gaia tarda más de GAIA_TIMEOUT_S, /api/gaia responde
# GAIA_UNAVAILABLE pero el hilo sigue; si al final Gaia contesta, queda en caché para el próximo pedido.
_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="gaia")
_lock = threading.Lock()
_inflight: dict[str, Future] = {}  # una sola consulta por zona aunque lleguen varios pedidos
_down_until = 0.0                  # tras un fallo, no se vuelve a esperar a Gaia hasta este momento


def _run(key: str, q: Query) -> list[dict]:
    global _down_until
    try:
        return _query(q)
    except Exception as e:  # noqa: BLE001
        log.warning("Consulta Gaia falló: %s", e)
        _down_until = time.monotonic() + config.GAIA_RETRY_AFTER_S
        raise
    finally:
        with _lock:
            _inflight.pop(key, None)


def sources(q: Query) -> list[dict]:
    """Estrellas de Gaia del campo, o ApiError GAIA_UNAVAILABLE (caído o lento)."""
    hit = cache.read_json(_cache_path(q))
    if hit is not None:
        return hit
    if time.monotonic() < _down_until:
        raise gaia_unavailable("Gaia (ESA) no está respondiendo. Probá de nuevo en un minuto.")
    with _lock:
        fut = _inflight.get(q.key)
        if fut is None:
            fut = _inflight[q.key] = _pool.submit(_run, q.key, q)
    try:
        return fut.result(timeout=config.GAIA_TIMEOUT_S)
    except FutureTimeout:
        raise gaia_unavailable(f"Gaia (ESA) no respondió en {config.GAIA_TIMEOUT_S:g} s.") from None
    except Exception as e:  # noqa: BLE001
        raise gaia_unavailable(f"Gaia (ESA) no responde: {type(e).__name__}.") from None


def cached_overlay(q: Query, epochs: list[dict]) -> dict | None:
    """El overlay si las estrellas ya están en caché (sin tocar la red); si no, None."""
    hit = cache.read_json(_cache_path(q))
    return None if hit is None else build_overlay(hit, epochs)


def pending_overlay() -> dict:
    """Lo que va en /api/sky cuando Gaia todavía no se consultó: el frontend lo pide a /api/gaia."""
    return {"catalog": "gaiadr3", "ref_epoch": "J2016.0", "mag_limit_g": config.GAIA_MAG_LIMIT,
            "status": "pending", "sources": []}


def overlay(q: Query, epochs: list[dict]) -> dict:
    """Overlay completo (consulta Gaia si hace falta). Lanza GAIA_UNAVAILABLE si Gaia no responde."""
    return build_overlay(sources(q), epochs)


def build_overlay(sources: list[dict], epochs: list[dict]) -> dict:
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
        "status": "ok",
        "sources": out,
    }
