"""Generate refined JOY brand assets (v2) — icon + adaptive + splash + favicon.

Design language:
- Coral radial gradient (warm center → deeper edges), giving an "Apple-style" depth
- White "JOY" wordmark with custom letter spacing + subtle drop shadow
- Stylized yellow heart with a soft yellow halo (= warmth, donation)
- Scattered yellow sparkles for joyful vibe
- Top inner highlight for a premium 3D feel
- Rounded square with 22% radius (matches iOS app icon style)

Output:
  frontend/assets/images/icon.png          1024x1024  - iOS / generic
  frontend/assets/images/adaptive-icon.png 1024x1024  - Android adaptive (safe-zone)
  frontend/assets/images/splash-icon.png   2048x2048  - splash logo (transparent bg)
  frontend/assets/images/splash-image.png  2048x2048  - alias
  frontend/assets/images/favicon.png        512x512   - web favicon
  + legacy copies at frontend/assets/
"""
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

CORAL = (255, 107, 107)
CORAL_LIGHT = (255, 153, 153)
CORAL_DARK = (220, 70, 70)
YELLOW = (255, 217, 61)
YELLOW_SOFT = (255, 230, 130)
WHITE = (255, 255, 255)
CREAM = (255, 248, 240)

OUT_DIR = '/app/frontend/assets/images'
LEGACY_DIR = '/app/frontend/assets'


def load_font(size, bold=True):
    candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold
        else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf' if bold
        else '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    ]
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def rounded_mask(size, radius):
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def radial_gradient(size, center_color, edge_color, center_offset_y=-0.1):
    """Return RGBA image with a soft radial gradient from center to edges."""
    w, h = size
    cx = w // 2
    cy = int(h // 2 + h * center_offset_y)
    max_d = math.hypot(max(cx, w - cx), max(cy, h - cy))
    img = Image.new('RGB', size, edge_color)
    px = img.load()
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy) / max_d
            d = min(1, d)
            # Ease so the center remains broader
            t = d * d
            r = int(center_color[0] * (1 - t) + edge_color[0] * t)
            g = int(center_color[1] * (1 - t) + edge_color[1] * t)
            b = int(center_color[2] * (1 - t) + edge_color[2] * t)
            px[x, y] = (r, g, b)
    return img.convert('RGBA')


def draw_heart(canvas, cx, cy, size, color, halo=True):
    """Stylized heart with optional yellow halo. cx,cy = center of the heart."""
    r = size // 2
    if halo:
        halo_img = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        hd = ImageDraw.Draw(halo_img)
        for i, alpha in enumerate([20, 35, 60]):
            pad = (3 - i) * (size // 6)
            hd.ellipse(
                (cx - r - pad, cy - r - pad, cx + r + pad, cy + r + pad),
                fill=(YELLOW_SOFT[0], YELLOW_SOFT[1], YELLOW_SOFT[2], alpha),
            )
        halo_img = halo_img.filter(ImageFilter.GaussianBlur(size // 12))
        canvas.alpha_composite(halo_img)

    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # Two lobes
    d.ellipse((cx - r, cy - r // 2 - r // 4, cx, cy + r // 2 - r // 4), fill=color)
    d.ellipse((cx, cy - r // 2 - r // 4, cx + r, cy + r // 2 - r // 4), fill=color)
    # Bottom triangle (slightly inset for soft point)
    d.polygon(
        [(cx - r + 2, cy + r // 8), (cx + r - 2, cy + r // 8), (cx, cy + r + r // 4)],
        fill=color,
    )
    # Inner highlight on the heart (top-left lobe)
    hl = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hd.ellipse(
        (cx - r + r // 6, cy - r // 2 - r // 4 + r // 8,
         cx - r // 5, cy - r // 6),
        fill=(255, 255, 255, 90),
    )
    hl = hl.filter(ImageFilter.GaussianBlur(2))
    canvas.alpha_composite(layer)
    canvas.alpha_composite(hl)


def add_sparkles(canvas, anchor_box, count=10, seed=42):
    """Tiny yellow + white sparkles scattered within anchor_box (x1,y1,x2,y2)."""
    rnd = random.Random(seed)
    x1, y1, x2, y2 = anchor_box
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(count):
        sx = rnd.randint(x1, x2)
        sy = rnd.randint(y1, y2)
        size = rnd.choice([4, 5, 6, 8, 10, 12])
        col = rnd.choice([YELLOW, WHITE, (255, 255, 255), YELLOW_SOFT])
        # 4-point star: tiny cross
        d.line([(sx - size, sy), (sx + size, sy)], fill=col, width=2)
        d.line([(sx, sy - size), (sx, sy + size)], fill=col, width=2)
        # Center dot
        d.ellipse((sx - 2, sy - 2, sx + 2, sy + 2), fill=col)
    layer = layer.filter(ImageFilter.GaussianBlur(0.5))
    canvas.alpha_composite(layer)


def make_icon(size=1024, safe_zone=False):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))

    margin = int(size * 0.10) if safe_zone else 0
    inner = size - 2 * margin
    radius = int(inner * 0.22)

    # 1) Coral radial gradient background
    bg = radial_gradient((inner, inner), CORAL_LIGHT, CORAL_DARK, center_offset_y=-0.15)
    mask = rounded_mask((inner, inner), radius)
    img.paste(bg, (margin, margin), mask)

    # 2) Sparkles in upper area (subtle)
    add_sparkles(
        img,
        (margin + int(inner * 0.08), margin + int(inner * 0.05),
         margin + int(inner * 0.92), margin + int(inner * 0.45)),
        count=14,
        seed=7,
    )

    # 3) Inner top highlight (gives 3D feel)
    hl = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hd.ellipse(
        (margin + int(inner * 0.06), margin + int(inner * 0.02),
         margin + int(inner * 0.94), margin + int(inner * 0.40)),
        fill=(255, 255, 255, 55),
    )
    hl = hl.filter(ImageFilter.GaussianBlur(8))
    # Clip highlight to the rounded square shape
    full_mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(full_mask).rounded_rectangle(
        (margin, margin, size - margin, size - margin), radius=radius, fill=255
    )
    img.paste(hl, (0, 0), full_mask)

    # 4) "JOY" wordmark
    font_size = int(inner * 0.40)
    font = load_font(font_size, bold=True)
    text = 'JOY'
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (size - tw) // 2 - bbox[0]
    ty = margin + (inner - th) // 2 - int(inner * 0.08) - bbox[1]
    # Soft drop shadow
    sh = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.text((tx + 3, ty + 7), text, fill=(0, 0, 0, 70), font=font)
    sh = sh.filter(ImageFilter.GaussianBlur(8))
    img.alpha_composite(sh)
    d = ImageDraw.Draw(img)
    d.text((tx, ty), text, fill=WHITE, font=font)

    # 5) Yellow heart with halo
    heart_size = int(inner * 0.17)
    heart_cx = size // 2
    heart_cy = ty + th + int(inner * 0.11)
    draw_heart(img, heart_cx, heart_cy, heart_size, YELLOW, halo=True)

    # 6) Sparkles around the heart
    add_sparkles(
        img,
        (heart_cx - heart_size * 3, heart_cy - heart_size,
         heart_cx + heart_size * 3, heart_cy + heart_size * 2),
        count=8,
        seed=21,
    )

    return img


def make_splash_icon(size=2048):
    """Premium splash logo on transparent bg. expo-splash-screen will center it
    over the configured backgroundColor (cream)."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))

    cx, cy = size // 2, size // 2
    disc_r = int(size * 0.30)

    # Disc with radial gradient
    disc_img = radial_gradient((disc_r * 2, disc_r * 2), CORAL_LIGHT, CORAL_DARK, -0.12)
    # Make circular mask
    cmask = Image.new('L', (disc_r * 2, disc_r * 2), 0)
    ImageDraw.Draw(cmask).ellipse((0, 0, disc_r * 2, disc_r * 2), fill=255)
    img.paste(disc_img, (cx - disc_r, cy - disc_r), cmask)

    # Top highlight on disc
    hl = Image.new('RGBA', img.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hd.ellipse(
        (cx - disc_r + 30, cy - disc_r + 20,
         cx + disc_r - 30, cy - disc_r // 4),
        fill=(255, 255, 255, 75),
    )
    hl = hl.filter(ImageFilter.GaussianBlur(20))
    img.paste(hl, (0, 0), cmask.resize(img.size, Image.LANCZOS) if False else None)
    img.alpha_composite(hl)

    # Sparkles AROUND the disc (in transparent area), to make splash feel rich
    add_sparkles(
        img,
        (int(size * 0.05), int(size * 0.10),
         int(size * 0.95), int(size * 0.85)),
        count=30,
        seed=99,
    )

    # JOY centered in disc
    font_size = int(disc_r * 1.0)
    font = load_font(font_size, bold=True)
    d = ImageDraw.Draw(img)
    text = 'JOY'
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = cx - tw // 2 - bbox[0]
    ty = cy - th // 2 - int(disc_r * 0.13) - bbox[1]
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.text((tx + 4, ty + 9), text, fill=(0, 0, 0, 70), font=font)
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    img.alpha_composite(sh)
    d = ImageDraw.Draw(img)
    d.text((tx, ty), text, fill=WHITE, font=font)

    # Heart below
    heart_size = int(disc_r * 0.30)
    heart_cy = ty + th + int(disc_r * 0.18)
    draw_heart(img, cx, heart_cy, heart_size, YELLOW, halo=True)

    # Tagline below the disc (subtle, coral muted)
    tag_font = load_font(int(size * 0.034), bold=True)
    tagline = 'Risvegliamo il bene'
    tbbox = d.textbbox((0, 0), tagline, font=tag_font)
    ttw = tbbox[2] - tbbox[0]
    ttx = cx - ttw // 2 - tbbox[0]
    tty = cy + disc_r + int(size * 0.04)
    d.text((ttx, tty), tagline, fill=(CORAL_DARK[0], CORAL_DARK[1], CORAL_DARK[2], 200), font=tag_font)

    return img


def save(img, path, size=None):
    if size and img.size != (size, size):
        img = img.resize((size, size), Image.LANCZOS)
    img.save(path, 'PNG', optimize=True)
    print(f'  ✓ {path} ({img.size[0]}x{img.size[1]}, {os.path.getsize(path) // 1024} KB)')


if __name__ == '__main__':
    os.makedirs(OUT_DIR, exist_ok=True)

    print('🎨 Generating JOY brand assets v2…')
    icon = make_icon(1024, safe_zone=False)
    adaptive = make_icon(1024, safe_zone=True)
    splash = make_splash_icon(2048)
    favicon_img = make_icon(512, safe_zone=False)

    save(icon, f'{OUT_DIR}/icon.png')
    save(adaptive, f'{OUT_DIR}/adaptive-icon.png')
    save(splash, f'{OUT_DIR}/splash-icon.png')
    save(splash, f'{OUT_DIR}/splash-image.png')
    save(favicon_img, f'{OUT_DIR}/favicon.png')

    save(icon, f'{LEGACY_DIR}/icon.png')
    save(adaptive, f'{LEGACY_DIR}/adaptive-icon.png')
    save(splash, f'{LEGACY_DIR}/splash.png')
    save(favicon_img, f'{LEGACY_DIR}/favicon.png')

    print('✅ Done.')
