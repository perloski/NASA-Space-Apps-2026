"""Precalienta la caché de los objetivos del reto (regla 5). Correr antes de la demo:

    python -m app.precache               # todos los objetivos, FOV 10'
    python -m app.precache wise0855 --fov 15 --frames --photometry
"""
from __future__ import annotations

import argparse
import time

from . import gaia, imaging, photometry, spherex, targets
from .errors import ApiError
from .grid import Query


def warm(target_id: str, fov: float, do_frames: bool, do_phot: bool) -> None:
    t = targets.get(target_id)
    ra, dec = targets.position(t)
    q = Query.make(ra, dec, fov)
    t0 = time.time()
    frames = [dict(f) for f in spherex.find_frames(q.ra_deg, q.dec_deg)]
    if not frames:
        print(f"[{target_id}] sin cobertura SPHEREx")
        return
    _, epochs = spherex.group_epochs(frames)
    print(f"[{target_id}] {len(frames)} frames, {len(epochs)} épocas")
    gaia.overlay(q, epochs)
    dets = sorted({f["detector"] for f in frames}) + ["ALL"]
    for d in dets:
        for e in epochs:
            try:
                imaging.stack_array(epochs, q, e["id"], d)
            except ApiError as err:
                if err.code != "NO_COVERAGE":
                    print(f"  stack {e['id']}/{d}: {err.message}")
        print(f"  stacks {d} listos ({time.time() - t0:.0f}s)")
    if do_frames:
        _, complete = imaging.reproject_many(frames, q)
        if not complete:
            print("  (algunos frames fallaron por IRSA: volver a correr para completarlos)")
        print(f"  frames individuales listos ({time.time() - t0:.0f}s)")
    if do_phot:
        photometry.photometry(frames, q, 2.0)
        print(f"  fotometría lista ({time.time() - t0:.0f}s)")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("targets", nargs="*", default=[t["id"] for t in targets.TARGETS])
    ap.add_argument("--fov", type=float, default=10.0)
    ap.add_argument("--frames", action="store_true", help="también reproyectar cada frame individual")
    ap.add_argument("--photometry", action="store_true")
    a = ap.parse_args()
    for tid in a.targets:
        warm(tid, a.fov, a.frames, a.photometry)


if __name__ == "__main__":
    main()
