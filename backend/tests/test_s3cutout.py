"""Lógica pura del lector de S3 (sin red)."""
import numpy as np
from astropy.io import fits

from app import s3cutout


def test_s3_url_mapping():
    u = "https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/level2/2025W19_1B/x/5/level2_a.fits"
    assert s3cutout.s3_url(u).endswith("/dr1/level2/2025W19_1B/x/5/level2_a.fits")
    assert s3cutout.s3_url(u).startswith("https://nasa-irsa-spherex.s3")
    assert s3cutout.s3_url("https://otro.server/archivo.fits") is None


def test_shift_crpix_includes_spectral_wcs():
    h = fits.Header({"CRPIX1": 100.0, "CRPIX2": 200.0, "CRPIX1W": 1.0, "CRPIX2W": 1.0})
    s3cutout._shift_crpix(h, 30, 50)
    assert (h["CRPIX1"], h["CRPIX2"], h["CRPIX1W"], h["CRPIX2W"]) == (70.0, 150.0, -29.0, -49.0)


def test_header_parsing_and_data_len():
    h = fits.Header({"XTENSION": "IMAGE", "BITPIX": -32, "NAXIS": 2, "NAXIS1": 2040, "NAXIS2": 2040,
                     "PCOUNT": 0, "GCOUNT": 1, "EXTNAME": "IMAGE"})
    raw = h.tostring().encode() + b"\0" * 100
    parsed, hlen = s3cutout._parse_header(raw)
    assert parsed["EXTNAME"] == "IMAGE" and hlen % 2880 == 0
    assert s3cutout._data_len(parsed) == 16646400  # = el offset real entre IMAGE y FLAGS en DR1


def test_compressed_flags_header_drops_compression_cards():
    h = fits.Header({"XTENSION": "BINTABLE", "BITPIX": 8, "NAXIS": 2, "NAXIS1": 8, "NAXIS2": 2040,
                     "TFIELDS": 1, "TTYPE1": "COMPRESSED_DATA", "ZIMAGE": True, "ZCMPTYPE": "RICE_1",
                     "MSKN0021": "SOURCE", "CRPIX1": 5.0})
    out = s3cutout._image_header(h, compressed=True)
    assert "ZCMPTYPE" not in out and "TTYPE1" not in out and "NAXIS1" not in out
    assert out["MSKN0021"] == "SOURCE" and out["CRPIX1"] == 5.0
