"""Reproyección a la grilla común, stacks, diferencias, stretch y PNG/FITS."""
from __future__ import annotations

import io
import logging
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from astropy.io import fits
from astropy.visualization import ZScaleInterval
from PIL import Image

from . import cache, config, spherex
from .errors import ApiError, bad_params, upstream_timeout
from .grid import Query, grid_header, grid_size_px, grid_wcs

log = logging.getLogger(__name__)

STRETCHES = ("asinh", "linear", "zscale")
_pool = ThreadPoolExecutor(max_workers=config.DOWNLOAD_WORKERS, thread_name_prefix="cutout")


# ----------------------------------------------------------------------------- reproyección

def _reproject(frame: dict, q: Query) -> dict:
    """Reproyecta un frame a la grilla. Devuelve arrays + métricas de calidad (cacheadas en .npz)."""
    p = cache.path("reproj", f"{frame['id']}__{q.key}", "npz")
    if p.exists():
        z = np.load(p)
        return {k: z[k] for k in z.files}
    with cache.lock_for(f"reproj/{p.name}"):
        if p.exists():
            z = np.load(p)
            return {k: z[k] for k in z.files}
        from reproject import reproject_interp

        c = spherex.load_cutout(frame, q)
        out_wcs = grid_wcs(q)
        n = grid_size_px(q.fov_arcmin)
        bad = c.bad_pixels()
        img = c.image if bad is None else np.where(bad, np.nan, c.image)  # rayos cósmicos, hot pixels...
        data, footprint = reproject_interp((img, c.wcs), out_wcs, shape_out=(n, n), order="bilinear")
        data = np.where(footprint > 0, data, np.nan).astype(np.float32)

        flagged_fraction = np.nan
        target_flagged = -1  # -1 = desconocido
        if bad is not None:
            bad_r, fp_b = reproject_interp((bad.astype(np.float32), c.wcs), out_wcs, shape_out=(n, n),
                                           order="nearest-neighbor")
            valid = fp_b > 0
            if valid.any():
                flagged_fraction = float(np.mean(bad_r[valid] > 0.5))
            x, y = c.world_to_pixel(q.ra_deg, q.dec_deg)
            ix, iy = int(round(x)), int(round(y))
            if 0 <= iy < bad.shape[0] and 0 <= ix < bad.shape[1]:
                target_flagged = int(bool(bad[iy, ix]))
        x, y = c.world_to_pixel(q.ra_deg, q.dec_deg)
        wl = c.wavelength_um(x, y)
        res = {
            "data": data,
            "coverage": np.float32((footprint > 0).mean()),  # cobertura del detector, no de píxeles buenos
            "flagged_fraction": np.float32(flagged_fraction),
            "target_flagged": np.int8(target_flagged),
            "wavelength_um": np.float32(np.nan if wl is None else wl),
        }
        buf = io.BytesIO()
        np.savez_compressed(buf, **res)
        cache.atomic_write_bytes(p, buf.getvalue())
        return res


def reprojected(frame: dict, q: Query) -> np.ndarray:
    return _reproject(frame, q)["data"]


def quality_if_cached(frame: dict, q: Query) -> tuple[dict, float | None]:
    """Calidad y λ si el frame ya fue procesado; si no, nulls (regla: /api/sky no procesa imágenes)."""
    p = cache.path("reproj", f"{frame['id']}__{q.key}", "npz")
    if not p.exists():
        return {"coverage": None, "flagged_fraction": None, "target_flagged": None}, None
    z = np.load(p)
    ff = float(z["flagged_fraction"])
    tf = int(z["target_flagged"])
    wl = float(z["wavelength_um"])
    return {
        "coverage": round(float(z["coverage"]), 3),
        "flagged_fraction": None if np.isnan(ff) else round(ff, 4),
        "target_flagged": None if tf < 0 else bool(tf),
    }, (None if np.isnan(wl) else round(wl, 4))


def reproject_many(frames: list[dict], q: Query) -> tuple[list[np.ndarray], bool]:
    """Procesa en paralelo. Los frames que fallen se saltean en vez de tirar todo el stack.

    Devuelve (arrays, completo). completo=False si algún frame falló por IRSA (vale reintentar,
    así que el resultado no se debe cachear). Si fallan todos por IRSA -> UPSTREAM_TIMEOUT.
    """
    def one(f):
        try:
            return reprojected(f, q), False
        except ApiError as e:
            log.warning("Frame %s salteado: %s", f["id"], e.message)
            return None, e.code == "UPSTREAM_TIMEOUT"
        except Exception as e:  # noqa: BLE001  archivo corrupto, WCS raro, etc.: no tiene sentido reintentar
            log.warning("Frame %s descartado: %s", f["id"], e)
            return None, False

    res = list(_pool.map(one, frames))
    arrays = [a for a, _ in res if a is not None]
    transient = sum(t for _, t in res)
    if transient and not arrays:
        raise upstream_timeout("IRSA (cutout)")
    return arrays, transient == 0
