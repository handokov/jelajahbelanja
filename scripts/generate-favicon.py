"""Generate favicon.ico and apple-touch-icon.png for JelajahBelanja"""
from PIL import Image, ImageDraw

def create_favicon(size, output_path):
    """Create a favicon with shopping bag icon + violet-fuchsia gradient"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Scale factor
    s = size / 32.0

    # Background rounded rect with gradient (simulate with violet)
    # Main color: violet #7c3aed
    bg_color = (124, 58, 237, 255)
    accent_color = (217, 70, 239, 255)  # fuchsia

    # Draw rounded rect background
    rx = int(6 * s)
    draw.rounded_rectangle([0, 0, size-1, size-1], radius=rx, fill=bg_color)

    # Add gradient effect by overlaying fuchsia on bottom-right
    for y in range(size):
        for x in range(size):
            # Gradient blend from violet to fuchsia
            t = (x + y) / (2 * size)
            r = int(bg_color[0] + (accent_color[0] - bg_color[0]) * t)
            g = int(bg_color[1] + (accent_color[1] - bg_color[1]) * t)
            b = int(bg_color[2] + (accent_color[2] - bg_color[2]) * t)
            # Only apply inside rounded rect
            cx, cy = size/2, size/2
            dx = abs(x - cx) / (size/2 - rx)
            dy = abs(y - cy) / (size/2 - rx)
            if dx*dx + dy*dy <= 1.0 or (x >= rx and x < size-rx and y >= rx and y < size-rx):
                img.putpixel((x, y), (r, g, b, 255))

    # Re-draw rounded rect mask
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, size-1, size-1], radius=rx, fill=255)
    
    # Apply mask
    final = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    final.paste(img, mask=mask)

    # Draw shopping bag icon (white)
    draw = ImageDraw.Draw(final)
    white = (255, 255, 255, 255)

    # Bag body: rounded rectangle
    bag_left = int(9 * s)
    bag_right = int(23 * s)
    bag_top = int(11 * s)
    bag_bottom = int(26 * s)
    bag_rx = int(2 * s)
    draw.rounded_rectangle(
        [bag_left, bag_top, bag_right, bag_bottom],
        radius=bag_rx,
        outline=white,
        width=max(1, int(1.5 * s))
    )

    # Bag handle: arc
    handle_left = int(12 * s)
    handle_right = int(20 * s)
    handle_top = int(7 * s)
    handle_bottom = int(13 * s)
    draw.arc(
        [handle_left, handle_top, handle_right, handle_bottom],
        start=180,
        end=0,
        fill=white,
        width=max(1, int(1.5 * s))
    )

    # Small sparkle/star in top-right corner
    star_x = int(23 * s)
    star_y = int(8 * s)
    star_r = max(1, int(1.5 * s))
    draw.ellipse(
        [star_x - star_r, star_y - star_r, star_x + star_r, star_y + star_r],
        fill=white
    )

    final.save(output_path, format='PNG' if output_path.endswith('.png') else 'ICO', sizes=[(size, size)] if output_path.endswith('.ico') else None)
    print(f"Created {output_path} ({size}x{size})")

# Generate favicon.ico (multi-size: 16, 32, 48)
sizes_ico = [16, 32, 48]
images = []
for sz in sizes_ico:
    img = Image.new('RGBA', (sz, sz), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    s = sz / 32.0
    bg_color = (124, 58, 237, 255)
    accent_color = (217, 70, 239, 255)
    rx = int(6 * s)

    # Gradient background
    for y in range(sz):
        for x in range(sz):
            t = (x + y) / (2 * sz)
            r = int(bg_color[0] + (accent_color[0] - bg_color[0]) * t)
            g = int(bg_color[1] + (accent_color[1] - bg_color[1]) * t)
            b = int(bg_color[2] + (accent_color[2] - bg_color[2]) * t)
            cx, cy = sz/2, sz/2
            in_rect = (x >= rx and x < sz-rx and y >= rx and y < sz-rx)
            in_corner = True
            for cdx, cdy in [(rx, rx), (sz-rx-1, rx), (rx, sz-rx-1), (sz-rx-1, sz-rx-1)]:
                pass
            from math import sqrt
            # Simple check: inside rounded rect
            inside = False
            if x >= rx and x < sz-rx and y < sz:
                inside = True
            elif y >= rx and y < sz-rx:
                inside = True
            else:
                for corner_x, corner_y in [(rx, rx), (sz-rx-1, rx), (rx, sz-rx-1), (sz-rx-1, sz-rx-1)]:
                    dist = sqrt((x - corner_x)**2 + (y - corner_y)**2)
                    if dist <= rx:
                        inside = True
                        break
            if inside:
                img.putpixel((x, y), (r, g, b, 255))

    # Apply rounded rect mask
    mask = Image.new('L', (sz, sz), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sz-1, sz-1], radius=rx, fill=255)
    img.putalpha(mask.getchannel(0))

    # Draw icon
    draw = ImageDraw.Draw(img)
    white = (255, 255, 255, 255)
    w = max(1, int(1.5 * s))

    # Bag body
    draw.rounded_rectangle(
        [int(9*s), int(11*s), int(23*s), int(26*s)],
        radius=int(2*s),
        outline=white,
        width=w
    )
    # Handle
    draw.arc(
        [int(12*s), int(7*s), int(20*s), int(13*s)],
        start=180, end=0,
        fill=white,
        width=w
    )
    # Star sparkle
    sr = max(1, int(1.5*s))
    draw.ellipse([int(23*s)-sr, int(8*s)-sr, int(23*s)+sr, int(8*s)+sr], fill=white)

    images.append(img)

# Save ICO
images[0].save('/home/z/my-project/public/favicon.ico', format='ICO', sizes=[(16,16),(32,32),(48,48)], append_images=images[1:])
print("Created /home/z/my-project/public/favicon.ico")

# Save apple-touch-icon (180x180)
img_180 = Image.new('RGBA', (180, 180), (0, 0, 0, 0))
draw = ImageDraw.Draw(img_180)
s = 180 / 32.0
bg_color = (124, 58, 237, 255)
accent_color = (217, 70, 239, 255)
rx = int(6 * s)

for y in range(180):
    for x in range(180):
        t = (x + y) / 360.0
        r = int(bg_color[0] + (accent_color[0] - bg_color[0]) * t)
        g = int(bg_color[1] + (accent_color[1] - bg_color[1]) * t)
        b = int(bg_color[2] + (accent_color[2] - bg_color[2]) * t)
        from math import sqrt
        inside = False
        if x >= rx and x < 180-rx:
            inside = True
        elif y >= rx and y < 180-rx:
            inside = True
        else:
            for cx, cy in [(rx, rx), (180-rx-1, rx), (rx, 180-rx-1), (180-rx-1, 180-rx-1)]:
                if sqrt((x-cx)**2 + (y-cy)**2) <= rx:
                    inside = True
                    break
        if inside:
            img_180.putpixel((x, y), (r, g, b, 255))

mask = Image.new('L', (180, 180), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, 179, 179], radius=rx, fill=255)
img_180.putalpha(mask.getchannel(0))

draw = ImageDraw.Draw(img_180)
white = (255, 255, 255, 255)
w = max(2, int(1.5 * s))
draw.rounded_rectangle([int(9*s), int(11*s), int(23*s), int(26*s)], radius=int(2*s), outline=white, width=w)
draw.arc([int(12*s), int(7*s), int(20*s), int(13*s)], start=180, end=0, fill=white, width=w)
sr = max(2, int(1.5*s))
draw.ellipse([int(23*s)-sr, int(8*s)-sr, int(23*s)+sr, int(8*s)+sr], fill=white)

img_180.save('/home/z/my-project/public/apple-touch-icon.png', format='PNG')
print("Created /home/z/my-project/public/apple-touch-icon.png (180x180)")
