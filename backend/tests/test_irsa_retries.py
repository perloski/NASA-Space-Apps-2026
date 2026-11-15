"""Reintentos ante los cortes de IRSA (sin red: requests.get simulado)."""
import io

import numpy as np
import pytest
import requests
from astropy.io import fits

from app import config, imaging, spherex
from app.errors import ApiError
from app.grid import Query


def _fits_bytes() -> bytes:
    buf = io.BytesIO()
    fits.HDUList([fits.PrimaryHDU(), fits.ImageHDU(np.zeros((4, 4), np.float32), name="IMAGE")]).writeto(buf)
    return buf.getvalue()


class _Resp:
    def __init__(self, content, status=200):
        self.content, self.status_code, self.text = content, status, ""


@pytest.fixture(autouse=True)
def _fast(monkeypatch):
    monkeypatch.setattr(spherex.time, "sleep", lambda s: None)
    monkeypatch.setattr(config, "HTTP_RETRIES", 4)


def _fake_get(monkeypatch, outcomes):
    calls = []

    def get(url, timeout):
        o = outcomes[len(calls)]
        calls.append(url)
        if isinstance(o, Exception):
            raise o
        return o

    monkeypatch.setattr(spherex.requests, "get", get)
    return calls


def test_retries_incomplete_read(monkeypatch):
    # el error del log: "Connection broken: IncompleteRead(7248 bytes read, 2992 more expected)"
    calls = _fake_get(monkeypatch, [
        requests.exceptions.ChunkedEncodingError("Connection broken: IncompleteRead(7248 bytes read)"),
        _Resp(b"Server busy, retry later.", 503),
        _Resp(_fits_bytes()),
    ])
    out = spherex._http_get_fits("http://x", "test", validate=spherex._strip_extensions)
    assert out.startswith(b"SIMPLE") and len(calls) == 3


def test_retries_truncated_fits(monkeypatch):
    good = _fits_bytes()
    calls = _fake_get(monkeypatch, [_Resp(good[:3000]), _Resp(good)])
    spherex._http_get_fits("http://x", "test", validate=spherex._strip_extensions)
    assert len(calls) == 2


def test_gives_up_as_upstream_timeout(monkeypatch):
    _fake_get(monkeypatch, [requests.exceptions.ChunkedEncodingError("cut")] * 4)
    with pytest.raises(ApiError) as e:
        spherex._http_get_fits("http://x", "test")
    assert e.value.code == "UPSTREAM_TIMEOUT"


def test_stack_with_failed_frame_is_not_complete(monkeypatch):
    q = Query.make(10, 10, 10)

    def reprojected(f, q):
        if f["id"] == "bad":
            raise ValueError("algo inesperado")
        return np.ones((3, 3), np.float32)

    monkeypatch.setattr(imaging, "reprojected", reprojected)
    arrays, complete = imaging.reproject_many([{"id": "ok"}, {"id": "bad"}], q)
    assert len(arrays) == 1 and complete is False


def test_sia_partial_outage_is_upstream_error_not_no_coverage(monkeypatch, tmp_path):
    """IRSA caído para DR1 (502) y QR vacío: no hay que decir 'sin cobertura' (404)."""
    monkeypatch.setattr(config, "COLLECTIONS", ["spherex_dr1", "spherex_qr"])
    monkeypatch.setattr(spherex.cache, "path", lambda *a: tmp_path / "_".join(map(str, a)))

    def query(ra, dec, coll):
        if coll == "spherex_dr1":
            raise Exception("HTTP Code: 502 Proxy Error")
        return []

    monkeypatch.setattr(spherex, "_query_collection", query)
    with pytest.raises(ApiError) as e:
        spherex.find_frames(10.0, 20.0)
    assert e.value.code == "UPSTREAM_TIMEOUT"
