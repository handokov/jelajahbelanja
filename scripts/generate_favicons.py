#!/usr/bin/env python3
"""Generate favicon.ico, apple-touch-icon.png, and site.webmanifest for JelajahBelanja."""

import os
import json
import cairosvg
from PIL import Image
import io

PUBLIC_DIR = "/home/z/my-project/public"
SVG_PATH = os.path.join(PUBLIC_DIR, "logo.svg")

# Read the SVG content
with open(SVG_PATH, "r") as f:
    svg_content = f.read()

# Remove animation from SVG for static favicon usage
svg_static = svg_content.replace('class="z-breathe"', '')

# Generate PNG at multiple sizes for favicon.ico
sizes_ico = [16, 32, 48]
ico_images = []

for size in sizes_ico:
    png_data = cairosvg.svg2png(bytestring=svg_static.encode(), output_width=size, output_height=size)
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
png_data = cairosvg.svg2png(bytestring=svg_static.encode(), output_width=apple_size, output_height=apple_size)
apple_img = Image.open(io.BytesIO(png_data))
apple_img = apple_img.convert("RGBA")
apple_path = os.path.join(PUBLIC_DIR, "apple-touch-icon.png")
apple_img.save(apple_path, format="PNG")
print(f"Created: {apple_path}")

# Generate android-chrome-192x192.png
chrome_192_size = 192
png_data = cairosvg.svg2png(bytestring=svg_static.encode(), output_width=chrome_192_size, output_height=chrome_192_size)
chrome_192_img = Image.open(io.BytesIO(png_data))
chrome_192_img = chrome_192_img.convert("RGBA")
chrome_192_path = os.path.join(PUBLIC_DIR, "android-chrome-192x192.png")
chrome_192_img.save(chrome_192_path, format="PNG")
print(f"Created: {chrome_192_path}")

# Generate android-chrome-512x512.png
chrome_512_size = 512
png_data = cairosvg.svg2png(bytestring=svg_static.encode(), output_width=chrome_512_size, output_height=chrome_512_size)
chrome_512_img = Image.open(io.BytesIO(png_data))
chrome_512_img = chrome_512_img.convert("RGBA")
chrome_512_path = os.path.join(PUBLIC_DIR, "android-chrome-512x512.png")
chrome_512_img.save(chrome_512_path, format="PNG")
print(f"Created: {chrome_512_path}")

# Generate site.webmanifest
manifest = {
    "name": "JelajahBelanja",
    "short_name": "JelajahBelanja",
    "description": "Produk Viral & Best Seller Shopee, Tokopedia, Lazada Hari Ini",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#7c3aed",
    "icons": [
        {
            "src": "/android-chrome-192x192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "/android-chrome-512x512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ]
}

manifest_path = os.path.join(PUBLIC_DIR, "site.webmanifest")
with open(manifest_path, "w") as f:
    json.dump(manifest, f, indent=2)
print(f"Created: {manifest_path}")

print("\nAll favicon files generated successfully!")
