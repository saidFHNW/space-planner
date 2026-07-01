#!/usr/bin/env python3
"""
rename_models.py

Copies Vertical Technik .glb files into static/models/ renamed to <SKU>.glb
(e.g. "K00879 Wheelie Table 300 3m Granit.glb" -> "K00879.glb").

HOW TO RUN:
  1. Edit the SOURCE line below to point at the folder holding your original .glb files.
  2. Open a terminal IN your project root (the folder that contains the "static" folder).
  3. Run:  python rename_models.py

It COPIES (does not move), so your originals stay untouched as a backup.
"""

import re
import shutil
from pathlib import Path

# --- EDIT THIS to your unzipped .glb folder ---
SOURCE = Path(r"C:\Users\saidf\Documents\fhnw\6_Semester\bachelorThesis\glb files\tmp_said")
TARGET = Path("static/models")

TARGET.mkdir(parents=True, exist_ok=True)

kept: dict[str, str] = {}
skipped: list[str] = []

# sorted() so the duplicate "keep first" rule matches products.json
for file in sorted(SOURCE.glob("*.glb"), key=lambda p: p.name):
    match = re.match(r"(K\d+)", file.name)
    if not match:
        print(f"No SKU in name, skipped: {file.name}")
        continue

    sku = match.group(1)
    if sku in kept:
        skipped.append(f"{sku}  ->  skipped duplicate: {file.name}")
        continue

    shutil.copy2(file, TARGET / f"{sku}.glb")
    kept[sku] = file.name

print(f"\nCopied {len(kept)} files to {TARGET}")
if skipped:
    print("\nDuplicate SKUs skipped (the first one alphabetically was kept):")
    for line in skipped:
        print(f"  {line}")
