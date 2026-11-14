"""Cutouts leídos directo del bucket público de SPHEREx en AWS S3 (s3://nasa-irsa-spherex).

Por qué: el servicio de cutouts de IRSA (IBE) se satura y responde 503 "Server busy" todo el
tiempo. Los mismos archivos están en S3 con la misma ruta, y S3 acepta HTTP Range: se leen solo
los headers y las filas que cubren el campo pedido, en paralelo y sin límite de pedidos.

Archivo L2 de SPHEREx (2040x2040 px):
  PRIMARY · IMAGE (float32) · FLAGS (int32 comprimido RICE_1, un tile por fila) ·
  VARIANCE (float32) · ZODI (float32) · EPSF (no se usa) · WCS-WAVE (tabla chica del WCS espectral)

El resultado es un FITS con las mismas extensiones y headers (CRPIX ajustados) que devolvía el
servicio de cutouts de IRSA, así que el resto del pipeline no cambia.
"""
from __future__ import annotations

import base64
import hashlib
import io
import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import requests
from astropy.io import fits
from astropy.wcs import WCS
from astropy.wcs.utils import proj_plane_pixel_scales

from . import cache, config

log = logging.getLogger(__name__)

IRSA_PREFIX = "https://irsa.ipac.caltech.edu/ibe/data/spherex/"
BLOCK = 2880
_IMAGE_EXT = ("IMAGE", "VARIANCE", "ZODI")
_DTYPES = {-32: ">f4", -64: ">f8", 32: ">i4", 16: ">i2", 8: "u1"}

_local = threading.local()
_slots = threading.BoundedSemaphore(config.S3_MAX_CONCURRENT)
_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="s3")


class S3Unavailable(Exception):
    """No se pudo armar el cutout desde S3 (el llamador usa el servicio de IRSA como respaldo)."""


def s3_url(access_url: str) -> str | None:
    if not access_url.startswith(IRSA_PREFIX):
        return None
    return config.S3_BASE.rstrip("/") + "/" + access_url[len(IRSA_PREFIX):]


# ----------------------------------------------------------------------------- HTTP Range

def _session() -> requests.Session:
    s = getattr(_local, "s", None)
    if s is None:
        s = _local.s = requests.Session()
    return s


def _get(url: str, start: int | None = None, n: int | None = None, tail: int | None = None) -> bytes:
    """Lee `n` bytes desde `start`, o los últimos `tail` bytes. Reintenta errores de red y 5xx."""
    rng = f"bytes=-{tail}" if tail else f"bytes={start}-{start + n - 1}"
    last = None
    for attempt in range(4):
        try:
            with _slots:
                r = _session().get(url, headers={"Range": rng}, timeout=config.HTTP_TIMEOUT_S)
            if r.status_code == 206 and (tail or len(r.content) == n):
                return r.content
            last = f"HTTP {r.status_code}, {len(r.content)} bytes"
            if r.status_code in (403, 404, 416):
                break  # no existe o no es público: no tiene sentido reintentar
        except requests.RequestException as e:
            last = f"{type(e).__name__}: {e}"
        time.sleep(0.3 * 2 ** attempt)
    raise S3Unavailable(f"S3 {rng}: {last}")


# ----------------------------------------------------------------------------- estructura del archivo

def _parse_header(buf: bytes) -> tuple[fits.Header, int] | None:
    """(header, largo en bytes) si `buf` contiene la tarjeta END; si no, None."""
    for i in range(0, len(buf) - 79, 80):
        if buf[i:i + 8] == b"END     ":
            hlen = (i // BLOCK + 1) * BLOCK
            return fits.Header.fromstring(buf[:hlen].decode("ascii", "replace")), hlen
    return None


def _data_len(h: fits.Header) -> int:
    naxis = h.get("NAXIS", 0)
    n = abs(h.get("BITPIX", 8)) // 8 * int(np.prod([h[f"NAXIS{i}"] for i in range(1, naxis + 1)])) if naxis else 0
    n += h.get("PCOUNT", 0)
    return (n + BLOCK - 1) // BLOCK * BLOCK


def _read_header_at(url: str, off: int) -> tuple[fits.Header, int]:
    buf = b""
    while True:
        buf += _get(url, off + len(buf), 8 * BLOCK)
        parsed = _parse_header(buf)
        if parsed:
            return parsed
        if len(buf) > 200 * BLOCK:
            raise S3Unavailable("header sin END")


def _read_tail_ext(url: str, name: str) -> tuple[str, bytes]:
    """La última extensión (WCS-WAVE) se lee de la cola del archivo en un solo pedido."""
    tail = _get(url, tail=16 * BLOCK)
    tail = tail[len(tail) % BLOCK:] if len(tail) % BLOCK else tail
    for i in range(0, len(tail), BLOCK):
        if tail[i:i + 8] == b"XTENSION":
            parsed = _parse_header(tail[i:])
            if parsed and parsed[0].get("EXTNAME") == name:
                h, hlen = parsed
                data = tail[i + hlen:i + hlen + _data_len(h)]
                return h.tostring(), data
    raise S3Unavailable(f"no encontré {name} al final del archivo")


def layout(url: str) -> dict:
    """Offsets y headers de las extensiones. Se cachea: no cambia para un mismo archivo."""
    p = cache.path("s3layout", hashlib.sha1(url.encode()).hexdigest(), "json")
    hit = cache.read_json(p)
    if hit:
        return hit
    tail_f = _pool.submit(_read_tail_ext, url, "WCS-WAVE")  # en paralelo con la cadena de headers
    out: dict = {}
    off = 0
    wanted = {"IMAGE", "FLAGS", "VARIANCE", "ZODI"}
    while not wanted.issubset(out):
        h, hlen = _read_header_at(url, off)
        name = "PRIMARY" if off == 0 else h.get("EXTNAME", "")
        out[name] = {"header": h.tostring(), "data_off": off + hlen}
        off += hlen + _data_len(h)
        if len(out) > 10:
            raise S3Unavailable(f"estructura inesperada: {list(out)}")
    wh, wdata = tail_f.result()
    out["WCS-WAVE"] = {"header": wh, "data_b64": base64.b64encode(wdata).decode()}
    cache.write_json(p, out)
    return out


# ----------------------------------------------------------------------------- lectura de filas

def _rows(url: str, ext: dict, y0: int, y1: int) -> np.ndarray:
    h = fits.Header.fromstring(ext["header"])
    nx, bpp = h["NAXIS1"], abs(h["BITPIX"]) // 8
    raw = _get(url, ext["data_off"] + y0 * nx * bpp, (y1 - y0) * nx * bpp)
    return np.frombuffer(raw, dtype=_DTYPES[h["BITPIX"]]).reshape(y1 - y0, nx)


def _flag_rows(url: str, ext: dict, y0: int, y1: int) -> np.ndarray:
    """FLAGS está comprimida (RICE_1, un tile = una fila): se bajan los descriptores de las filas
    pedidas y solo esa porción del heap, y se descomprime acá."""
    from astropy.io.fits.hdu.compressed._codecs import Rice1  # API interna: si cambia, se usa IRSA

    h = fits.Header.fromstring(ext["header"])
    if h.get("ZCMPTYPE") != "RICE_1" or h.get("ZTILE2", 1) != 1 or h.get("TFIELDS") != 1:
        raise S3Unavailable(f"FLAGS con compresión no soportada: {h.get('ZCMPTYPE')}")
    row_len = h["NAXIS1"]  # 8 bytes: descriptor P (n bytes, offset en el heap)
    desc = np.frombuffer(_get(url, ext["data_off"] + y0 * row_len, (y1 - y0) * row_len), dtype=">i4")
    desc = desc.reshape(-1, row_len // 4)[:, :2]
    counts, offs = desc[:, 0].astype(np.int64), desc[:, 1].astype(np.int64)
    heap0 = ext["data_off"] + h.get("THEAP", h["NAXIS1"] * h["NAXIS2"])
    lo, hi = int(offs.min()), int((offs + counts).max())
    heap = np.frombuffer(_get(url, heap0 + lo, hi - lo), dtype=np.uint8)
    nx = h["ZNAXIS1"]
    codec = Rice1(blocksize=h.get("ZVAL1", 32), bytepix=h.get("ZVAL2", 4), tilesize=nx)
    out = np.empty((y1 - y0, nx), dtype=np.int32)
    for i, (c, o) in enumerate(zip(counts, offs)):
        tile = np.asarray(codec.decode(heap[o - lo:o - lo + c])).view(np.int32).ravel()
        out[i] = tile[:nx]
    return out


_STRUCT = {"XTENSION", "BITPIX", "NAXIS", "NAXIS1", "NAXIS2", "PCOUNT", "GCOUNT", "TFIELDS", "THEAP", "EXTEND"}


def _image_header(h: fits.Header, compressed: bool = False) -> fits.Header:
    """Header de imagen sin las tarjetas estructurales (astropy las regenera con los datos)."""
    out = fits.Header()
    for card in h.cards:
        k = card.keyword
        if k in _STRUCT or k.startswith(("TTYPE", "TFORM", "TUNIT")) or k in ("", "COMMENT", "HISTORY"):
            continue
        if compressed and k.startswith("Z"):
            continue
        out.append(card)
    return out


def _shift_crpix(h: fits.Header, x0: int, y0: int) -> None:
    for key, d in (("CRPIX1", x0), ("CRPIX2", y0), ("CRPIX1W", x0), ("CRPIX2W", y0)):
        if key in h:
            h[key] = h[key] - d


# ----------------------------------------------------------------------------- cutout

def cutout_fits(frame: dict, ra: float, dec: float, size_deg: float) -> bytes:
    """Cutout cuadrado de `size_deg` alrededor de (ra, dec). El costo es proporcional a la cantidad
    de filas: S3 no permite pedir solo algunas columnas."""
    url = s3_url(frame["access_url"])
    if not url:
        raise S3Unavailable("el frame no tiene una ruta mapeable a S3")
    L = layout(url)
    img_h = fits.Header.fromstring(L["IMAGE"]["header"])
    nx, ny = img_h["NAXIS1"], img_h["NAXIS2"]
    w = WCS(img_h)
    x, y = w.all_world2pix([[ra, dec]], 0)[0]
    half = size_deg / 2.0 / float(np.mean(proj_plane_pixel_scales(w.celestial)))
    x0, x1 = int(np.floor(x - half)), int(np.ceil(x + half)) + 1
    y0, y1 = int(np.floor(y - half)), int(np.ceil(y + half)) + 1
    x0, x1, y0, y1 = max(0, x0), min(nx, x1), max(0, y0), min(ny, y1)
    if x1 <= x0 or y1 <= y0:
        raise S3Unavailable("el campo pedido no cae dentro de este frame")

    futs = {n: _pool.submit(_rows, url, L[n], y0, y1) for n in _IMAGE_EXT}
    futs["FLAGS"] = _pool.submit(_flag_rows, url, L["FLAGS"], y0, y1)
    data = {n: f.result()[:, x0:x1] for n, f in futs.items()}

    hdus = [fits.PrimaryHDU(header=_image_header(fits.Header.fromstring(L["PRIMARY"]["header"])))]
    for name in ("IMAGE", "FLAGS", "VARIANCE", "ZODI"):
        src = fits.Header.fromstring(L[name]["header"])
        h = _image_header(src, compressed=(name == "FLAGS"))
        _shift_crpix(h, x0, y0)
        arr = data[name].astype(np.int32 if name == "FLAGS" else np.float32)
        hdus.append(fits.ImageHDU(data=arr, header=h, name=name))
    # WCS-WAVE: se reconstruye tal cual a partir de su header + datos
    ww = L["WCS-WAVE"]
    raw = fits.PrimaryHDU().header.tostring().encode() + ww["header"].encode() + base64.b64decode(ww["data_b64"])
    with fits.open(io.BytesIO(raw), memmap=False) as tmp:
        hdus.append(fits.BinTableHDU(data=tmp[1].data.copy(), header=tmp[1].header, name="WCS-WAVE"))

    buf = io.BytesIO()
    fits.HDUList(hdus).writeto(buf, output_verify="silentfix")
    return buf.getvalue()
