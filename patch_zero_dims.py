"""
patch_zero_dims.py — write measured model dimensions into products.json
for the 23 SKUs whose WooCommerce data has zero/near-zero dimensions.

Values were measured from the GLB models (bounding box, meter-authored
files) with check_model_dims.py on 2026-08-01. They are PROVISIONAL until
Vertical Technik confirms the dimensions via the VT_Modul_Review.xlsx.

The patch is surgical (string replacement per SKU), so the git diff shows
only the changed dimension lines. Run from the repository root:

    python patch_zero_dims.py
"""

import json
import re
import sys
from pathlib import Path

PRODUCTS = Path(__file__).resolve().parent / "src" / "lib" / "data" / "products.json"

# SKU: (width_cm, depth_cm=length, height_cm) — measured from the GLB bbox
MEASURED = {
    "K00747": (15, 100, 10),     # Parking Block
    "K00831": (150, 328, 35),    # A-Frame
    "K00834": (310, 81, 38),     # Granit Curved Curb
    "K00835": (300, 253, 80),    # Granit Bank
    "K00836": (300, 292, 50),    # Granit Bank Curb
    "K00837": (150, 164, 35),    # Granit Kicker
    "K00838": (240, 120, 20),    # Manual Pad
    "K00840": (300, 181, 41),    # Granite Spine
    "K00842": (300, 6, 60),      # Granit Rail
    "K00843": (239, 350, 40),    # Step Curb 3
    "K00844": (239, 480, 40),    # Step Curb 4
    "K00906": (327, 323, 560),   # Planter 1 Tree (height incl. tree)
    "K00907": (728, 335, 560),   # Planter 3 Trees (height incl. trees)
    "K01434": (120, 470, 40),    # Granit Manual table 400 x 4700
    "K01537": (299, 50, 40),     # Sitzbank aus Granit 3m
    "K01553": (169, 480, 40),    # Step Curb 5
    "K01554": (100, 480, 40),    # Step Curb 6
    "K01597": (300, 50, 35),     # Granit Stone Ledge 350 500x3000
    "K02004": (240, 670, 50),    # Granite Wheelie Table combo 300-500
    "K02075": (300, 300, 40),    # Granite Wheelie Table round 400 200 300
    "K02082": (15, 200, 10),     # Parking Block 2m
    "K02085": (83, 470, 35),     # Granite Wheelie Table 350 x 800 x 4700
    "K02086": (80, 350, 20),     # Granite Wheelie Table 200 x 800 x 3500
}


def main():
    raw = PRODUCTS.read_text(encoding="utf-8")
    patched = 0
    for sku, (w, d, h) in MEASURED.items():
        # Match this SKU's object up to its dimensions block, keep everything
        # before the block, replace only the inner key values.
        pattern = re.compile(
            r'("sku": "' + sku + r'"[\s\S]*?"dimensions": \{)[\s\S]*?(\})'
        )
        m = pattern.search(raw)
        if not m:
            print(f"WARNING: {sku} not found or has no dimensions block")
            continue
        # Preserve the file's indentation style (6 spaces inside dimensions)
        replacement = (
            m.group(1)
            + f'\n      "length": "{d}",\n      "width": "{w}",\n      "height": "{h}"\n    '
            + m.group(2)
        )
        raw = raw[: m.start()] + replacement + raw[m.end() :]
        patched += 1

    json.loads(raw)  # sanity: still valid JSON
    PRODUCTS.write_text(raw, encoding="utf-8")
    print(f"{patched}/{len(MEASURED)} entries patched in {PRODUCTS}")
    print("Review with:  git --no-pager diff src/lib/data/products.json")


if __name__ == "__main__":
    main()