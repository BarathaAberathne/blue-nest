#!/usr/bin/env python3
"""
🎨 Blue Nest Doodle Extraction Tool - Complete Solution

This script:
1. Takes a reference image with 5 doodle elements
2. Automatically detects and crops each element  
3. Removes white backgrounds (converts to transparent PNG)
4. Saves them to /frontend/public/doodles/

Usage:
    python3 extract_final.py <path_to_image>

Example:
    python3 extract_final.py ~/Downloads/doodles.png
"""

import sys
from pathlib import Path
from PIL import Image
import numpy as np
from typing import Dict, Tuple

# Configuration
OUTPUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "doodles"
DOODLE_NAMES = ["blue-bird", "pink-bird", "blue-flower", "pink-flower", "leaf"]
WHITE_THRESHOLD = 245  # Higher threshold for detecting white background

class DoodleExtractor:
    """Extract and process doodle images."""
    
    def __init__(self, image_path: Path):
        self.image_path = Path(image_path)
        self.image = None
        self.validate_input()
    
    def validate_input(self):
        """Validate input image exists and is readable."""
        if not self.image_path.exists():
            print(f"❌ Error: File not found: {self.image_path}")
            sys.exit(1)
        
        try:
            self.image = Image.open(self.image_path)
            self.image.load()  # Verify it's a valid image
            print(f"✅ Image loaded: {self.image.size} ({self.image.mode})")
        except Exception as e:
            print(f"❌ Error loading image: {e}")
            sys.exit(1)
    
    def find_element_regions(self) -> Dict[str, Tuple[int, int, int, int]]:
        """
        Detect non-white regions and split into 5 quadrants.
        Layout assumption:
            [0]bird    [1]bird
            [2]flower  [3]flower  [4]leaf
        """
        arr = np.array(self.image.convert("RGB"))
        
        # Create mask of non-white pixels
        is_nonwhite = np.any(arr <= WHITE_THRESHOLD, axis=2)
        
        # Find bounding box
        y_indices, x_indices = np.where(is_nonwhite)
        
        if len(y_indices) == 0:
            print("❌ No colored elements found. Check WHITE_THRESHOLD.")
            sys.exit(1)
        
        y_min, y_max = y_indices.min(), y_indices.max()
        x_min, x_max = x_indices.min(), x_indices.max()
        
        # Add padding
        padding = 15
        y_min = max(0, y_min - padding)
        y_max = min(self.image.height, y_max + padding)
        x_min = max(0, x_min - padding)
        x_max = min(self.image.width, x_max + padding)
        
        total_width = x_max - x_min
        total_height = y_max - y_min
        
        # Estimate middle vertical line (separates left/right doodles)
        mid_x = x_min + total_width // 2
        
        # Estimate horizontal split (separates birds/flowers)
        mid_y = y_min + total_height // 2
        
        # Estimate leaf position (rightmost 1/3)
        leaf_x = x_min + int(total_width * 2 / 3)
        
        regions = {
            "blue-bird": (x_min, y_min, mid_x, mid_y),
            "pink-bird": (mid_x, y_min, x_max, mid_y),
            "blue-flower": (x_min, mid_y, mid_x, x_max),
            "pink-flower": (mid_x, mid_y, leaf_x, x_max),
            "leaf": (leaf_x, mid_y, x_max, x_max),
        }
        
        return regions
    
    def remove_white_bg(self, img: Image.Image) -> Image.Image:
        """Convert white background to transparency."""
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        
        data = list(img.getdata())
        new_data = []
        
        for r, g, b, a in [(p[0], p[1], p[2], p[3] if len(p) > 3 else 255) for p in data]:
            # Check if white
            if r > WHITE_THRESHOLD and g > WHITE_THRESHOLD and b > WHITE_THRESHOLD:
                new_data.append((r, g, b, 0))  # Transparent
            else:
                new_data.append((r, g, b, 255))  # Opaque
        
        img.putdata(new_data)
        return img
    
    def trim_transparent(self, img: Image.Image, margin: int = 5) -> Image.Image:
        """Crop transparent borders."""
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        
        # Get bounding box of non-transparent pixels
        bbox = img.getbbox()
        if bbox is None:
            return img
        
        x1, y1, x2, y2 = bbox
        # Add margin
        x1 = max(0, x1 - margin)
        y1 = max(0, y1 - margin)
        x2 = min(img.width, x2 + margin)
        y2 = min(img.height, y2 + margin)
        
        return img.crop((x1, y1, x2, y2))
    
    def extract_all(self) -> bool:
        """Extract all doodles."""
        # Create output directory
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        
        # Find regions
        print("\n🔍 Detecting doodle regions...")
        regions = self.find_element_regions()
        
        print("✂️  Extracting doodles...")
        print("-" * 60)
        
        success_count = 0
        
        for name, bbox in regions.items():
            x1, y1, x2, y2 = bbox
            
            try:
                # Crop
                doodle = self.image.crop((x1, y1, x2, y2))
                
                # Remove white background
                doodle = self.remove_white_bg(doodle)
                
                # Trim transparent borders
                doodle = self.trim_transparent(doodle, margin=3)
                
                # Save
                output_path = OUTPUT_DIR / f"{name}.png"
                doodle.save(output_path, "PNG", optimize=True)
                
                size_kb = output_path.stat().st_size / 1024
                dims = doodle.size
                
                print(f"✅ {name:20} | {dims[0]:4}x{dims[1]:4} | {size_kb:6.1f} KB")
                success_count += 1
                
            except Exception as e:
                print(f"❌ {name:20} | Error: {e}")
        
        print("-" * 60)
        return success_count == len(regions)
    
    def validate_output(self):
        """Validate extracted files."""
        print("\n📋 Validation Report")
        print("=" * 70)
        
        all_valid = True
        
        for name in DOODLE_NAMES:
            file_path = OUTPUT_DIR / f"{name}.png"
            
            if not file_path.exists():
                print(f"❌ {name:20} | NOT FOUND")
                all_valid = False
                continue
            
            try:
                img = Image.open(file_path)
                size_kb = file_path.stat().st_size / 1024
                
                # Verify it's RGBA with transparency
                if img.mode != "RGBA":
                    print(f"⚠️  {name:20} | Mode: {img.mode} (should be RGBA)")
                    all_valid = False
                else:
                    # Check for transparency
                    extrema = img.getextrema()
                    if len(extrema) >= 4 and extrema[3] == (0, 255):
                        status = "RGBA with transparency"
                    else:
                        status = f"RGBA {img.size}"
                    
                    print(f"✅ {name:20} | {img.size} | {size_kb:6.1f} KB | {status}")
            
            except Exception as e:
                print(f"❌ {name:20} | Invalid PNG: {e}")
                all_valid = False
        
        print("=" * 70)
        return all_valid


def main():
    """Main entry point."""
    print("\n" + "=" * 70)
    print("🎨 Blue Nest Doodle Extraction Tool")
    print("=" * 70)
    
    if len(sys.argv) < 2:
        print("\n📖 Usage: python3 extract_final.py <path_to_image>")
        print("\nExample:")
        print("    python3 extract_final.py ~/Downloads/doodles.png")
        print("    python3 extract_final.py /path/to/reference_image.png")
        print("\n💡 Tips:")
        print("   • Image should have 5 doodle elements on white background")
        print("   • Layout: [bird] [bird] on top, [flower] [flower] [leaf] on bottom")
        print("   • Supports PNG, JPG, JPEG formats")
        sys.exit(1)
    
    # Create extractor
    extractor = DoodleExtractor(sys.argv[1])
    
    # Extract
    if extractor.extract_all():
        print("\n✅ All doodles extracted successfully!")
    else:
        print("\n⚠️  Some doodles failed to extract.")
    
    # Validate
    if extractor.validate_output():
        print("\n🎉 SUCCESS! All files are valid and ready to use.")
        print(f"📁 Location: {OUTPUT_DIR}")
        print("\n✨ Your doodles are now ready for the frontend!")
        return 0
    else:
        print("\n⚠️  Some validation issues found.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
