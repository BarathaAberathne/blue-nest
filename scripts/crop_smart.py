#!/usr/bin/env python3
"""
🎨 Smart Doodle Cropper - Tight, Intelligent Extraction
Crops each doodle element individually with proper bounds detection.
"""

import sys
from pathlib import Path
from PIL import Image
import numpy as np
from scipy import ndimage
from typing import List, Tuple

OUTPUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "doodles"
WHITE_THRESHOLD = 245

class SmartDoodleCropper:
    """Intelligently extract and crop individual doodles."""
    
    def __init__(self, image_path: Path):
        self.image_path = Path(image_path)
        self.image = None
        self.load_image()
    
    def load_image(self):
        """Load and validate image."""
        if not self.image_path.exists():
            print(f"❌ File not found: {self.image_path}")
            sys.exit(1)
        
        try:
            self.image = Image.open(self.image_path)
            self.image.load()
            print(f"✅ Image loaded: {self.image.size} ({self.image.mode})")
        except Exception as e:
            print(f"❌ Error: {e}")
            sys.exit(1)
    
    def find_individual_objects(self) -> List[Tuple[int, int, int, int]]:
        """
        Find individual doodle objects using connected component analysis.
        Returns list of bounding boxes for each object.
        """
        arr = np.array(self.image.convert("RGB"))
        
        # Create binary mask: non-white pixels
        is_nonwhite = np.any(arr <= WHITE_THRESHOLD, axis=2)
        
        # Label connected components
        labeled_array, num_features = ndimage.label(is_nonwhite)
        
        print(f"🔍 Found {num_features} potential objects")
        
        if num_features == 0:
            print("❌ No objects found")
            return []
        
        # Get bounding box for each object
        bboxes = []
        for i in range(1, num_features + 1):
            # Find pixels belonging to this object
            coords = np.where(labeled_array == i)
            
            if len(coords[0]) == 0:
                continue
            
            y_min, y_max = coords[0].min(), coords[0].max()
            x_min, x_max = coords[1].min(), coords[1].max()
            
            # Add small padding
            padding = 8
            y_min = max(0, y_min - padding)
            y_max = min(self.image.height, y_max + padding)
            x_min = max(0, x_min - padding)
            x_max = min(self.image.width, x_max + padding)
            
            width = x_max - x_min
            height = y_max - y_min
            area = width * height
            
            # Filter out very small objects (noise)
            if area > 500:  # Minimum area threshold
                bboxes.append((x_min, y_min, x_max, y_max, width, height, area))
        
        # Sort by area (largest first)
        bboxes.sort(key=lambda x: x[6], reverse=True)
        
        return [(x1, y1, x2, y2) for x1, y1, x2, y2, _, _, _ in bboxes]
    
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
    
    def auto_crop_tight(self, img: Image.Image) -> Image.Image:
        """Crop to exact content bounds."""
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        
        # Find bounding box of non-transparent pixels
        bbox = img.getbbox()
        if bbox is None:
            return img
        
        x1, y1, x2, y2 = bbox
        
        # Add minimal padding (2px)
        x1 = max(0, x1 - 2)
        y1 = max(0, y1 - 2)
        x2 = min(img.width, x2 + 2)
        y2 = min(img.height, y2 + 2)
        
        return img.crop((x1, y1, x2, y2))
    
    def assign_names(self, bboxes: List[Tuple[int, int, int, int]]) -> dict:
        """
        Intelligently assign names to doodles based on position.
        Expected layout: [birds on top] [flowers+leaf on bottom]
        """
        if len(bboxes) < 5:
            print(f"⚠️  Expected 5 doodles, found {len(bboxes)}")
        
        # Sort by Y position (top to bottom)
        by_y = sorted(enumerate(bboxes), key=lambda x: x[1][1])
        
        # Separate top and bottom
        mid_y = self.image.height // 2
        top_doodles = [(i, bbox) for i, bbox in by_y if bbox[1] < mid_y]
        bottom_doodles = [(i, bbox) for i, bbox in by_y if bbox[1] >= mid_y]
        
        # Sort each group by X position (left to right)
        top_doodles.sort(key=lambda x: x[1][0])
        bottom_doodles.sort(key=lambda x: x[1][0])
        
        # Assign names
        names = {}
        if len(top_doodles) >= 2:
            names[top_doodles[0][0]] = "blue-bird"
            names[top_doodles[1][0]] = "pink-bird"
        
        if len(bottom_doodles) >= 3:
            names[bottom_doodles[0][0]] = "blue-flower"
            names[bottom_doodles[1][0]] = "pink-flower"
            names[bottom_doodles[2][0]] = "leaf"
        
        return names
    
    def extract_all(self):
        """Extract and save all doodles."""
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        
        # Find objects
        print("\n🔍 Detecting individual doodles...")
        bboxes = self.find_individual_objects()
        
        if not bboxes or len(bboxes) < 5:
            print("❌ Could not find 5 distinct doodles")
            return False
        
        # Assign names
        names = self.assign_names(bboxes[:5])  # Use top 5 by area
        
        print("\n✂️  Cropping and saving...\n")
        
        success = 0
        for idx, bbox in enumerate(bboxes[:5]):
            if idx not in names:
                continue
            
            name = names[idx]
            x1, y1, x2, y2 = bbox
            
            try:
                # Crop
                doodle = self.image.crop((x1, y1, x2, y2))
                
                # Remove white background
                doodle = self.remove_white_bg(doodle)
                
                # Tight crop
                doodle = self.auto_crop_tight(doodle)
                
                # Save
                output_path = OUTPUT_DIR / f"{name}.png"
                doodle.save(output_path, "PNG", optimize=True)
                
                size_kb = output_path.stat().st_size / 1024
                dims = doodle.size
                
                print(f"✅ {name:20} | {dims[0]:4}×{dims[1]:4} | {size_kb:7.1f} KB")
                success += 1
                
            except Exception as e:
                print(f"❌ {name:20} | Error: {e}")
        
        return success >= 5


def main():
    """Main entry point."""
    print("\n" + "=" * 70)
    print("🎨 Smart Doodle Cropper — Tight Extraction")
    print("=" * 70)
    
    if len(sys.argv) < 2:
        print("\n📖 Usage: python3 crop_smart.py <image_path>")
        sys.exit(1)
    
    cropper = SmartDoodleCropper(sys.argv[1])
    
    if cropper.extract_all():
        print("\n" + "=" * 70)
        print("✅ EXTRACTION COMPLETE!")
        print("=" * 70)
        print(f"📁 Saved to: {OUTPUT_DIR}\n")
        return 0
    else:
        print("\n❌ Extraction failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
