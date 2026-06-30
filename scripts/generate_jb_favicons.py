#!/usr/bin/env python3
"""Generate proper JelajahBelanja favicon — shopping bag + JB brand, NOT the Z logo."""

import os
import json
import cairosvg
from PIL import Image
import io

PUBLIC_DIR = "/home/z/my-project/public"

# JelajahBelanja SVG — shopping bag icon with "JB" text on violet/purple background
jb_svg = '''<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a855f7;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Rounded square background -->
  <rect x="16" y="16" width="480" height="480" rx="96" ry="96" fill="url(#bg)"/>
  <!-- Shopping bag body -->
  <rect x="140" y="180" width="232" height="240" rx="20" ry="20" fill="white" opacity="0.95"/>
  <!-- Shopping bag handle -->
  <path d="M 200 180 L 200 140 Q 200 100 256 100 Q 312 100 312 140 L 312 180" 
        fill="none" stroke="white" stroke-width="28" stroke-linecap="round" opacity="0.95"/>
  <!-- JB text -->
  <text x="256" y="340" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" 
        font-size="120" font-weight="900" fill="#7c3aed" letter-spacing="-4">JB</text>
</svg>'''

# Generate PNG at multiple sizes for favicon.ico
sizes_ico = [16, 32, 48]
ico_images = []

for size in sizes_ico:
    png_data = cairosvg.svg2png(bytestring=jb_svg.encode(), output_width=size, output_height=size)
    img = Image.open(io.BytesIO(png_data))
    img = img.convert("RGBA")
    ico_images.append(img)

# Save favicon.ico (multi-resolution)
favicon_path = os.path.join(PUBLIC_DIR, "favicon.ico")
ico_images[0].save(
    favicon_path,
    format="ICO",
    sizes=[(s, s) for s in sizes_ico],
    append_images=ico_images[1:]
)
print(f"Created: {favicon_path}")

# Generate apple-touch-icon.png (180x180)
apple_size = 180
png_data = cairosvg.svg2png(bytestring=jb_svg.encode(), output_width=apple_size, output_height=apple_size)
apple_img = Image.open(io.BytesIO(png_data))
apple_img = apple_img.convert("RGBA")
apple_path = os.path.join(PUBLIC_DIR, "apple-touch-icon.png")
apple_img.save(apple_path, format="PNG")
print(f"Created: {apple_path}")

# Generate android-chrome-192x192.png
chrome_192_size = 192
png_data = cairosvg.svg2png(bytestring=jb_svg.encode(), output_width=chrome_192_size, output_height=chrome_192_size)
chrome_192_img = Image.open(io.BytesIO(png_data))
chrome_192_img = chrome_img = Image.open(io.BytesIO(png_data))
chrome_192_img = chrome_192_img.convert("RGBA")
chrome_192_path = os.path.join(PUBLIC_DIR, "android-chrome-192x192.png")
chrome_192_img.save(chrome_192_path, format="PNG")
print(f"Created: {chrome_192_path}")

# Generate android-chrome-512x512.png
chrome_512_size = 512
png_data = cairosvg.svg2png(bytestring=jb_svg.encode(), output_width=chrome_512_size, output_height=chrome_512_size)
chrome_512_img = Image.open(io.BytesIO(png_data))
chrome_512_img = chrome_512_img.convert("RGBA")
chrome_512_path = os.path.join(PUBLIC_DIR, "android-chrome-512x512.png")
chrome_512_img.save(chrome_512_path, format="PNG")
print(f"Created: {chrome_512_path}")

# Also save the SVG as the new logo
logo_svg_path = os.path.join(PUBLIC_DIR, "logo.svg")
# Keep the original Z logo as logo-z.svg backup
if os.path.exists(logo_svg_path):
    import shutil
    shutil.copy2(logo_svg_path, os.path.join(PUBLIC_DIR, "logo-z-backup.svg"))
    print(f"Backed up original Z logo to logo-z-backup.svg")

with open(logo_svg_path, "w") as f:
    f.write(jb_svg)
print(f"Updated: {logo_svg_path}")

print("\nAll JelajahBelanja favicon files generated successfully!")
