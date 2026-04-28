#!/usr/bin/env python3
"""
Extract Doodle Images Script
Crops individual doodles from reference image and removes white backgrounds.

Usage:
  python3 extract_doodles.py <input_image_path>

Example:
  python3 extract_doodles.py reference.png
"""

import sys
import os
from pathlib import Path
from PIL import Image
import numpy as np
from typing import Tuple, List

# ── Configuration ──────────────────────────────────────────────────────────────

OUTPUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "doodles"
DOODLE_NAMES = ["blue-bird", "pink-bird", "blue-flower", "pink-flower", "leaf"]

# Color ranges for white background detection (RGB)
WHITE_THRESHOLD = 240  # Pixels with all channels > 240 are considered "white"
ALPHA_THRESHOLD = 200  # Transparency threshold for edge smoothing

# ── Utility Functions ──────────────────────────────────────────────────────────

def is_white(pixel: Tuple[int, int, int], threshold: int = WHITE_THRESHOLD) -> bool:
    """Check if pixel is white (used for background removal)."""
    r, g, b = pixel[:3]
    return r > threshold and g > threshold and b > threshold


def find_doodles(image: Image.Image) -> List[Tuple[int, int, int, int]]:
    """
    Find bounding boxes of individual doodles by detecting non-white regions.
    Returns list of (x1, y1, x2, y2) bounding boxes.
    """
    arr = np.array(image.convert("RGB"))
    
    # Create mask: True where pixel is NOT white
    is_nonwhite = ~np.all(arr > WHITE_THRESHOLD, axis=2)
    
    if not is_nonwhite.any():
        print("⚠️  No non-white pixels found. Check image and WHITE_THRESHOLD.")
        return []
    
    # Find rows/cols with content
    rows_with_content = np.where(is_nonwhite.any(axis=1))[0]
    cols_with_content = np.where(is_nonwhite.any(axis=0))[0]
    
    if len(rows_with_content) == 0 or len(cols_with_content) == 0:
        return []
    
    # Global bounding box
    y_min, y_max = rows_with_content[0], rows_with_content[-1]
    x_min, x_max = cols_with_content[0], cols_with_content[-1]
    
    # Expand slightly for padding
    padding = 10
    y_min = max(0, y_min - padding)
    y_max = min(image.height, y_max + padding)
    x_min = max(0, x_min - padding)
    x_max = min(image.width, x_max + padding)
    
    # Split horizontally and vertically to find individual doodles
    # This is a simple heuristic: look for vertical and horizontal gaps
    
    # Analyze vertical gaps (separate left/right doodles)
    cols_empty = ~np.any(is_nonwhite[:, x_min:x_max], axis=0)
    col_gaps = []
    in_gap = False
    for i, empty in enumerate(cols_empty, start=x_min):
        if empty and not in_gap:
            gap_start = i
            in_gap = True
        elif not empty and in_gap:
            col_gaps.append((gap_start, i))
            in_gap = False
    
    # Analyze horizontal gaps (separate top/bottom doodles)
    rows_empty = ~np.any(is_nonwhite[y_min:y_max, :], axis=1)
    row_gaps = []
    in_gap = False
    for i, empty in enumerate(rows_empty, start=y_min):
        if empty and not in_gap:
            gap_start = i
            in_gap = True
        elif not empty and in_gap:
            row_gaps.append((gap_start, i))
            in_gap = False
    
    # Create bounding boxes for top and bottom sections
    bboxes = []
    
    # Top section (2 birds)
    if row_gaps:
        top_y_max = row_gaps[0][0]
    else:
        top_y_max = (y_min + y_max) // 2
    
    # Bottom section (2 flowers + leaf)
    if row_gaps:
        bottom_y_min = row_gaps[0][1]
    else:
        bottom_y_min = (y_min + y_max) // 2
    
    # Divide top section horizontally
    if col_gaps:
        left_x_max = col_gaps[0][0]
        right_x_min = col_gaps[0][1]
    else:
        left_x_max = (x_min + x_max) // 2
        right_x_min = left_x_max
    
    # Top-left (blue bird)
    bboxes.append((x_min, y_min, left_x_max, top_y_max))
    
    # Top-right (pink bird)
    bboxes.append((right_x_min, y_min, x_max, top_y_max))
    
    # Bottom section - find 3 doodles
    # Simple approach: divide bottom section into 3 parts
    bottom_width = x_max - x_min
    bottom_section_width = bottom_width // 3
    
    # Bottom-left (blue flower)
    bboxes.append((x_min, bottom_y_min, x_min + bottom_section_width, y_max))
    
    # Bottom-middle (pink flower)
    bboxes.append((x_min + bottom_section_width, bottom_y_min, x_min + 2 * bottom_section_width, y_max))
    
    # Bottom-right (leaf)
    bboxes.append((x_min + 2 * bottom_section_width, bottom_y_min, x_max, y_max))
    
    return bboxes


def remove_white_background(image: Image.Image) -> Image.Image:
    """
    Remove white background and convert to transparent PNG.
    """
    # Convert to RGBA if needed
    if image.mode != "RGBA":
        image = image.convert("RGBA")
    
    data = image.getdata()
    new_data = []
    
    for item in data:
        r, g, b, a = item[0], item[1], item[2], item[3] if len(item) > 3 else 255
        
        # Check if pixel is white
        if r > WHITE_THRESHOLD and g > WHITE_THRESHOLD and b > WHITE_THRESHOLD:
            # Make fully transparent
            new_data.append((r, g, b, 0))
        else:
            # Keep the pixel but ensure alpha is visible
            new_data.append((r, g, b, 255))
    
    image.putdata(new_data)
    return image


def crop_and_clean_doodle(image: Image.Image, bbox: Tuple[int, int, int, int]) -> Image.Image:
    """
    Crop doodle from bounding box and remove white background.
    """
    x1, y1, x2, y2 = bbox
    
    # Crop
    cropped = image.crop((x1, y1, x2, y2))
    
    # Remove white background
    cleaned = remove_white_background(cropped)
    
    return cleaned


def auto_trim_whitespace(image: Image.Image, margin: int = 5) -> Image.Image:
    """
    Automatically crop transparent/white borders around the image.
    """
    if image.mode != "RGBA":
        image = image.convert("RGBA")
    
    bbox = image.getbbox()  # Bounding box of non-transparent pixels
    
    if bbox is None:
        return image
    
    x1, y1, x2, y2 = bbox
    
    # Add margin
    x1 = max(0, x1 - margin)
    y1 = max(0, y1 - margin)
    x2 = min(image.width, x2 + margin)
    y2 = min(image.height, y2 + margin)
    
    return image.crop((x1, y1, x2, y2))


# ── Main Script ────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 extract_doodles.py <input_image_path>")
        print("\nExample: python3 extract_doodles.py reference.png")
        sys.exit(1)
    
    input_path = Path(sys.argv[1])
    
    # Validate input
    if not input_path.exists():
        print(f"❌ Error: File not found: {input_path}")
        sys.exit(1)
    
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"📁 Output directory: {OUTPUT_DIR}")
    
    # Load image
    print(f"📷 Loading image: {input_path}")
    try:
        image = Image.open(input_path)
        print(f"   Size: {image.size}, Mode: {image.mode}")
    except Exception as e:
        print(f"❌ Error loading image: {e}")
        sys.exit(1)
    
    # Find doodles
    print("\n🔍 Finding doodles...")
    bboxes = find_doodles(image)
    
    if not bboxes:
        print("❌ No doodles found. Adjust WHITE_THRESHOLD if needed.")
        sys.exit(1)
    
    print(f"✅ Found {len(bboxes)} doodles")
    
    # Process each doodle
    print("\n✂️  Cropping and cleaning doodles...\n")
    
    for idx, (bbox, name) in enumerate(zip(bboxes, DOODLE_NAMES[:len(bboxes)]), 1):
        x1, y1, x2, y2 = bbox
        print(f"{idx}. Processing '{name}' → bbox {bbox}")
        
        try:
            # Crop and clean
            doodle = crop_and_clean_doodle(image, bbox)
            
            # Auto-trim whitespace
            doodle = auto_trim_whitespace(doodle, margin=3)
            
            # Save
            output_path = OUTPUT_DIR / f"{name}.png"
            doodle.save(output_path, "PNG", optimize=True)
            
            file_size_kb = output_path.stat().st_size / 1024
            print(f"   ✅ Saved: {output_path} ({file_size_kb:.1f} KB)")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # Validate output
    print("\n📋 Validation Report:")
    print("─" * 60)
    
    expected_files = [f"{name}.png" for name in DOODLE_NAMES]
    found_files = [f.name for f in OUTPUT_DIR.glob("*.png")]
    
    all_present = all(f in found_files for f in expected_files)
    
    for name in DOODLE_NAMES:
        file_path = OUTPUT_DIR / f"{name}.png"
        if file_path.exists():
            size = file_path.stat().st_size
            size_kb = size / 1024
            # Verify it's a valid PNG
            try:
                img = Image.open(file_path)
                mode = img.mode
                dimensions = img.size
                print(f"✅ {name:20} | {size_kb:6.1f} KB | {mode:6} | {dimensions}")
            except Exception as e:
                print(f"❌ {name:20} | Invalid image: {e}")
        else:
            print(f"❌ {name:20} | NOT FOUND")
    
    print("─" * 60)
    
    if all_present:
        print("\n🎉 SUCCESS! All doodles extracted and saved.")
        print(f"   Location: {OUTPUT_DIR}")
        return 0
    else:
        print("\n⚠️  Some files are missing. Check output above.")
        return 1


if __name__ == "__main__":
    exit(main())
