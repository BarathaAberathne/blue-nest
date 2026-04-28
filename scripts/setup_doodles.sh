#!/bin/bash
# Setup and extract doodles script

set -e

echo "🎨 Blue Nest Doodle Extraction Setup"
echo "======================================"
echo ""

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOODLES_DIR="$SCRIPT_DIR/../frontend/public/doodles"
REFERENCE_IMAGE="$SCRIPT_DIR/reference_image.png"

# Check if reference image exists
if [ ! -f "$REFERENCE_IMAGE" ]; then
    echo "❌ Reference image not found!"
    echo ""
    echo "Steps to fix:"
    echo "1. Save the doodle image to: $REFERENCE_IMAGE"
    echo "2. Then run this script again"
    echo ""
    exit 1
fi

echo "📷 Reference image found!"
echo "   Path: $REFERENCE_IMAGE"
echo ""

# Create output directory
mkdir -p "$DOODLES_DIR"
echo "📁 Output directory: $DOODLES_DIR"
echo ""

# Run extraction
echo "🚀 Starting extraction..."
echo ""

/opt/homebrew/bin/python3 "$SCRIPT_DIR/extract_doodles_interactive.py" <<< "$REFERENCE_IMAGE"
