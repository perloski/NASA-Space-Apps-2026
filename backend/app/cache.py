"""Caché en disco simple + locks por clave (evita bajar dos veces lo mismo en paralelo)."""
from __future__ import annotations

import hashlib
import json
import os
import threading
import time
from collections import defaultdict
from pathlib import Path
from typing import Any, Callable

from . import config

_locks: dict[str, threading.Lock] = defaultdict(threading.Lock)
_locks_guard = threading.Lock()


def lock_for(key: str) -> threading.Lock:
    with _locks_guard:
        return _locks[key]


def path(kind: str, key: str, ext: str) -> Path:
    """Ruta de caché. `key` se hashea si es largo o tiene caracteres raros."""
    safe = key if (len(key) < 120 and all(c.isalnum() or c in "._-+" for c in key)) else (
        hashlib.sha1(key.encode()).hexdigest()
    )
    d = config.CACHE_DIR / kind
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{safe}.{ext}"


def atomic_write_bytes(p: Path, data: bytes) -> None:
    """Escribe en un temporal y lo renombra. En Windows os.replace falla (Acceso denegado) si otro
    hilo/proceso tiene el destino abierto: se reintenta un momento y, si el destino ya existe
    (otro escritor ganó con el mismo contenido), se descarta el temporal."""
    tmp = p.with_suffix(p.suffix + f".tmp{os.getpid()}_{threading.get_ident()}")
    tmp.write_bytes(data)
    for attempt in range(10):
        try:
            os.replace(tmp, p)
            return
        except PermissionError:
            time.sleep(0.05 * (attempt + 1))
    if p.exists():
        tmp.unlink(missing_ok=True)
        return
    os.replace(tmp, p)  # último intento: si falla, que se vea el error


def read_json(p: Path, max_age_s: float | None = None) -> Any | None:
    try:
        if max_age_s is not None and time.time() - p.stat().st_mtime > max_age_s:
            return None
        return json.loads(p.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def write_json(p: Path, obj: Any) -> None:
    atomic_write_bytes(p, json.dumps(obj, separators=(",", ":")).encode("utf-8"))


def cached_bytes(kind: str, key: str, ext: str, build: Callable[[], bytes | tuple[bytes, bool]]) -> bytes:
    p = path(kind, key, ext)
    if p.exists():
        return p.read_bytes()
    with lock_for(f"{kind}/{key}"):
        if p.exists():
            return p.read_bytes()
        out = build()
        data, cacheable = out if isinstance(out, tuple) else (out, True)
        if cacheable:  # resultados incompletos (IRSA falló en algún frame) no se cachean
            atomic_write_bytes(p, data)
        return data
