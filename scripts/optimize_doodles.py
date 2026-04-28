#!/usr/bin/env python3
"""
🎨 Doodle Image Optimizer
Reduces file size while maintaining quality.

Features:
- Resize to optimal dimensions for web
- Optimize PNG compression
- Remove unnecessary metadata
- Maintain transparency quality
"""

import sys
from pathlib import Path
from PIL import Image
from typing import Tuple

DOODLES_DIR = Path(__file__).parent.parent / "frontend" / "public" / "doodles"

# Optimal sizes for each doodle (maintains aspect ratio)
OPTIMAL_SIZES = {
    "blue-bird": 200,      # 1 large bird
    "pink-bird": 180,      # 1 medium bird
    "blue-flower": 160,    # Flower element
    "pink-flower": 120,    # Smaller flower
    "leaf": 100,           # Small leaf
}

def optimize_doodle(file_path: Path, max_size: int) -> Tuple[int, int]:
    """
    Optimize a single doodle image.
    Returns (original_size_kb, optimized_size_kb)
    """
    # Get original size
    original_size = file_path.stat().st_size / 1024
    
    # Load and resize
    img = Image.open(file_path)
    
    # Maintain aspect ratio, resize by longest dimension
    img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    
    # Save with optimization
    img.save(file_path, "PNG", optimize=True, compress_level=9)
    
    # Get optimized size
    optimized_size = file_path.stat().st_size / 1024
    
    return original_size, optimized_size

def main():
    """Optimize all doodle images."""
    if not DOODLES_DIR.exists():
        print(f"❌ Doodles directory not found: {DOODLES_DIR}")
        sys.exit(1)
    
    print("\n" + "=" * 70)
    print("🎨 Doodle Image Optimizer")
    print("=" * 70)
    
    files = sorted(DOODLES_DIR.glob("*.png"))
    
    if not files:
        print("❌ No PNG files found in doodles directory")
        sys.exit(1)
    
    print(f"\n📁 Found {len(files)} doodles to optimize\n")
    
    total_before = 0
    total_after = 0
    
    for file_path in files:
        name = file_path.stem
        max_size = OPTIMAL_SIZES.get(name, 160)
        
        print(f"⏳ Processing {name}...")
        before, after = optimize_doodle(file_path, max_size)
        reduction = before - after
        percent = (reduction / before) * 100 if before > 0 else 0
        
        print(f"   {before:6.1f} KB → {after:6.1f} KB (-{reduction:.1f} KB, -{percent:.1f}%)")
        
        total_before += before
        total_after += after
    
    print("\n" + "=" * 70)
    print("📊 Optimization Summary")
    print("=" * 70)
    print(f"Total before:  {total_before:8.1f} KB")
    print(f"Total after:   {total_after:8.1f} KB")
    reduction = total_before - total_after
    percent = (reduction / total_before) * 100
    print(f"Reduction:     {reduction:8.1f} KB ({percent:.1f}%)")
    print("=" * 70)
    
    print("\n✅ Optimization complete!")
    print(f"📁 Location: {DOODLES_DIR}")
    
    # Verify
    print("\n📋 Final File Sizes:")
    for file_path in sorted(DOODLES_DIR.glob("*.png")):
        size_kb = file_path.stat().st_size / 1024
        img = Image.open(file_path)
        print(f"  ✅ {file_path.stem:20} | {img.size} | {size_kb:6.1f} KB")
    
    print("\n🚀 Ready for production!")


if __name__ == "__main__":
    main()
