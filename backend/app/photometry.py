"""Fotometría por frame en la posición del objetivo -> espectro y curva de luz.

Se mide sobre el cutout NATIVO (sin reproyectar, para no interpolar):
  flux = media en una apertura circular de `aperture_px` − mediana de un anillo de fondo.
Unidades: brillo superficial medio (MJy/sr), igual que las imágenes.

Estrellas saturadas (p. ej. R Draconis): el centro tiene todos los píxeles marcados (OVERFLOW,
BLOOM) y no se puede medir. En ese caso se mide un anillo FIJO en las "alas" de la estrella
(WING_IN–WING_OUT px), igual para todos los frames, y el punto sale con saturated=True y flagged=True:
sirve para ver cómo cambia el brillo (curva de luz) pero no es el brillo total.

Para medir alcanza con un recorte chico alrededor del objeto (PHOT_FOV_ARCMIN), no el campo
entero: S3 baja filas completas del detector, así que menos filas = mucho menos tráfico. Si el
cutout del campo ya está en caché (por las imágenes), se usa ese.
"""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor

import numpy as np

from . import cache, config, spherex
from .errors import ApiError
from .grid import Query

log = logging.getLogger(__name__)
_pool = ThreadPoolExecutor(max_workers=max(config.DOWNLOAD_WORKERS, 16), thread_name_prefix="phot")

WING_IN, WING_OUT = 9.0, 12.0          # anillo de las alas (px) para estrellas saturadas
WING_BKG_IN, WING_BKG_OUT = 16.0, 22.0  # fondo para ese anillo
MIN_WING_PX = 10
PHOT_FOV_ARCMIN = 3.5                   # cubre el fondo de las alas (22 px ≈ 2.3′) con margen
CACHE_KIND = "phot2"                    # v2: medición en las alas (descarta los vacíos guardados antes)


def _mean_minus_bkg(c: spherex.Cutout, sel: np.ndarray, bkg_sel: np.ndarray) -> tuple[float, float | None]:
    bkg_vals = c.image[bkg_sel]
    bkg = float(np.median(bkg_vals)) if bkg_vals.size >= 5 else 0.0
    flux = float(np.mean(c.image[sel])) - bkg
    err = None
    if c.variance is not None:
        v = c.variance[sel]
        v = v[np.isfinite(v)]
        if v.size:
            err = float(np.sqrt(v.sum()) / sel.sum())
    return flux, err


def measure(c: spherex.Cutout, ra: float, dec: float, aperture_px: float) -> dict | None:
    x, y = c.world_to_pixel(ra, dec)
    ny, nx = c.image.shape
    if not (0 <= x < nx and 0 <= y < ny):
        return None
    yy, xx = np.mgrid[0:ny, 0:nx]
    r = np.hypot(xx - x, yy - y)
    bad = c.bad_pixels()
    good = np.isfinite(c.image)
    if bad is not None:
        good &= ~bad
    ap = r <= aperture_px
    ap_good = ap & good
    saturated = not ap_good.any()

    if not saturated:
        ann = (r >= aperture_px + 3) & (r <= aperture_px + 6) & good
        flux, err = _mean_minus_bkg(c, ap_good, ann)
        flagged = bool(bad is not None and (bad & ap).any())
    else:
        wing = (r >= WING_IN) & (r < WING_OUT) & good
        if wing.sum() < MIN_WING_PX:
            return None
        wing_bkg = (r >= WING_BKG_IN) & (r < WING_BKG_OUT) & good
        flux, err = _mean_minus_bkg(c, wing, wing_bkg)
        flagged = True

    out = {
        "wavelength_um": c.wavelength_um(x, y),
        "flux": round(flux, 6),
        "flux_err": None if err is None else round(err, 6),
        "flagged": flagged,
    }
    if saturated:
        out["saturated"] = True
    return out


def _cutout_for(frame: dict, q: Query) -> spherex.Cutout:
    """El cutout del campo si ya está en caché; si no, uno chico alrededor del objeto."""
    if cache.path("cutouts", f"{frame['id']}__{q.key}", "fits").exists():
        return spherex.load_cutout(frame, q)
    small = Query.make(q.ra_deg, q.dec_deg, min(PHOT_FOV_ARCMIN, q.fov_arcmin))
    return spherex.load_cutout(frame, small)


def _one(frame: dict, q: Query, aperture_px: float) -> dict | None:
    key = f"{frame['id']}_{aperture_px:g}__{q.ra_deg:.6f}_{q.dec_deg:+.6f}"
    p = cache.path(CACHE_KIND, key, "json")
    hit = cache.read_json(p)
    if hit is not None:
        return hit or None
    try:
        m = measure(_cutout_for(frame, q), q.ra_deg, q.dec_deg, aperture_px)
    except ApiError as e:
        # no se cachea: si fue IRSA/S3 ocupado, el próximo pedido lo completa
        log.warning("Fotometría de %s falló: %s", frame["id"], e.message)
        return None
    except Exception as e:  # noqa: BLE001
        log.warning("Fotometría de %s falló: %s", frame["id"], e)
        return None
    cache.write_json(p, m or {})
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
