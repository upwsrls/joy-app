"""Generate JOY app icons + splash from scratch using PIL.

Output:
  frontend/assets/images/icon.png          1024x1024  - main app icon
  frontend/assets/images/adaptive-icon.png 1024x1024  - Android adaptive (safe zone)
  frontend/assets/images/splash-icon.png   1024x1024  - splash logo (transparent bg)
  frontend/assets/images/favicon.png        256x256   - web favicon
  Plus copies at frontend/assets/{icon,splash,adaptive-icon,favicon}.png for legacy paths.

Brand:
  Primary coral:   #FF6B6B
  Cream BG:        #FFF8F0
  Accent yellow:   #FFD93D
  Text dark:       #2D3748
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

CORAL = (255, 107, 107)
CORAL_DARK = (232, 80, 80)
CREAM = (255, 248, 240)
YELLOW = (255, 217, 61)
WHITE = (255, 255, 255)
DARK = (45, 55, 72)

OUT_DIR = '/app/frontend/assets/images'
LEGACY_DIR = '/app/frontend/assets'


def load_font(size, bold=True):
    candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf' if bold else
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    ]
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def rounded_mask(size, radius):
    mask = Image.new('L', size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def draw_heart(draw, cx, cy, size, color):
    """Stylized heart shape via two circles + triangle."""
    r = size // 2
    # Left lobe
    draw.ellipse((cx - r, cy - r // 2 - r // 4,
                  cx, cy + r // 2 - r // 4), fill=color)
    # Right lobe
    draw.ellipse((cx, cy - r // 2 - r // 4,
                  cx + r, cy + r // 2 - r // 4), fill=color)
    # Point
    draw.polygon(
        [
            (cx - r + 2, cy + r // 8),
            (cx + r - 2, cy + r // 8),
            (cx, cy + r + r // 4),
        ],
        fill=color,
    )


def make_icon(size=1024, safe_zone=False):
    """Coral rounded-square with white 'JOY' wordmark + heart accent below."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    margin = int(size * 0.10) if safe_zone else 0
    inner = size - 2 * margin
    radius = int(inner * 0.22)

    # Coral rounded square with subtle vertical gradient
    bg = Image.new('RGBA', (inner, inner), CORAL)
    grad = ImageDraw.Draw(bg)
    for y in range(inner):
        t = y / inner
        r = int(CORAL[0] * (1 - t * 0.06) + CORAL_DARK[0] * t * 0.06)
        g = int(CORAL[1] * (1 - t * 0.06) + CORAL_DARK[1] * t * 0.06)
        b = int(CORAL[2] * (1 - t * 0.06) + CORAL_DARK[2] * t * 0.06)
        grad.line([(0, y), (inner, y)], fill=(r, g, b, 255))
    mask = rounded_mask((inner, inner), radius)
    img.paste(bg, (margin, margin), mask)

    # Subtle inner highlight (white-ish ring near top)
    overlay = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse(
        (margin + inner * 0.10, margin + inner * 0.06,
         margin + inner * 0.90, margin + inner * 0.36),
        fill=(255, 255, 255, 35),
    )
    img = Image.alpha_composite(img, overlay)

    d = ImageDraw.Draw(img)

    # "JOY" wordmark — large, white, centered slightly above middle
    font_size = int(inner * 0.42)
    font = load_font(font_size, bold=True)
    text = 'JOY'
    bbox = d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) // 2 - bbox[0]
    ty = margin + (inner - th) // 2 - int(inner * 0.06) - bbox[1]
    # Soft shadow
    shadow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.text((tx + 4, ty + 6), text, fill=(0, 0, 0, 60), font=font)
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    img = Image.alpha_composite(img, shadow)
    d = ImageDraw.Draw(img)
    d.text((tx, ty), text, fill=WHITE, font=font)

    # Heart accent below the wordmark
    heart_size = int(inner * 0.15)
    heart_cx = size // 2
    heart_cy = ty + th + int(inner * 0.10)
    draw_heart(d, heart_cx, heart_cy, heart_size, YELLOW)

    return img


def make_splash_icon(size=1024):
    """Transparent canvas with centered coral disc + JOY + heart.
    expo-splash-screen will center this over its configured backgroundColor.
    """
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    cx, cy = size // 2, size // 2
    disc_r = int(size * 0.32)
    # Coral disc
    d.ellipse((cx - disc_r, cy - disc_r, cx + disc_r, cy + disc_r), fill=CORAL)
    # Subtle inner highlight
    overlay = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse(
        (cx - disc_r + 20, cy - disc_r + 20,
         cx + disc_r - 20, cy - disc_r // 3),
        fill=(255, 255, 255, 50),
    )
    img = Image.alpha_composite(img, overlay)
    d = ImageDraw.Draw(img)

    # "JOY" centered in disc
    font_size = int(disc_r * 1.10)
    font = load_font(font_size, bold=True)
    text = 'JOY'
    bbox = d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = cx - tw // 2 - bbox[0]
    ty = cy - th // 2 - int(disc_r * 0.10) - bbox[1]
    d.text((tx, ty), text, fill=WHITE, font=font)

    # Heart below
    heart_size = int(disc_r * 0.28)
    heart_cy = ty + th + int(disc_r * 0.18)
    draw_heart(d, cx, heart_cy, heart_size, YELLOW)

    return img


def save(img, path, size=None):
    if size and img.size != (size, size):
        img = img.resize((size, size), Image.LANCZOS)
    img.save(path, 'PNG', optimize=True)
    print(f'  ✓ {path} ({img.size[0]}x{img.size[1]}, {os.path.getsize(path) // 1024} KB)')


if __name__ == '__main__':
    os.makedirs(OUT_DIR, exist_ok=True)

    print('🎨 Generating icons...')
    icon = make_icon(1024, safe_zone=False)
    adaptive = make_icon(1024, safe_zone=True)
    splash = make_splash_icon(1024)
    favicon_img = make_icon(256, safe_zone=False)

    # /assets/images/ (paths used by app.json)
    save(icon, f'{OUT_DIR}/icon.png')
    save(adaptive, f'{OUT_DIR}/adaptive-icon.png')
    save(splash, f'{OUT_DIR}/splash-icon.png')
    save(favicon_img, f'{OUT_DIR}/favicon.png')
    # Keep old splash-image for backward compat
    save(splash, f'{OUT_DIR}/splash-image.png')

    # /assets/ root (legacy paths)
    save(icon, f'{LEGACY_DIR}/icon.png')
    save(adaptive, f'{LEGACY_DIR}/adaptive-icon.png')
    save(splash, f'{LEGACY_DIR}/splash.png')
    save(favicon_img, f'{LEGACY_DIR}/favicon.png')

    print('✅ All assets generated.')
