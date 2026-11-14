"""Configuración por variables de entorno (sin dependencias extra).

Todo lo que puede cambiar con un nuevo data release de SPHEREx vive acá.
"""
from __future__ import annotations

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = BACKEND_DIR.parent


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


SCHEMA_VERSION = "1.1"

# --- Modo mock: sirve los JSON de docs/ y PNGs sintéticos (para el front sin internet) ---
MOCK = _env("SPHEREX_MOCK", "0") == "1"
MOCK_DIR = Path(_env("SPHEREX_MOCK_DIR", str(REPO_DIR / "docs")))

# --- Colecciones SPHEREx en IRSA ---
# Vacío = autodescubrir con Irsa.list_collections (filter="spherex").
# Si se fija a mano, el ORDEN es la prioridad para deduplicar (la primera gana).
# Ej: SPHEREX_COLLECTIONS="spherex_dr1,spherex_qr3"
COLLECTIONS = [c.strip() for c in _env("SPHEREX_COLLECTIONS", "").split(",") if c.strip()]
IRSA_SIA_URL = _env("IRSA_SIA_URL", "https://irsa.ipac.caltech.edu/SIA")

# --- Grilla común ---
PIXEL_SCALE_ARCSEC = float(_env("PIXEL_SCALE_ARCSEC", "6.15"))  # escala nativa de SPHEREx
FOV_DEFAULT_ARCMIN = 10.0
FOV_MAX_ARCMIN = 30.0

# Época a la que se propagan las coordenadas de /api/targets
TARGET_EPOCH = _env("TARGET_EPOCH", "J2025.5")

# --- Épocas ---
EPOCH_GAP_DAYS = 30.0         # hueco que separa dos pasadas
EPOCH_MAX_SPAN_DAYS = 60.0    # si una "época" dura más que esto -> cobertura continua -> bins de 30 d
EPOCH_BIN_DAYS = 30.0

# --- Gaia ---
GAIA_TABLE = "gaiadr3.gaia_source"
GAIA_MAG_LIMIT = float(_env("GAIA_MAG_LIMIT", "20"))
GAIA_ROW_LIMIT = int(_env("GAIA_ROW_LIMIT", "3000"))

# --- Red / caché ---
CACHE_DIR = Path(_env("SPHEREX_CACHE_DIR", str(BACKEND_DIR / "cache")))
SIA_CACHE_TTL_S = float(_env("SIA_CACHE_TTL_S", str(12 * 3600)))  # re-consultar cada 12 h (datos nuevos)
HTTP_TIMEOUT_S = float(_env("HTTP_TIMEOUT_S", "60"))
DOWNLOAD_WORKERS = int(_env("DOWNLOAD_WORKERS", "6"))  # más que esto y IRSA responde 503
# margen del cutout respecto del FOV (rotación del detector: necesita >= sqrt(2))
CUTOUT_MARGIN = 1.45

# --- CORS ---
CORS_ORIGINS = [o.strip() for o in _env("CORS_ORIGINS", "*").split(",") if o.strip()]

# --- Planos de FLAGS considerados "malos" (nombres de MSKNnnnn en el header de FLAGS) ---
# Informativos y NO malos: SOURCE, FULLSAMPLE, DICHROIC, PHANMISS, CROSSTALK, GHOST_FPA, GHOST_EXT.
BAD_FLAG_NAMES = [
    "TRANSIENT", "OVERFLOW", "SUR_ERROR", "NONFUNC", "MISSING_DATA", "HOT", "COLD",
    "NONLINEAR", "PERSIST", "OUTLIER", "GHOST", "STREAK", "BLOOM", "SNOWBALL", "HALO",
]
# Fallback si el header no trae MSKN: bits de los nombres de arriba según DR1.
BAD_FLAG_BITS_DEFAULT = [0, 1, 2, 6, 9, 10, 11, 15, 17, 19, 22, 25, 26, 27, 28]
HTTP_RETRIES = int(_env("HTTP_RETRIES", "6"))  # IRSA responde 503 "Server busy" seguido
# Conexiones simultáneas a IRSA en TODO el proceso (stacks + fotometría + frames comparten el límite).
# Con más, IRSA corta descargas a la mitad (IncompleteRead) o responde 503.
IRSA_MAX_CONCURRENT = int(_env("IRSA_MAX_CONCURRENT", "4"))
