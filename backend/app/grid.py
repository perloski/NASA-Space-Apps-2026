"""Grilla común (TAN, norte arriba) a la que se reproyectan todas las imágenes."""
from __future__ import annotations

import math
from dataclasses import dataclass

from astropy.wcs import WCS

from . import config


@dataclass(frozen=True)
class Query:
    """Parámetros normalizados de una consulta. Redondear evita claves de caché casi iguales."""
    ra_deg: float
    dec_deg: float
    fov_arcmin: float

    @classmethod
    def make(cls, ra: float, dec: float, fov_arcmin: float | None) -> "Query":
        from .errors import bad_params

        if ra is None or dec is None:
            raise bad_params("Faltan 'ra' y/o 'dec' (grados) o 'target'.")
        if not (math.isfinite(ra) and math.isfinite(dec)):
            raise bad_params("'ra' y 'dec' deben ser números finitos.")
        if not (-90.0 <= dec <= 90.0):
            raise bad_params("'dec' debe estar entre -90 y 90 grados.")
        fov = config.FOV_DEFAULT_ARCMIN if fov_arcmin is None else float(fov_arcmin)
        if not (0 < fov <= config.FOV_MAX_ARCMIN):
            raise bad_params(f"'fov_arcmin' debe estar entre 0 y {config.FOV_MAX_ARCMIN:g}.")
        return cls(round(ra % 360.0, 6), round(dec, 6), round(fov, 3))

    @property
    def key(self) -> str:
        return f"{self.ra_deg:.6f}_{self.dec_deg:+.6f}_{self.fov_arcmin:g}"

    def qs(self) -> str:
        """Query string común que va en todas las URLs de imágenes."""
        return f"ra={self.ra_deg:.6f}&dec={self.dec_deg:.6f}&fov_arcmin={self.fov_arcmin:g}"


def grid_size_px(fov_arcmin: float) -> int:
    return max(8, math.ceil(fov_arcmin * 60.0 / config.PIXEL_SCALE_ARCSEC))


def grid_header(q: Query) -> dict:
    n = grid_size_px(q.fov_arcmin)
    cdelt = config.PIXEL_SCALE_ARCSEC / 3600.0
    return {
        "NAXIS": 2, "NAXIS1": n, "NAXIS2": n, "WCSAXES": 2,
        "CTYPE1": "RA---TAN", "CTYPE2": "DEC--TAN", "CUNIT1": "deg", "CUNIT2": "deg",
        "CRVAL1": q.ra_deg, "CRVAL2": q.dec_deg,
        "CRPIX1": (n + 1) / 2.0, "CRPIX2": (n + 1) / 2.0,
        "CDELT1": -cdelt, "CDELT2": cdelt,
        "EQUINOX": 2000.0,
    }


def grid_wcs(q: Query) -> WCS:
    h = dict(grid_header(q))
    h.pop("NAXIS"), h.pop("NAXIS1"), h.pop("NAXIS2")
    w = WCS(h)
    n = grid_size_px(q.fov_arcmin)
    w.pixel_shape = (n, n)
    return w


def grid_json(q: Query) -> dict:
    n = grid_size_px(q.fov_arcmin)
    return {
        "width_px": n,
        "height_px": n,
        "pixel_scale_arcsec": config.PIXEL_SCALE_ARCSEC,
        "wcs": grid_header(q),
    }
