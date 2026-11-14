"""Fotometría por frame en la posición del objetivo -> espectro y curva de luz.

Se mide sobre el cutout NATIVO (sin reproyectar, para no interpolar):
  flux = media en una apertura circular de `aperture_px` − mediana de un anillo de fondo.
Unidades: brillo superficial medio (MJy/sr), igual que las imágenes.
"""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor

import numpy as np

from . import cache, config, spherex
from .errors import ApiError
from .grid import Query

log = logging.getLogger(__name__)
_pool = ThreadPoolExecutor(max_workers=config.DOWNLOAD_WORKERS, thread_name_prefix="phot")


def measure(c: spherex.Cutout, ra: float, dec: float, aperture_px: float) -> dict | None:
    x, y = c.world_to_pixel(ra, dec)
    ny, nx = c.image.shape
    if not (0 <= x < nx and 0 <= y < ny):
        return None
    yy, xx = np.mgrid[0:ny, 0:nx]
    r = np.hypot(xx - x, yy - y)
    ap = r <= aperture_px
    ann = (r >= aperture_px + 3) & (r <= aperture_px + 6)
    bad = c.bad_pixels()
    good = np.isfinite(c.image)
    if bad is not None:
        good &= ~bad
    ap_good = ap & good
    if not ap_good.any():
        return None
    bkg_vals = c.image[ann & good]
    bkg = float(np.median(bkg_vals)) if bkg_vals.size >= 5 else 0.0
    flux = float(np.mean(c.image[ap_good])) - bkg
    err = None
    if c.variance is not None:
        v = c.variance[ap_good]
        v = v[np.isfinite(v)]
        if v.size:
            err = float(np.sqrt(v.sum()) / ap_good.sum())
    return {
        "wavelength_um": c.wavelength_um(x, y),
        "flux": round(flux, 6),
        "flux_err": None if err is None else round(err, 6),
        "flagged": bool(bad is not None and (bad & ap).any()),
    }


def _one(frame: dict, q: Query, aperture_px: float) -> dict | None:
    key = f"{frame['id']}_{aperture_px:g}__{q.key}"
    p = cache.path("phot", key, "json")
    hit = cache.read_json(p)
    if hit is not None:
        return hit or None
    try:
        m = measure(spherex.load_cutout(frame, q), q.ra_deg, q.dec_deg, aperture_px)
    except ApiError as e:
        # no se cachea: si fue IRSA ocupado, el próximo pedido lo completa
        log.warning("Fotometría de %s falló: %s", frame["id"], e.message)
        return None
    except Exception as e:  # noqa: BLE001
        log.warning("Fotometría de %s falló: %s", frame["id"], e)
        return None
    cache.write_json(p, m or {})
    if m is None:
        return None
    return m


def photometry(frames: list[dict], q: Query, aperture_px: float) -> list[dict]:
    results = list(_pool.map(lambda f: _one(f, q, aperture_px), frames))
    points = []
    for f, m in zip(frames, results):
        if m is None:
            continue
        points.append({
            "frame_id": f["id"], "epoch_id": f.get("epoch_id"), "detector": f["detector"],
            "mjd": f["mjd"], **m,
        })
    return points
