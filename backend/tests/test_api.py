"""Tests offline: lógica pura + endpoints en modo mock. Correr: python -m pytest -q"""
import io

import numpy as np
import pytest
from astropy.time import Time
from fastapi.testclient import TestClient
from PIL import Image

from app import config, gaia, spherex, targets
from app.grid import Query, grid_header
from app.imaging import diff_png, limits, to_png
from app.main import app


@pytest.fixture
def client(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "MOCK", True)
    monkeypatch.setattr(config, "CACHE_DIR", tmp_path)
    return TestClient(app)


# --------------------------------------------------------------------------- lógica pura

def test_grid_matches_contract_example():
    h = grid_header(Query.make(133.786245, -7.24441, 10))
    assert h["NAXIS1"] == h["NAXIS2"] == 98
    assert h["CRPIX1"] == 49.5
    assert h["CDELT1"] == pytest.approx(-0.00170833, rel=1e-4)


def test_dedupe_prefers_dr1():
    rows = [
        {"id": "X_D1", "collection": "spherex_qr3", "mjd": 1, "detector": "D1"},
        {"id": "X_D1", "collection": "spherex_dr1", "mjd": 1, "detector": "D1"},
        {"id": "Y_D2", "collection": "spherex_qr3", "mjd": 2, "detector": "D2"},
    ]
    out = spherex.dedupe(rows, ["spherex_dr1", "spherex_qr3"])
    assert [(r["id"], r["collection"]) for r in out] == [("X_D1", "spherex_dr1"), ("Y_D2", "spherex_qr3")]


def test_collection_priority():
    names = sorted(["spherex_qr", "spherex_qr3", "spherex_dr1", "spherex_dr2"], key=spherex._collection_priority)
    assert names == ["spherex_dr2", "spherex_dr1", "spherex_qr3", "spherex_qr"]


def test_epochs_gap_strategy():
    frames = [{"mjd": m, "detector": "D1"} for m in (60800, 60801, 60805, 60986, 60990, 61170)]
    strategy, epochs = spherex.group_epochs(frames)
    assert strategy == "gap"
    assert [len(e["frames"]) for e in epochs] == [3, 2, 1]
    assert epochs[0]["label"] == "May 2025"
    assert frames[3]["epoch_id"] == "E2"


def test_epochs_continuous_coverage_uses_bins():
    frames = [{"mjd": 60800 + 2 * i, "detector": "D1"} for i in range(60)]  # 120 días seguidos
    strategy, epochs = spherex.group_epochs(frames)
    assert strategy == "bins_30d"
    assert len(epochs) == 4


def test_proper_motion_barnard_moves_about_1p5_arcmin():
    t = targets.get("barnard")
    ra, dec = targets.position(t, "J2025.5")
    r = t["ref"]
    dd = (dec - r["dec_deg"]) * 60
    assert 1.5 < dd < 1.7  # ~10.36"/año * 9.5 años = 98" ≈ 1.64'


def test_gaia_propagation_vectorized():
    (ra, dec), = gaia.propagate([10.0, 20.0], [0.0, 0.0], [0.0, 1000.0], [3600.0, 0.0], [10.0, None],
                                gaia.GAIA_EPOCH, [Time(2017.0, format="jyear")])
    assert dec[0] == pytest.approx(0.001, abs=1e-5)   # 3.6"/año norte
    assert ra[1] - 20.0 == pytest.approx(1 / 3600, abs=1e-5)


def test_png_is_north_up_with_alpha():
    a = np.zeros((10, 10), dtype=np.float32)
    a[9, :] = 1.0          # fila superior en FITS (y máximo) = norte
    a[0, 0] = np.nan
    img = Image.open(io.BytesIO(to_png(a, *limits([a], "linear"), "linear")))
    px = np.array(img)
    assert img.mode == "LA"
    assert px[0, 5, 0] == 255      # norte arriba en el PNG
    assert px[9, 0, 1] == 0        # NaN -> transparente


def test_diff_zero_is_mid_gray():
    d = np.zeros((5, 5)); d[0, 0] = 1; d[1, 1] = -1
    px = np.array(Image.open(io.BytesIO(diff_png(d))))
    assert px[2, 2, 0] in (127, 128)


# --------------------------------------------------------------------------- API (mock)

def test_targets(client):
    r = client.get("/api/targets").json()
    assert {t["id"] for t in r["targets"]} == {"barnard", "epsindib", "wise0855", "rwaur", "rdra"}


def test_sky_mock(client):
    r = client.get("/api/sky", params={"target": "wise0855"})
    assert r.status_code == 200
    j = r.json()
    assert j["schema_version"] == "1.1"
    assert j["query"]["target_name"] == "WISE 0855"
    assert f"ra={j['query']['ra_deg']:.6f}" in j["frames"][0]["image_url"]
    assert all(isinstance(s["source_id"], str) for s in j["overlays"]["gaia"]["sources"])


def test_images_mock(client):
    j = client.get("/api/sky", params={"ra": 133.786245, "dec": -7.24441}).json()
    for url in (j["frames"][0]["image_url"], j["epochs"][0]["stacks"]["D5"]["image_url"],
                "/api/diff.png?ra=133.786245&dec=-7.24441&a=E1&b=E3&detector=D5"):
        r = client.get(url)
        assert r.status_code == 200, url
        assert r.headers["content-type"] == "image/png"
    r = client.get(j["frames"][0]["fits_url"])
    assert r.content.startswith(b"SIMPLE")


def test_errors_have_contract_shape(client):
    r = client.get("/api/sky", params={"ra": 10, "dec": 95})
    assert r.status_code == 400 and r.json()["error"]["code"] == "BAD_PARAMS"
    r = client.get("/api/sky", params={"ra": "abc", "dec": 0})
    assert r.status_code == 400 and r.json()["error"]["code"] == "BAD_PARAMS"
    r = client.get("/api/sky", params={"target": "nope"})
    assert r.json()["error"]["code"] == "BAD_PARAMS"
    r = client.get("/api/stack.png", params={"ra": 1, "dec": 1, "epoch": "E1", "detector": "D9"})
    assert r.status_code == 400


def test_cors_header(client):
    r = client.get("/api/targets", headers={"Origin": "http://localhost:5173"})
    assert r.headers.get("access-control-allow-origin") in ("*", "http://localhost:5173")


def test_stack_frames_cap(monkeypatch):
    from app import imaging
    monkeypatch.setattr(config, "STACK_MAX_FRAMES", 24)
    frames = [{"id": f"f{i}", "mjd": 60000 + i, "detector": f"D{i % 6 + 1}"} for i in range(120)]
    sel = imaging.stack_frames(frames, "ALL")
    assert len(sel) == 24
    assert sel[0]["id"] == "f0" and sel[-1]["id"] == "f119"       # cubre toda la época
    assert len({f["detector"] for f in sel}) == 6                  # ALL mezcla detectores
    assert len(imaging.stack_frames(frames, "D5")) == 20            # 20 <= tope: entran todos


def test_target_motion_arrow():
    t = targets.get("wise0855")
    ra, dec = targets.position(t)
    m = targets.motion(t)
    assert 8.0 < m["arcsec_per_year"] < 8.3          # ~8.1"/año
    assert m["to_ra_deg"] < ra                        # se mueve hacia el oeste (RA decrece)
    dist = ((m["to_ra_deg"] - ra) * 0.9920) ** 2 + (m["to_dec_deg"] - dec) ** 2
    assert 75 < dist ** 0.5 * 3600 < 90               # ~81" en 10 años
