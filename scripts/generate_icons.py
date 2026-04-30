#!/usr/bin/env python3
"""
Generate PNG and ICNS icons for Folder Forge app.
Uses subprocess to try multiple SVG->PNG conversion approaches.
"""

import subprocess
import os
import sys
import shutil

BASE_DIR = "/Users/harishd/personal/Vibe-Coding/Folder-stucture/assets"
SVG_PATH = os.path.join(BASE_DIR, "icon.svg")
PNG_PATH = os.path.join(BASE_DIR, "icon.png")
ICONSET_DIR = os.path.join(BASE_DIR, "icon.iconset")
ICNS_PATH = os.path.join(BASE_DIR, "icon.icns")


def try_cairosvg():
    """Try using cairosvg Python library."""
    try:
        import cairosvg
        cairosvg.svg2png(url=SVG_PATH, write_to=PNG_PATH,
                         output_width=1024, output_height=1024)
        print("Generated PNG using cairosvg")
        return True
    except ImportError:
        print("cairosvg not available")
        return False


def try_rsvg():
    """Try using rsvg-convert."""
    try:
        result = subprocess.run(
            ["rsvg-convert", "-w", "1024", "-h", "1024", SVG_PATH, "-o", PNG_PATH],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print("Generated PNG using rsvg-convert")
            return True
    except FileNotFoundError:
        pass
    print("rsvg-convert not available")
    return False


def try_sips():
    """Try using macOS sips (may not support SVG input)."""
    try:
        result = subprocess.run(
            ["sips", "-s", "format", "png", "-z", "1024", "1024", SVG_PATH, "--out", PNG_PATH],
            capture_output=True, text=True
        )
        if result.returncode == 0 and os.path.exists(PNG_PATH) and os.path.getsize(PNG_PATH) > 100:
            print("Generated PNG using sips")
            return True
    except FileNotFoundError:
        pass
    print("sips SVG conversion not available or failed")
    return False


def try_imagemagick():
    """Try using ImageMagick convert."""
    try:
        result = subprocess.run(
            ["convert", "-background", "none", "-density", "300",
             SVG_PATH, "-resize", "1024x1024", PNG_PATH],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print("Generated PNG using ImageMagick")
            return True
    except FileNotFoundError:
        pass
    print("ImageMagick not available")
    return False


def try_pillow_render():
    """Generate the icon directly with Pillow (no SVG conversion needed)."""
    try:
        from PIL import Image, ImageDraw
        import math

        SIZE = 1024
        img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Background with rounded corners
        bg_color = (28, 28, 39, 255)
        radius = 220

        # Draw rounded rectangle background
        draw.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=radius, fill=bg_color)

        # --- Folder back tab ---
        folder_back_color = (154, 128, 255, 180)
        # Tab shape points
        tab_points = [
            (200, 290), (200, 260 + 30),
        ]
        # Draw folder tab
        draw.rounded_rectangle([200, 260, 475, 330], radius=15, fill=(154, 128, 255, 140))

        # --- Folder main body ---
        folder_color = (124, 92, 255, 255)
        # Main folder body
        draw.rounded_rectangle([200, 330, 824, 750], radius=30, fill=folder_color)
        # Tab on top
        draw.rounded_rectangle([200, 260, 460, 340], radius=20, fill=folder_color)

        # --- Folder front face ---
        front_color = (106, 78, 219, 255)
        draw.rounded_rectangle([180, 410, 844, 770], radius=30, fill=front_color)

        # Folder front top line accent
        draw.line([(210, 440), (814, 440)], fill=(124, 92, 255, 128), width=2)

        # --- Template lines on left side of folder ---
        line_color = (184, 160, 255, 77)
        draw.line([(250, 480), (350, 480)], fill=line_color, width=4)
        draw.line([(250, 510), (320, 510)], fill=line_color, width=4)
        draw.line([(250, 540), (290, 540)], fill=line_color, width=4)

        # --- Anvil base ---
        anvil_color = (61, 52, 88, 230)
        draw.polygon([(420, 700), (604, 700), (620, 680), (615, 670),
                       (409, 670), (404, 680)], fill=anvil_color)

        # --- Hammer ---
        # We'll draw a simplified hammer since Pillow doesn't easily do rotated rects
        # Hammer handle (rotated ~-35 degrees) - draw as polygon
        import math
        angle = math.radians(-35)
        cx, cy = 502, 550
        hw, hh = 12, 80  # half-width, half-height of handle

        def rotate_point(px, py, cx, cy, angle):
            dx, dy = px - cx, py - cy
            nx = dx * math.cos(angle) - dy * math.sin(angle)
            ny = dx * math.sin(angle) + dy * math.cos(angle)
            return (cx + nx, cy + ny)

        # Handle rectangle corners
        handle_pts = [
            rotate_point(cx - hw, cy - hh, cx, cy, angle),
            rotate_point(cx + hw, cy - hh, cx, cy, angle),
            rotate_point(cx + hw, cy + hh, cx, cy, angle),
            rotate_point(cx - hw, cy + hh, cx, cy, angle),
        ]
        draw.polygon(handle_pts, fill=(139, 123, 170, 255))

        # Hammer head rectangle
        head_cx, head_cy = cx, cy - hh - 5
        head_hw, head_hh = 42, 20
        head_pts = [
            rotate_point(head_cx - head_hw, head_cy - head_hh, cx, cy, angle),
            rotate_point(head_cx + head_hw, head_cy - head_hh, cx, cy, angle),
            rotate_point(head_cx + head_hw, head_cy + head_hh, cx, cy, angle),
            rotate_point(head_cx - head_hw, head_cy + head_hh, cx, cy, angle),
        ]
        draw.polygon(head_pts, fill=(184, 168, 216, 255))

        # --- Forge sparks ---
        spark_positions = [
            (540, 580, 6, (255, 213, 128)),
            (575, 555, 5, (255, 170, 51)),
            (520, 555, 4, (255, 213, 128)),
            (560, 540, 4, (255, 170, 51)),
            (590, 570, 3, (255, 213, 128)),
            (550, 530, 3, (255, 204, 102)),
            (600, 545, 3, (255, 213, 128)),
        ]
        # Purple glow behind sparks
        for r in range(50, 0, -1):
            alpha = int(30 * (1 - r / 50))
            draw.ellipse([545 - r, 575 - r, 545 + r, 575 + r],
                         fill=(124, 92, 255, alpha))

        # Draw spark glow then spark
        for sx, sy, sr, color in spark_positions:
            # Glow
            for gr in range(sr * 3, 0, -1):
                alpha = int(80 * (1 - gr / (sr * 3)))
                draw.ellipse([sx - gr, sy - gr, sx + gr, sy + gr],
                             fill=(*color, alpha))
            # Core
            draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=color)
            # Bright center
            cr = max(1, sr // 2)
            draw.ellipse([sx - cr, sy - cr, sx + cr, sy + cr], fill=(255, 255, 255, 220))

        # Spark trails
        draw.line([(540, 580), (555, 560)], fill=(255, 213, 128, 180), width=2)
        draw.line([(540, 580), (575, 555)], fill=(255, 170, 51, 130), width=2)
        draw.line([(540, 580), (520, 555)], fill=(255, 213, 128, 130), width=2)
        draw.line([(540, 580), (590, 570)], fill=(255, 170, 51, 100), width=2)

        img.save(PNG_PATH, 'PNG')
        print("Generated PNG using Pillow direct rendering")
        return True
    except ImportError:
        print("Pillow not available")
        return False
    except Exception as e:
        print(f"Pillow rendering failed: {e}")
        return False


def try_webkit2png():
    """Try using macOS WebKit to render SVG to PNG via a small HTML wrapper."""
    html_path = os.path.join(BASE_DIR, "_temp_icon.html")
    try:
        # Create a simple HTML file that displays the SVG
        with open(html_path, 'w') as f:
            f.write(f"""<!DOCTYPE html>
<html><head><style>
body {{ margin:0; padding:0; background:transparent; }}
img {{ width:1024px; height:1024px; }}
</style></head>
<body><img src="file://{SVG_PATH}"/></body></html>""")

        # Use screencapture or similar macOS tool - this won't work easily
        # Let's try using qlmanage instead
        result = subprocess.run(
            ["qlmanage", "-t", "-s", "1024", "-o", BASE_DIR, SVG_PATH],
            capture_output=True, text=True, timeout=15
        )
        # qlmanage outputs as icon.svg.png
        ql_output = os.path.join(BASE_DIR, "icon.svg.png")
        if os.path.exists(ql_output):
            shutil.move(ql_output, PNG_PATH)
            print("Generated PNG using qlmanage")
            return True
    except Exception as e:
        print(f"qlmanage failed: {e}")
    finally:
        if os.path.exists(html_path):
            os.remove(html_path)
    return False


def try_node_sharp():
    """Try using node.js sharp library if available."""
    script = """
const sharp = require('sharp');
const fs = require('fs');
const svgBuffer = fs.readFileSync('%s');
sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile('%s')
    .then(() => console.log('done'))
    .catch(err => { console.error(err); process.exit(1); });
""" % (SVG_PATH, PNG_PATH)

    try:
        result = subprocess.run(
            ["node", "-e", script],
            capture_output=True, text=True, timeout=15,
            cwd=os.path.dirname(BASE_DIR)
        )
        if result.returncode == 0 and os.path.exists(PNG_PATH):
            print("Generated PNG using node sharp")
            return True
    except Exception as e:
        print(f"node sharp failed: {e}")
    return False


def generate_iconset():
    """Generate macOS iconset from the 1024x1024 PNG and create .icns."""
    if not os.path.exists(PNG_PATH):
        print("Cannot generate iconset: PNG not found")
        return False

    # Create iconset directory
    if os.path.exists(ICONSET_DIR):
        shutil.rmtree(ICONSET_DIR)
    os.makedirs(ICONSET_DIR)

    # Required sizes for macOS iconset
    sizes = [
        (16, "icon_16x16.png"),
        (32, "icon_16x16@2x.png"),
        (32, "icon_32x32.png"),
        (64, "icon_32x32@2x.png"),
        (128, "icon_128x128.png"),
        (256, "icon_128x128@2x.png"),
        (256, "icon_256x256.png"),
        (512, "icon_256x256@2x.png"),
        (512, "icon_512x512.png"),
        (1024, "icon_512x512@2x.png"),
    ]

    for size, filename in sizes:
        output = os.path.join(ICONSET_DIR, filename)
        result = subprocess.run(
            ["sips", "-z", str(size), str(size), PNG_PATH, "--out", output],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            print(f"Failed to create {filename}: {result.stderr}")
            return False

    # Create .icns from iconset
    result = subprocess.run(
        ["iconutil", "-c", "icns", ICONSET_DIR, "-o", ICNS_PATH],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"Generated {ICNS_PATH}")
        # Clean up iconset directory
        shutil.rmtree(ICONSET_DIR)
        return True
    else:
        print(f"iconutil failed: {result.stderr}")
        return False


def main():
    # Try multiple approaches to convert SVG to PNG
    converters = [
        try_cairosvg,
        try_rsvg,
        try_sips,
        try_webkit2png,
        try_imagemagick,
        try_node_sharp,
        try_pillow_render,
    ]

    png_created = False
    for converter in converters:
        if converter():
            png_created = True
            break

    if not png_created:
        print("ERROR: Could not generate PNG with any available tool!")
        print("Please install one of: cairosvg, rsvg-convert, ImageMagick, or Pillow")
        sys.exit(1)

    # Verify PNG was created
    if os.path.exists(PNG_PATH):
        size = os.path.getsize(PNG_PATH)
        print(f"PNG created: {PNG_PATH} ({size} bytes)")
    else:
        print("ERROR: PNG file was not created!")
        sys.exit(1)

    # Generate macOS iconset and .icns
    if generate_iconset():
        print("macOS .icns file created successfully")
    else:
        print("Warning: Could not create .icns file")

    print("\nDone! Generated icons:")
    for f in [SVG_PATH, PNG_PATH, ICNS_PATH]:
        if os.path.exists(f):
            print(f"  {f} ({os.path.getsize(f)} bytes)")


if __name__ == "__main__":
    main()
