"""Modo mock (SPHEREX_MOCK=1): sirve docs/*.json y genera imágenes sintéticas.

Sirve para que el frontend trabaje sin internet ni IRSA. Las imágenes tienen estrellas fijas
y un objeto que se mueve entre épocas (para probar blink / diff / stacks).
"""
from __future__ import annotations

import json
import zlib
from functools import lru_cache

import numpy as np

from . import config
from .errors import ApiError, bad_params
from .grid import Query, grid_json, grid_size_px

MOCK_QS = "ra=133.786245&dec=-7.24441&fov_arcmin=10"


@lru_cache
def _load(name: str) -> dict:
    return json.loads((config.MOCK_DIR / name).read_text(encoding="utf-8"))


def _retarget(obj: dict, q: Query) -> dict:
    """Reescribe query/grid/URLs del mock para las coordenadas pedidas."""
    s = json.dumps(obj).replace(MOCK_QS, q.qs())
    out = json.loads(s)
    out["query"].update({"ra_deg": q.ra_deg, "dec_deg": q.dec_deg, "fov_arcmin": q.fov_arcmin})
    return out


def sky(q: Query, target_name: str | None, coord_epoch: str | None) -> dict:
    out = _retarget(_load("sky_wise0855.json"), q)
    out["query"]["target_name"] = target_name
    out["query"]["coord_epoch"] = coord_epoch
    out["grid"] = grid_json(q)
    # igual que el backend real sin caché: Gaia llega aparte, por /api/gaia
    out["overlays"]["gaia"] = {k: v for k, v in out["overlays"]["gaia"].items() if k != "sources"} | {
        "status": "pending", "sources": [], "url": f"/api/gaia?{q.qs()}"}
    return out


def gaia(q: Query) -> dict:
    """/api/gaia en modo mock (respeta SPHEREX_GAIA_DOWN para probar el visor con Gaia caído)."""
    import time

    from .errors import gaia_unavailable
    if config.GAIA_SIMULATE == "slow":
        time.sleep(config.GAIA_TIMEOUT_S)
    if config.GAIA_SIMULATE != "0":
        raise gaia_unavailable("Gaia (ESA) no responde (simulado con SPHEREX_GAIA_DOWN).")
    return _retarget(_load("sky_wise0855.json"), q)["overlays"]["gaia"] | {"status": "ok"}


def photometry(q: Query, aperture_px: float) -> dict:
    out = _retarget(_load("photometry_wise0855.json"), q)
    out["query"]["aperture_px"] = aperture_px
    return out


def _frames() -> dict[str, dict]:
    return {f["id"]: f for f in _load("sky_wise0855.json")["frames"]}


def _epoch_index(epoch_id: str) -> int:
    ids = [e["id"] for e in _load("sky_wise0855.json")["epochs"]]
    if epoch_id not in ids:
        raise bad_params(f"Época '{epoch_id}' inexistente.")
    return ids.index(epoch_id)


def _synthetic(q: Query, epoch_idx: int, detector: str, seed_extra: int) -> np.ndarray:
    n = grid_size_px(q.fov_arcmin)
    rng_field = np.random.default_rng(zlib.crc32(q.key.encode()))
    rng_noise = np.random.default_rng(seed_extra)
    yy, xx = np.mgrid[0:n, 0:n]
    img = rng_noise.normal(0, 0.01, (n, n))
    for _ in range(max(10, n // 3)):
        x0, y0 = rng_field.uniform(0, n, 2)
        amp = rng_field.lognormal(-2.0, 1.0)
        img += amp * np.exp(-((xx - x0) ** 2 + (yy - y0) ** 2) / (2 * 1.2 ** 2))
    # objeto en movimiento: se corre ~3 px por época; más brillante en D5/D6 (como una enana marrón fría)
    boost = {"D5": 3.0, "D6": 2.0}.get(detector, 0.6)
    cx, cy = n / 2 - 3 * epoch_idx, n / 2 + 0.5 * epoch_idx
    img += 0.3 * boost * np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * 1.2 ** 2))
    return img.astype(np.float32)


def frame_array(q: Query, frame_id: str) -> tuple[np.ndarray, str]:
    f = _frames().get(frame_id)
    if f is None:
        raise ApiError("NO_COVERAGE", f"El frame '{frame_id}' no existe en el mock.")
    seed = zlib.crc32(frame_id.encode())
    return _synthetic(q, _epoch_index(f["epoch_id"]), f["detector"], seed), f["detector"]


def stack_array(q: Query, epoch_id: str, detector: str) -> np.ndarray:
    idx = _epoch_index(epoch_id)
    return _synthetic(q, idx, detector if detector != "ALL" else "D4", 1000 + idx)
