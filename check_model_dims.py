"""
check_model_dims.py (v2) — audit GLB model sizes against products.json

v2: the GLB library is mixed-unit (most models in mm, newer granite modules
in m). Units are now auto-detected per file, so only REAL problems are
flagged: zero/missing catalogue dims and genuine mismatches. For every
flagged row a suggested products.json entry (measured from the model) is
printed and written to the CSV.

Run from the repository root:  python check_model_dims.py
Output: terminal table + model_dims_report.csv
"""

import csv
import json
import sys
from pathlib import Path

try:
    import trimesh
except ImportError:
    sys.exit("trimesh is not installed. Run:  pip install trimesh numpy")

REPO = Path(__file__).resolve().parent
PRODUCTS = REPO / "src" / "lib" / "data" / "products.json"
MODELS = REPO / "static" / "models"
REPORT = REPO / "model_dims_report.csv"

FLAG_FACTOR = 1.5   # >50% off on any axis counts as a mismatch
PLAUSIBLE_CM = (8, 3000)  # a module axis is between 8 cm and 30 m


def load_products():
    data = json.loads(PRODUCTS.read_text(encoding="utf-8"))
    items = data if isinstance(data, list) else data.get("products", data)
    by_sku = {}
    for p in items:
        dims = p.get("dimensions") or {}
        by_sku[p["sku"]] = {
            "name": p.get("name", ""),
            "cat_w": float(dims.get("width") or 0),
            "cat_d": float(dims.get("length") or 0),
            "cat_h": float(dims.get("height") or 0),
        }
    return by_sku


def model_bbox_cm(glb_path):
    """Bounding box in cm with per-file unit auto-detection (mm/cm/m)."""
    scene = trimesh.load(str(glb_path), force="scene")
    lo, hi = scene.bounds
    raw = hi - lo  # (x, y, z) in the file's native unit
    best = None
    for unit, factor in (("m", 100.0), ("cm", 1.0), ("mm", 0.1)):
        dims = [v * factor for v in raw]
        if PLAUSIBLE_CM[0] <= max(dims) <= PLAUSIBLE_CM[1]:
            best = (unit, dims)
            break  # order of preference: m (glTF standard), then cm, then mm
    if best is None:  # nothing plausible — report meters and flag it
        best = ("?", [v * 100.0 for v in raw])
    unit, (x, y, z) = best
    # planner convention: width = X, depth = Z, height = Y
    return unit, x, z, y


def ratio(a, b):
    if a <= 0 or b <= 0:
        return float("inf")
    return max(a, b) / min(a, b)


def main():
    products = load_products()
    rows = []
    for glb in sorted(MODELS.glob("*.glb")):
        sku = glb.stem
        p = products.get(sku)
        try:
            unit, mw, md, mh = model_bbox_cm(glb)
        except Exception as exc:
            rows.append([sku, p["name"] if p else "?", "", "", "", "", "", "", "", f"READ ERROR: {exc}", ""])
            continue
        suggestion = f'width "{mw:.0f}", length "{md:.0f}", height "{mh:.0f}"'
        if p is None:
            rows.append([sku, "(not in products.json)", unit, f"{mw:.0f}", f"{md:.0f}", f"{mh:.0f}",
                         "", "", "", "NO CATALOGUE ENTRY", suggestion])
            continue

        flags = []
        if unit == "?":
            flags.append("UNKNOWN UNITS")
        if p["cat_w"] <= 1 or p["cat_d"] <= 1 or p["cat_h"] <= 1:
            flags.append("ZERO DIMS")
        else:
            worst = max(ratio(mw, p["cat_w"]), ratio(md, p["cat_d"]), ratio(mh, p["cat_h"]))
            if worst > FLAG_FACTOR:
                flags.append(f"MISMATCH x{worst:.1f}")
        rows.append([
            sku, p["name"], unit,
            f"{mw:.0f}", f"{md:.0f}", f"{mh:.0f}",
            f"{p['cat_w']:.0f}", f"{p['cat_d']:.0f}", f"{p['cat_h']:.0f}",
            " ".join(flags),
            suggestion if flags else "",
        ])

    header = ["SKU", "Name", "model unit", "model W cm", "model D cm", "model H cm",
              "catalogue W", "catalogue D", "catalogue H", "flag", "suggested dims (from model)"]
    with REPORT.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh, delimiter=";")
        w.writerow(header)
        w.writerows(rows)

    flagged = [r for r in rows if r[9]]
    print(f"{len(rows)} models checked, {len(flagged)} flagged  ->  {REPORT.name}\n")
    fmt = "{:<8} {:<34} {:>3} {:>6} {:>6} {:>6} | {:>5} {:>5} {:>5}  {:<16} {}"
    print(fmt.format("SKU", "Name", "u", "modW", "modD", "modH", "catW", "catD", "catH", "flag", "suggested"))
    for r in flagged:
        print(fmt.format(r[0], r[1][:34], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10]))


if __name__ == "__main__":
    main()