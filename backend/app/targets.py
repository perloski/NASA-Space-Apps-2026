"""Objetivos del reto, con coordenadas propagadas por movimiento propio (regla 2).

Valores de referencia tomados de SIMBAD / Gaia DR3 / literatura. VERIFICAR antes de la demo:
si un objetivo aparece corrido en las imágenes, revisar ref_epoch y el movimiento propio acá.
"""
from __future__ import annotations

from astropy.time import Time

from . import config
from .gaia import propagate

TARGETS = [
    {
        "id": "barnard",
        "name": "Barnard's Star",
        "kind": "star",
        "description": "Estrella con el mayor movimiento propio conocido (~10.4″/año).",
        # Gaia DR3 (época 2016.0)
        "ref": {"ra_deg": 269.44850252, "dec_deg": 4.73942005, "epoch": "J2016.0",
                "pmra_mas_yr": -801.551, "pmdec_mas_yr": 10362.394, "parallax_mas": 546.976},
    },
    {
        "id": "epsindib",
        "name": "Epsilon Indi B",
        "kind": "brown_dwarf_binary",
        "description": "Par de enanas marrones (Ba/Bb) orbitando la estrella Epsilon Indi A.",
        # SIMBAD (J2000) + movimiento propio de Eps Ind A/B
        "ref": {"ra_deg": 331.04383, "dec_deg": -56.78269, "epoch": "J2000.0",
                "pmra_mas_yr": 3982.0, "pmdec_mas_yr": -2470.0, "parallax_mas": 274.8},
    },
    {
        "id": "wise0855",
        "name": "WISE 0855",
        "kind": "brown_dwarf",
        "description": "Enana marrón muy fría (~250 K) y rápida (~8″/año).",
        # Coordenadas del enunciado (08h55m10.831s −07°14′42.53″). Corresponden a la posición
        # AllWISE (época ~2010.5); pm y paralaje de Luhman & Esplin (2016).
        "ref": {"ra_deg": 133.7951292, "dec_deg": -7.2451472, "epoch": "J2010.5",
                "pmra_mas_yr": -8118.0, "pmdec_mas_yr": 673.0, "parallax_mas": 449.0},
    },
    {
        "id": "rwaur",
        "name": "RW Aurigae",
        "kind": "variable_star",
        "description": "Estrella T Tauri joven con variabilidad irregular.",
        "ref": {"ra_deg": 76.9564083, "dec_deg": 30.4014083, "epoch": "J2000.0",
                "pmra_mas_yr": 3.6, "pmdec_mas_yr": -24.0, "parallax_mas": 5.4},
    },
    {
        "id": "rdra",
        "name": "R Draconis",
        "kind": "variable_star",
        "description": "Variable Mira de período ~246 días.",
        "ref": {"ra_deg": 248.1673750, "dec_deg": 66.7549722, "epoch": "J2000.0",
                "pmra_mas_yr": -15.5, "pmdec_mas_yr": 28.7, "parallax_mas": 2.4},
    },
]

_BY_ID = {t["id"]: t for t in TARGETS}


def _parse_epoch(s: str) -> Time:
    return Time(float(s.lstrip("J")), format="jyear")


def position(target: dict, epoch: str = config.TARGET_EPOCH) -> tuple[float, float]:
    r = target["ref"]
    (ra, dec), = propagate(r["ra_deg"], r["dec_deg"], r["pmra_mas_yr"], r["pmdec_mas_yr"],
                           r["parallax_mas"], _parse_epoch(r["epoch"]), [_parse_epoch(epoch)])
    return round(float(ra[0]), 6), round(float(dec[0]), 6)


ARROW_YEARS = 10


def motion(target: dict, epoch: str = config.TARGET_EPOCH) -> dict:
    """Hacia dónde se mueve el objetivo: velocidad en el cielo y su posición dentro de ARROW_YEARS
    años (el front dibuja una flecha desde la posición actual hasta ahí)."""
    r = target["ref"]
    t0 = _parse_epoch(epoch)
    t1 = Time(t0.jyear + ARROW_YEARS, format="jyear")
    (ra, dec), = propagate(r["ra_deg"], r["dec_deg"], r["pmra_mas_yr"], r["pmdec_mas_yr"],
                           r["parallax_mas"], _parse_epoch(r["epoch"]), [t1])
    speed = (r["pmra_mas_yr"] ** 2 + r["pmdec_mas_yr"] ** 2) ** 0.5 / 1000.0
    return {"arcsec_per_year": round(speed, 3), "arrow_years": ARROW_YEARS,
            "to_ra_deg": round(float(ra[0]), 6), "to_dec_deg": round(float(dec[0]), 6)}


def get(target_id: str) -> dict | None:
    return _BY_ID.get(target_id.lower().replace(" ", "").replace("_", ""))


def listing() -> dict:
    out = []
    for t in TARGETS:
        ra, dec = position(t)
        out.append({
            "id": t["id"], "name": t["name"], "kind": t["kind"], "description": t["description"],
            "ra_deg": ra, "dec_deg": dec, "coord_epoch": config.TARGET_EPOCH,
            "ref": t["ref"],
            "motion": motion(t),
            "sky_url": f"/api/sky?target={t['id']}",
        })
    return {"schema_version": config.SCHEMA_VERSION, "coord_epoch": config.TARGET_EPOCH, "targets": out}
