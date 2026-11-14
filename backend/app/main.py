"""API del visor SPHEREx (contrato v1.1, ver docs/CONTRATO_API.md).

Correr:  uvicorn app.main:app --reload   (desde backend/)
Mock:    SPHEREX_MOCK=1 uvicorn app.main:app --reload
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, Query as Q, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from . import cache, config, gaia, imaging, mock, photometry, spherex, targets
from .errors import ApiError, bad_params, no_coverage
from .grid import Query, grid_json

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("spherex-api")

app = FastAPI(title="SPHEREx Sky Viewer API", version=config.SCHEMA_VERSION)
app.add_middleware(  # regla 7: sin CORS, Aladin (WebGL) falla en silencio
    CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["GET"], allow_headers=["*"],
)

IMG_HEADERS = {"Cache-Control": "public, max-age=86400"}


# ----------------------------------------------------------------------------- errores

@app.exception_handler(ApiError)
async def _api_error(_: Request, e: ApiError):
    return JSONResponse(e.body(), status_code=e.status)


@app.exception_handler(RequestValidationError)
async def _validation_error(_: Request, e: RequestValidationError):
    msg = "; ".join(f"{'.'.join(str(x) for x in err['loc'][1:])}: {err['msg']}" for err in e.errors())
    return JSONResponse(bad_params(msg or "Parámetros inválidos.").body(), status_code=400)


@app.exception_handler(Exception)
async def _internal(_: Request, e: Exception):
    log.exception("Error interno")
    return JSONResponse(ApiError("INTERNAL", f"Error interno: {type(e).__name__}").body(), status_code=500)


# ----------------------------------------------------------------------------- helpers

def _resolve(ra: float | None, dec: float | None, fov: float | None, target: str | None):
    """-> (Query, target_name, coord_epoch)."""
    if target:
        t = targets.get(target)
        if t is None:
            raise bad_params(f"Objetivo desconocido '{target}'. Ver /api/targets.")
        ra, dec = targets.position(t)
        return Query.make(ra, dec, fov), t["name"], config.TARGET_EPOCH
    return Query.make(ra, dec, fov), None, None


def _parse_detectors(s: str | None) -> list[str] | None:
    if not s:
        return None
    dets = [d.strip().upper() for d in s.split(",") if d.strip()]
    bad = [d for d in dets if d not in spherex.DETECTORS]
    if bad:
        raise bad_params(f"Detectores inválidos: {', '.join(bad)} (usar D1..D6).")
    return dets


def _check_stretch(stretch: str) -> str:
    if stretch not in imaging.STRETCHES:
        raise bad_params(f"'stretch' debe ser uno de {', '.join(imaging.STRETCHES)}.")
    return stretch


def _check_detector(det: str, allow_all: bool = True) -> str:
    det = det.upper()
    if det in spherex.DETECTORS or (allow_all and det == "ALL"):
        return det
    raise bad_params("'detector' debe ser D1..D6" + (" o ALL." if allow_all else "."))


def _frames_and_epochs(q: Query, detectors: list[str] | None = None):
    frames = [dict(f) for f in spherex.find_frames(q.ra_deg, q.dec_deg)]
    if detectors:
        frames = [f for f in frames if f["detector"] in detectors]
    if not frames:
        raise no_coverage()
    strategy, epochs = spherex.group_epochs(frames)
    return frames, strategy, epochs


def _png(data: bytes) -> Response:
    return Response(data, media_type="image/png", headers=IMG_HEADERS)


# ----------------------------------------------------------------------------- endpoints

@app.get("/api/health")
def health():
    return {"ok": True, "mock": config.MOCK, "schema_version": config.SCHEMA_VERSION}


@app.get("/api/targets")
def get_targets():
    return targets.listing()


@app.get("/api/sky")
def get_sky(
    ra: float | None = None, dec: float | None = None, fov_arcmin: float | None = None,
    target: str | None = None, detectors: str | None = None,
):
    q, target_name, coord_epoch = _resolve(ra, dec, fov_arcmin, target)
    dets = _parse_detectors(detectors)
    if config.MOCK:
        return mock.sky(q, target_name, coord_epoch)

    frames, strategy, epochs = _frames_and_epochs(q, dets)
    qs = q.qs()

    epochs_json = []
    for e in epochs:
        stacks = {}
        for d in spherex.DETECTOR_IDS:
            n = sum(1 for f in e["frames"] if f["detector"] == d)
            if n:
                stacks[d] = {"image_url": f"/api/stack.png?{qs}&epoch={e['id']}&detector={d}", "n_frames": n}
        stacks["ALL"] = {"image_url": f"/api/stack.png?{qs}&epoch={e['id']}&detector=ALL",
                         "n_frames": len(e["frames"])}
        epochs_json.append({k: e[k] for k in ("id", "label", "mjd_start", "mjd_end", "mjd_mid")}
                           | {"n_frames": len(e["frames"]), "stacks": stacks})

    frames_json = []
    for f in frames:
        quality, wl = imaging.quality_if_cached(f, q)
        frames_json.append(spherex.public_frame_fields(f) | {
            "wavelength_at_target_um": wl,
            "image_url": f"/api/frame/{f['id']}.png?{qs}",
            "fits_url": f"/api/frame/{f['id']}.fits?{qs}",
            "quality": quality,
        })

    by_coll: dict[str, int] = {}
    for f in frames:
        by_coll[f["collection"]] = by_coll.get(f["collection"], 0) + 1

    return {
        "schema_version": config.SCHEMA_VERSION,
        "generated_at": spherex.now_iso(),
        "query": {"target_name": target_name, "ra_deg": q.ra_deg, "dec_deg": q.dec_deg,
                  "coord_epoch": coord_epoch, "fov_arcmin": q.fov_arcmin},
        "grid": grid_json(q),
        "data_sources": [{"collection": c, "n_frames": n} for c, n in by_coll.items()],
        "detectors": [{"id": d, "wavelength_um": {"min": lo, "max": hi},
                       "n_frames": sum(1 for f in frames if f["detector"] == d)}
                      for d, (lo, hi) in spherex.DETECTORS.items()],
        "epochs": epochs_json,
        "epoch_strategy": strategy,
        "frames": frames_json,
        "overlays": {"gaia": gaia.overlay(q, epochs)},
        "render_defaults": {"stretch": "asinh", "units": "MJy/sr", "zodi_subtracted": True},
    }
