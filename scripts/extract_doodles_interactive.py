#!/usr/bin/env python3
"""
Interactive Doodle Extraction Tool
Guides you through extracting and cleaning doodle images.
"""

import sys
import os
from pathlib import Path
from PIL import Image
import numpy as np
from typing import Tuple, List

OUTPUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "doodles"
WHITE_THRESHOLD = 240

def remove_white_background(image: Image.Image) -> Image.Image:
    """Remove white background and convert to transparent PNG."""
    if image.mode != "RGBA":
        image = image.convert("RGBA")
    
    data = image.getdata()
    new_data = []
    
    for item in data:
        r, g, b = item[0], item[1], item[2]
        
        if r > WHITE_THRESHOLD and g > WHITE_THRESHOLD and b > WHITE_THRESHOLD:
            new_data.append((r, g, b, 0))
        else:
            new_data.append((r, g, b, 255))
    
    image.putdata(new_data)
    return image

def auto_trim_whitespace(image: Image.Image, margin: int = 5) -> Image.Image:
    """Automatically crop transparent borders."""
    if image.mode != "RGBA":
        image = image.convert("RGBA")
    
    bbox = image.getbbox()
    if bbox is None:
        return image
    
    x1, y1, x2, y2 = bbox
    x1 = max(0, x1 - margin)
    y1 = max(0, y1 - margin)
    x2 = min(image.width, x2 + margin)
    y2 = min(image.height, y2 + margin)
    
    return image.crop((x1, y1, x2, y2))

def extract_by_grid(image: Image.Image) -> dict:
    """
    Extract doodles using a 2x3 grid approach.
    Layout: [bird-blue] [bird-pink]
            [flower-blue] [flower-pink] [leaf]
    """
    width, height = image.size
    
    # Approximate grid
    col1 = width // 3
    col2 = 2 * width // 3
    row1 = height // 2
    
    bboxes = {
        "blue-bird": (0, 0, col1, row1),
        "pink-bird": (col1, 0, col2, row1),
        "blue-flower": (0, row1, col1, height),
        "pink-flower": (col1, row1, col2, height),
        "leaf": (col2, row1, width, height),
    }
    
    return bboxes

def interactive_extract():
    """Interactive extraction process."""
    print("\n" + "=" * 70)
    print("🎨 Blue Nest Doodle Extraction Tool")
    print("=" * 70)
    
    # Ask for input image
    while True:
        image_path = input("\nEnter path to reference image: ").strip()
        path = Path(image_path)
        
        if path.exists() and path.is_file():
            break
        print(f"❌ File not found: {image_path}")
    
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Load image
    print(f"\n📷 Loading image: {path}")
    try:
        image = Image.open(path)
        print(f"   Size: {image.width}x{image.height}, Mode: {image.mode}")
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    # Extract using grid
    print("\n✂️  Extracting doodles using grid layout...")
    bboxes = extract_by_grid(image)
    
    extracted = {}
    
    for name, bbox in bboxes.items():
        x1, y1, x2, y2 = bbox
        print(f"   • {name:20} → cropping...")
        
        try:
            # Crop
            doodle = image.crop(bbox)
            
            # Clean background
            doodle = remove_white_background(doodle)
            
            # Trim whitespace
            doodle = auto_trim_whitespace(doodle, margin=3)
            
            # Save
            output_path = OUTPUT_DIR / f"{name}.png"
            doodle.save(output_path, "PNG", optimize=True)
            
            file_size = output_path.stat().st_size / 1024
            print(f"      ✅ Saved: {output_path} ({file_size:.1f} KB)")
            
            extracted[name] = output_path
            
        except Exception as e:
            print(f"      ❌ Error: {e}")
    
    # Validation
    print("\n" + "=" * 70)
    print("📋 Validation Report")
    print("=" * 70)
    
    for name in ["blue-bird", "pink-bird", "blue-flower", "pink-flower", "leaf"]:
        file_path = OUTPUT_DIR / f"{name}.png"
        if file_path.exists():
            try:
                img = Image.open(file_path)
                size_kb = file_path.stat().st_size / 1024
                print(f"✅ {name:20} | {size_kb:6.1f} KB | {img.size} | {img.mode}")
            except Exception as e:
                print(f"❌ {name:20} | Invalid: {e}")
        else:
            print(f"❌ {name:20} | NOT FOUND")
    
    print("=" * 70)
    print("\n🎉 Extraction complete!")
    print(f"📁 All doodles saved to: {OUTPUT_DIR}\n")
    
    return 0

if __name__ == "__main__":
    sys.exit(interactive_extract())
