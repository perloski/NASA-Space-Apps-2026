"""Fotometría: medición normal y en las alas de una estrella saturada (sin red)."""
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS

from app import photometry, spherex


def _cutout(sat_radius=None):
    n = 60
    w = WCS(naxis=2)
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    w.wcs.crval = [10.0, 20.0]
    w.wcs.crpix = [n / 2 + 0.5, n / 2 + 0.5]
    w.wcs.cdelt = [-6.15 / 3600, 6.15 / 3600]
    yy, xx = np.mgrid[0:n, 0:n]
    r = np.hypot(xx - (n / 2 - 0.5), yy - (n / 2 - 0.5))
    img = 1000.0 / (1 + (r / 1.5) ** 3) + 1.0          # estrella + fondo 1.0
    flags = np.zeros((n, n), np.int32)
    if sat_radius:
        flags[r <= sat_radius] = 1 << 1                  # OVERFLOW
        img[r <= sat_radius] = np.nan
    fh = fits.Header({"MSKN0001": "OVERFLOW"})
    return spherex.Cutout(frame={"id": "x"}, image=img, flags=flags, variance=np.ones((n, n)),
                          header=w.to_header(), hdul=fits.HDUList([fits.PrimaryHDU()]), flags_header=fh)


def test_normal_star():
    m = photometry.measure(_cutout(), 10.0, 20.0, 2)
    assert m["flux"] > 100 and m["flagged"] is False and "saturated" not in m


def test_saturated_star_measured_in_the_wings():
    m = photometry.measure(_cutout(sat_radius=6), 10.0, 20.0, 2)
    assert m is not None, "antes devolvía None: el centro saturado no tiene píxeles buenos"
    assert m["saturated"] is True and m["flagged"] is True
    assert m["flux"] > 0                                # el ala está por encima del fondo


def test_wings_scale_with_brightness():
    a, b = _cutout(sat_radius=6), _cutout(sat_radius=6)
    b.image = (b.image - 1.0) * 2 + 1.0                  # el doble de brillante, mismo fondo
    fa = photometry.measure(a, 10.0, 20.0, 2)["flux"]
    fb = photometry.measure(b, 10.0, 20.0, 2)["flux"]
    assert abs(fb / fa - 2.0) < 0.05                     # la curva de luz conserva las variaciones
