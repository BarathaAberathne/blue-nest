#!/usr/bin/env python3
"""
🎨 Doodle Tight Cropper - Manual Grid-Based Extraction
Divides image into grid, finds content in each cell, crops tightly.
"""

import sys
from pathlib import Path
from PIL import Image
import numpy as np
from typing import Tuple

OUTPUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "doodles"
WHITE_THRESHOLD = 245

class TightDoodleCropper:
    """Extract doodles with tight cropping."""
    
    def __init__(self, image_path: Path):
        self.image_path = Path(image_path)
        self.image = None
        self.load_image()
    
    def load_image(self):
        """Load image."""
        if not self.image_path.exists():
            print(f"❌ File not found: {self.image_path}")
            sys.exit(1)
        
        try:
            self.image = Image.open(self.image_path)
            self.image.load()
            print(f"✅ Image loaded: {self.image.size}")
        except Exception as e:
            print(f"❌ Error: {e}")
            sys.exit(1)
    
    def find_content_bounds(self, region: Tuple[int, int, int, int]) -> Tuple[int, int, int, int]:
        """Find tight bounds of non-white content in a region."""
        x1, y1, x2, y2 = region
        
        # Extract region
        crop = self.image.crop((x1, y1, x2, y2))
        arr = np.array(crop.convert("RGB"))
        
        # Find non-white pixels
        is_nonwhite = np.any(arr <= WHITE_THRESHOLD, axis=2)
        
        if not is_nonwhite.any():
            return region  # Return original if no content
        
        # Find bounds
        rows, cols = np.where(is_nonwhite)
        y_min, y_max = rows.min(), rows.max()
        x_min, x_max = cols.min(), cols.max()
        
        # Add tiny padding
        padding = 4
        y_min = max(0, y_min - padding)
        y_max = min(crop.height, y_max + padding)
        x_min = max(0, x_min - padding)
        x_max = min(crop.width, x_max + padding)
        
        # Convert back to original image coordinates
        return (x1 + x_min, y1 + y_min, x1 + x_max, y1 + y_max)
    
    def extract_grid_based(self):
        """Extract using manual grid layout."""
        w, h = self.image.size
        
        # Define grid regions
        # Layout: [bird] [bird]
        #         [flower] [flower] [leaf]
        
        regions = {
            "blue-bird": (0, 0, w // 2, h // 2),
            "pink-bird": (w // 2, 0, w, h // 2),
            "blue-flower": (0, h // 2, w // 3, h),
            "pink-flower": (w // 3, h // 2, 2 * w // 3, h),
            "leaf": (2 * w // 3, h // 2, w, h),
        }
        
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        
        print("\n✂️  Extracting doodles with tight crops...\n")
        
        for name, (x1, y1, x2, y2) in regions.items():
            try:
                # Find tight bounds
                tight_bbox = self.find_content_bounds((x1, y1, x2, y2))
                tx1, ty1, tx2, ty2 = tight_bbox
                
                # Crop tightly
                doodle = self.image.crop((tx1, ty1, tx2, ty2))
                
                # Remove white background
                doodle = self.remove_white_bg(doodle)
                
                # Save
                output_path = OUTPUT_DIR / f"{name}.png"
                doodle.save(output_path, "PNG", optimize=True)
                
                size_kb = output_path.stat().st_size / 1024
                dims = doodle.size
                
                print(f"✅ {name:20} | {dims[0]:3}×{dims[1]:3} px | {size_kb:6.1f} KB")
                
            except Exception as e:
                print(f"❌ {name:20} | Error: {e}")
    
    def remove_white_bg(self, img: Image.Image) -> Image.Image:
        """Convert white background to transparency."""
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        
        data = list(img.getdata())
        new_data = []
        
        for r, g, b, a in [(p[0], p[1], p[2], p[3] if len(p) > 3 else 255) for p in data]:
            if r > WHITE_THRESHOLD and g > WHITE_THRESHOLD and b > WHITE_THRESHOLD:
                new_data.append((r, g, b, 0))
            else:
                new_data.append((r, g, b, 255))
        
        img.putdata(new_data)
        return img


def main():
    """Main entry point."""
    print("\n" + "=" * 70)
    print("🎨 Tight Doodle Cropper")
    print("=" * 70)
    
    if len(sys.argv) < 2:
        print("\n📖 Usage: python3 crop_tight.py <image_path>")
        sys.exit(1)
    
    cropper = TightDoodleCropper(sys.argv[1])
    cropper.extract_grid_based()
    
    # Validation
    print("\n" + "=" * 70)
    print("📋 Validation")
    print("=" * 70)
    
    for file in sorted(OUTPUT_DIR.glob("*.png")):
        try:
            img = Image.open(file)
            size_kb = file.stat().st_size / 1024
            print(f"✅ {file.name:25} | {img.size[0]:3}×{img.size[1]:3} | {size_kb:6.1f} KB")
        except Exception as e:
            print(f"❌ {file.name:25} | Error: {e}")
    
    print("\n" + "=" * 70)
    print("✅ EXTRACTION COMPLETE!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
