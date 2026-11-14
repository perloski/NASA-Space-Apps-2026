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

    Devuelve (arrays, completo). completo=False si falló CUALQUIER frame: el resultado se devuelve
    igual pero no se cachea, así el próximo pedido reintenta los que faltan (los que sí se
    procesaron quedan en caché y no se vuelven a bajar). Si fallan todos por IRSA -> UPSTREAM_TIMEOUT.
    """
    def one(f):
        try:
            return reprojected(f, q), False
        except ApiError as e:
            log.warning("Frame %s salteado: %s", f["id"], e.message)
            return None, True
        except Exception as e:  # noqa: BLE001  error inesperado: mejor no cachear un stack incompleto
            log.warning("Frame %s salteado (%s): %s", f["id"], type(e).__name__, e)
            return None, True

    res = list(_pool.map(one, frames))
    arrays = [a for a, _ in res if a is not None]
    transient = sum(t for _, t in res)
    if transient and not arrays:
        raise upstream_timeout("IRSA (cutout)")
    return arrays, transient == 0


# ----------------------------------------------------------------------------- stacks / diff

def _select(frames: list[dict], epoch_id: str | None, detector: str) -> list[dict]:
    out = [f for f in frames if epoch_id is None or f.get("epoch_id") == epoch_id]
    if detector != "ALL":
        out = [f for f in out if f["detector"] == detector]
    return out


def stack_array(epochs: list[dict], q: Query, epoch_id: str, detector: str,
                op: str = "mean") -> tuple[np.ndarray, bool]:
    """-> (imagen, completo). Solo se cachea si están todos los frames."""
    ep = next((e for e in epochs if e["id"] == epoch_id), None)
    if ep is None:
        raise bad_params(f"Época '{epoch_id}' inexistente para estas coordenadas.")
    sel = _select(ep["frames"], None, detector)
    if not sel:
        raise ApiError("NO_COVERAGE", f"No hay frames del detector {detector} en la época {epoch_id}.")
    p = cache.path("stack", f"{epoch_id}_{detector}_{op}_{len(sel)}__{q.key}", "npy")
    if p.exists():
        return np.load(p), True
    arrs, complete = reproject_many(sel, q)
    if not arrs:
        raise ApiError("INTERNAL", "No se pudo procesar ningún frame de este stack.")
    cube = np.stack(arrs)
    with np.errstate(all="ignore"), _quiet():
        if op == "median":
            out = np.nanmedian(cube, axis=0)
        elif op == "sum":
            out = np.nansum(cube, axis=0)
            out[np.all(np.isnan(cube), axis=0)] = np.nan
        else:
            out = np.nanmean(cube, axis=0)
    out = out.astype(np.float32)
    if complete:
        buf = io.BytesIO()
        np.save(buf, out)
        cache.atomic_write_bytes(p, buf.getvalue())
    return out, complete


class _quiet:
    def __enter__(self):
        import warnings
        self._w = warnings.catch_warnings()
        self._w.__enter__()
        warnings.simplefilter("ignore", RuntimeWarning)

    def __exit__(self, *a):
        self._w.__exit__(*a)


# ----------------------------------------------------------------------------- stretch

def limits(arrays: list[np.ndarray], stretch: str) -> tuple[float, float]:
    """Regla 3: vmin/vmax comunes a toda la secuencia (se pasa la lista de arrays de la secuencia)."""
    vals = np.concatenate([a[np.isfinite(a)].ravel() for a in arrays]) if arrays else np.array([])
    if vals.size == 0:
        return 0.0, 1.0
    if vals.size > 200_000:
        vals = np.random.default_rng(0).choice(vals, 200_000, replace=False)
    if stretch == "zscale":
        vmin, vmax = ZScaleInterval().get_limits(vals)
    else:
        vmin, vmax = np.percentile(vals, [0.5, 99.7])
    if not vmax > vmin:
        vmax = vmin + 1e-6
    return float(vmin), float(vmax)


def apply_stretch(a: np.ndarray, vmin: float, vmax: float, stretch: str) -> np.ndarray:
    x = np.clip((a - vmin) / (vmax - vmin), 0, 1)
    if stretch == "asinh":
        k = 0.1
        x = np.arcsinh(x / k) / np.arcsinh(1 / k)
    return x


def to_png(a: np.ndarray, vmin: float, vmax: float, stretch: str) -> bytes:
    """Gris + alfa (sin datos = transparente). Fila 0 del PNG = norte (se invierte el eje y de FITS)."""
    if stretch not in STRETCHES:
        raise bad_params(f"'stretch' debe ser uno de {', '.join(STRETCHES)}.")
    x = apply_stretch(np.nan_to_num(a, nan=vmin), vmin, vmax, stretch)
    gray = (x * 255).astype(np.uint8)
    alpha = np.where(np.isfinite(a), 255, 0).astype(np.uint8)
    img = Image.fromarray(np.flipud(np.dstack([gray, alpha])), mode="LA")
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def diff_png(d: np.ndarray) -> bytes:
    """Diferencia: 0 = gris medio, simétrico (blanco = más brillante en B, negro = en A)."""
    vals = np.abs(d[np.isfinite(d)])
    m = float(np.percentile(vals, 99.5)) if vals.size else 1.0
    m = m or 1e-6
    x = np.clip(0.5 + 0.5 * np.nan_to_num(d) / m, 0, 1)
    gray = (x * 255).astype(np.uint8)
    alpha = np.where(np.isfinite(d), 255, 0).astype(np.uint8)
    buf = io.BytesIO()
    Image.fromarray(np.flipud(np.dstack([gray, alpha])), mode="LA").save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def to_fits(a: np.ndarray, q: Query, extra: dict | None = None) -> bytes:
    h = fits.Header()
    for k, v in grid_header(q).items():
        if k not in ("NAXIS", "NAXIS1", "NAXIS2"):
            h[k] = v
    h["BUNIT"] = "MJy/sr"
    h["ZODISUB"] = (True, "ZODI extension subtracted")
    for k, v in (extra or {}).items():
        h[k[:8].upper()] = v
    buf = io.BytesIO()
    fits.PrimaryHDU(data=a.astype(np.float32), header=h).writeto(buf)
    return buf.getvalue()


# ----------------------------------------------------------------------------- límites por secuencia

def frame_sequence_limits(frames: list[dict], q: Query, detector: str, stretch: str) -> tuple[float, float]:
    """Límites comunes para los frames individuales de un detector.

    Bajar TODOS los frames solo para calcular el stretch sería carísimo: se muestrean hasta 8
    frames repartidos en el tiempo y el resultado se cachea.
    """
    key = f"framelim_{detector}_{stretch}__{q.key}"
    p = cache.path("limits", key, "json")
    hit = cache.read_json(p)
    if hit:
        return tuple(hit)
    sel = [f for f in frames if f["detector"] == detector]
    if len(sel) > 8:
        idx = np.linspace(0, len(sel) - 1, 8).round().astype(int)
        sel = [sel[i] for i in sorted(set(idx))]
    arrs, complete = reproject_many(sel, q)
    lim = limits(arrs, stretch)
    if complete:
        cache.write_json(p, list(lim))
    return lim


def stack_sequence_limits(epochs: list[dict], q: Query, detector: str, stretch: str, op: str) -> tuple[float, float]:
    """Límites comunes a los stacks de todas las épocas para un detector (la animación por épocas)."""
    key = f"stacklim_{detector}_{stretch}_{op}_{len(epochs)}__{q.key}"
    p = cache.path("limits", key, "json")
    hit = cache.read_json(p)
    if hit:
        return tuple(hit)
    arrs, complete = [], True
    for e in epochs:
        try:
            a, ok = stack_array(epochs, q, e["id"], detector, op)
            arrs.append(a)
            complete &= ok
        except ApiError as err:
            if err.code == "UPSTREAM_TIMEOUT":
                raise
            # NO_COVERAGE: esa época no tiene este detector -> se ignora
    lim = limits(arrs, stretch)
    if complete:
        cache.write_json(p, list(lim))
    return lim
