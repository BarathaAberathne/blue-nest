#!/usr/bin/env python3
"""
Crops a 2-column × 3-row illustration sheet into 6 separate PNGs,
removes the background from each, and saves them to the target directory.

Usage:
    python3 scripts/crop_breaks.py
"""

from pathlib import Path
from PIL import Image
from rembg import remove

SRC  = Path("frontend/public/site-images/breaks/source.png")
OUT  = Path("frontend/public/site-images/breaks")
COLS = 2
ROWS = 3

def main() -> None:
    if not SRC.exists():
        raise FileNotFoundError(
            f"Source image not found at {SRC}\n"
            "Please save the sheet as frontend/public/site-images/breaks/source.png"
        )

    img = Image.open(SRC).convert("RGBA")
    w, h = img.size
    print(f"Opened {SRC.name}  {w}×{h}px")

    cell_w = w // COLS
    cell_h = h // ROWS

    index = 1
    for row in range(ROWS):
        for col in range(COLS):
            x0 = col * cell_w
            y0 = row * cell_h
            x1 = x0 + cell_w
            y1 = y0 + cell_h

            tile = img.crop((x0, y0, x1, y1))

            print(f"  [{index}] removing background …", end=" ", flush=True)
            tile_no_bg = remove(tile)
            print("done")

            dest = OUT / f"break-{index:02d}.png"
            tile_no_bg.save(dest, "PNG", optimize=True)
            print(f"       saved → {dest.name}  ({tile.size[0]}×{tile.size[1]}px)")

            index += 1

    print(f"\n✓  {ROWS * COLS} PNGs written to {OUT}/")


if __name__ == "__main__":
    main()
