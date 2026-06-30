#!/usr/bin/env python3
"""Generate JelajahBelanja favicon — unique JB monogram with flame/viral element, NO shopping bag."""

import os
import cairosvg
from PIL import Image
import io

PUBLIC_DIR = "/home/z/my-project/public"

# JelajahBelanja SVG — JB monogram with viral flame accent
# Design: Bold "JB" with a flame/sparkle above, violet gradient background
# NO shopping bag — avoids Shopee trademark similarity
jb_svg = '''<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a855f7;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="flame" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:1" />
      <stop offset="60%" style="stop-color:#ef4444;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Rounded square background -->
  <rect x="16" y="16" width="480" height="480" rx="96" ry="96" fill="url(#bg)"/>
  
  <!-- Flame/trending icon above JB -->
  <g transform="translate(256, 120) scale(1.1)">
    <!-- Outer flame -->
    <path d="M 0 -52 C -8 -40 -28 -16 -28 8 C -28 26 -16 38 0 42 C 16 38 28 26 28 8 C 28 -16 8 -40 0 -52 Z" 
          fill="url(#flame)" opacity="0.9"/>
    <!-- Inner flame -->
    <path d="M 0 -22 C -4 -14 -14 0 -14 12 C -14 22 -8 28 0 30 C 8 28 14 22 14 12 C 14 0 4 -14 0 -22 Z" 
          fill="#fbbf24" opacity="0.95"/>
  </g>
  
  <!-- JB text — bold and modern -->
  <text x="256" y="350" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" 
        font-size="180" font-weight="900" fill="white" letter-spacing="-6">JB</text>
  
  <!-- Subtle tagline line -->
  <rect x="136" y="375" width="240" height="4" rx="2" fill="white" opacity="0.4"/>
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

# Also update the logo.svg
logo_svg_path = os.path.join(PUBLIC_DIR, "logo.svg")
with open(logo_svg_path, "w") as f:
    f.write(jb_svg)
print(f"Updated: {logo_svg_path}")

print("\nAll JelajahBelanja favicon files regenerated — no shopping bag!")
