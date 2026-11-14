"""Acceso a SPHEREx en IRSA: colecciones, consulta SIA, épocas y cutouts.

Referencia: https://caltech-ipac.github.io/irsa-tutorials/spherex/
"""
from __future__ import annotations

import logging
import random
import re
import time
from dataclasses import dataclass
from functools import cached_property
from typing import Any

import numpy as np
import requests
from astropy.io import fits
from astropy.time import Time
from astropy.wcs import WCS, FITSFixedWarning

from . import cache, config
from .errors import ApiError, no_coverage, upstream_timeout
from .grid import Query

log = logging.getLogger(__name__)

import warnings  # noqa: E402

warnings.simplefilter("ignore", FITSFixedWarning)

from astropy import log as _astropy_log  # noqa: E402

_astropy_log.setLevel("WARNING")  # el WCS espectral "W" trae SIP sin sufijo: aviso inofensivo

DETECTORS = {
    "D1": (0.75, 1.09),
    "D2": (1.10, 1.62),
    "D3": (1.63, 2.41),
    "D4": (2.42, 3.82),
    "D5": (3.83, 4.41),
    "D6": (4.42, 5.00),
}
DETECTOR_IDS = list(DETECTORS)

_COLL_RE = re.compile(r"^spherex_(dr|qr)(\d*)$")


# ----------------------------------------------------------------------------- colecciones

def _collection_priority(name: str) -> tuple:
    """DR antes que QR; dentro de cada tipo, la versión más nueva primero."""
    m = _COLL_RE.match(name)
    if not m:
        return (9, 0)
    kind, num = m.groups()
    return (0 if kind == "dr" else 1, -(int(num) if num else 0))


def collections() -> list[str]:
    if config.COLLECTIONS:
        return list(config.COLLECTIONS)
    p = cache.path("meta", "collections", "json")
    cached = cache.read_json(p, max_age_s=config.SIA_CACHE_TTL_S)
    if cached:
        return cached
    try:
        from astroquery.ipac.irsa import Irsa

        tab = Irsa.list_collections(servicetype="SIA", filter="spherex")
        names = [str(n) for n in tab["collection"] if _COLL_RE.match(str(n))]
    except Exception as e:  # noqa: BLE001
        log.warning("No pude listar colecciones de IRSA (%s); uso default", e)
        names = []
    if not names:
        names = ["spherex_dr1", "spherex_qr"]
    names = sorted(set(names), key=_collection_priority)
    cache.write_json(p, names)
    return names
