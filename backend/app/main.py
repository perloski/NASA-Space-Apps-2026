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
