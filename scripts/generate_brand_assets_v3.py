"""Generate JOY brand assets v3 — refined, premium, heart-led.

Design language v3:
- Soft vertical coral gradient (lighter coral on top → deeper coral on bottom)
  with a subtle radial light on the upper-center for a premium 3D feel.
- A SINGLE white heart hero (mathematical heart curve — classic, elegant).
- Tiny yellow sparkle nested near the heart's top-right cusp to evoke
  "il dono di gioia" without clutter.
- Inner top highlight + subtle bottom vignette for depth.
- No wordmark inside the icon (max legibility at small sizes — iOS guideline).
- Splash uses cream background (#FFF8F0) + large coral heart + JOY wordmark
  + italian tagline.

Outputs (overwrites):
  frontend/assets/images/icon.png          1024x1024
  frontend/assets/images/adaptive-icon.png 1024x1024 (safe-zone padded)
  frontend/assets/images/splash-icon.png   2048x2048
  frontend/assets/images/splash-image.png  2048x2048
  frontend/assets/images/favicon.png        512x512
  + legacy copies in frontend/assets/
"""
import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Color palette — gioiosa, calda, moderna
CORAL_TOP = (255, 138, 128)        # warm light coral
CORAL_MID = (255, 107, 107)        # brand coral
CORAL_DEEP = (220, 70, 80)         # deeper coral / shadow
YELLOW = (255, 213, 79)            # warm yellow sparkle
YELLOW_SOFT = (255, 234, 161)
WHITE = (255, 255, 255)
CREAM = (255, 248, 240)
INK = (40, 30, 35)

OUT_DIR = '/app/frontend/assets/images'
LEGACY_DIR = '/app/frontend/assets'


# ---------------------- Utilities ----------------------

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


def vertical_gradient(size, top_color, bottom_color):
    """Smooth top->bottom RGB gradient."""
    w, h = size
    img = Image.new('RGB', size, top_color)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        # ease-in-out for richness
        t = t * t * (3 - 2 * t)
        r = int(top_color[0] * (1 - t) + bottom_color[0] * t)
        g = int(top_color[1] * (1 - t) + bottom_color[1] * t)
        b = int(top_color[2] * (1 - t) + bottom_color[2] * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    return img.convert('RGBA')


def heart_polygon(cx, cy, scale, points=240, rotate=0.0):
    """Return list of (x, y) points for a classic mathematical heart curve.

    Standard parametric equations:
      x(t) = 16 sin^3(t)
      y(t) = -(13 cos t - 5 cos 2t - 2 cos 3t - cos 4t)
    The curve is normalised so that the heart's bounding box has width `scale`
    and is centred at (cx, cy).
    """
    pts = []
    raw = []
    for i in range(points):
        t = 2 * math.pi * i / points
        x = 16 * math.sin(t) ** 3
        y = -(13 * math.cos(t) - 5 * math.cos(2 * t)
              - 2 * math.cos(3 * t) - math.cos(4 * t))
        raw.append((x, y))
    xs = [p[0] for p in raw]
    ys = [p[1] for p in raw]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    w = max_x - min_x
    h = max_y - min_y
    # Use uniform scale so the heart keeps its natural aspect ratio
    s = scale / max(w, h)
    cosr, sinr = math.cos(rotate), math.sin(rotate)
    for x, y in raw:
        # Center on origin first
        nx = (x - (min_x + max_x) / 2) * s
        ny = (y - (min_y + max_y) / 2) * s
        # Rotate
        rx = nx * cosr - ny * sinr
        ry = nx * sinr + ny * cosr
        pts.append((cx + rx, cy + ry))
    return pts


def draw_smooth_heart(canvas, cx, cy, scale, fill, shadow=True,
                       inner_highlight=True, sparkle=True):
    """Draw a refined heart on the given RGBA canvas."""
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pts = heart_polygon(cx, cy, scale, points=360)
    d.polygon(pts, fill=fill)

    if shadow:
        sh = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        sd = ImageDraw.Draw(sh)
        shadow_pts = [(x + scale * 0.03, y + scale * 0.07) for (x, y) in pts]
        sd.polygon(shadow_pts, fill=(0, 0, 0, 70))
        sh = sh.filter(ImageFilter.GaussianBlur(scale * 0.04))
        canvas.alpha_composite(sh)

    canvas.alpha_composite(layer)

    if inner_highlight:
        hl = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        hd = ImageDraw.Draw(hl)
        # Subtle gloss on the upper-left lobe — gives depth without "hole" look
        hx = cx - scale * 0.24
        hy = cy - scale * 0.24
        hd.ellipse(
            (hx - scale * 0.10, hy - scale * 0.07,
             hx + scale * 0.10, hy + scale * 0.07),
            fill=(255, 255, 255, 80),
        )
        hl = hl.filter(ImageFilter.GaussianBlur(scale * 0.035))
        # Clip highlight to heart polygon (multiply alpha by heart mask)
        clip = Image.new('L', canvas.size, 0)
        ImageDraw.Draw(clip).polygon(pts, fill=255)
        hl_a = hl.split()[3]
        new_a = Image.composite(hl_a, Image.new('L', clip.size, 0), clip)
        hl.putalpha(new_a)
        canvas.alpha_composite(hl)

    if sparkle:
        # Tiny 4-point yellow sparkle near upper-right cusp
        sx = cx + scale * 0.28
        sy = cy - scale * 0.40
        s = max(6, int(scale * 0.05))
        sp = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        sd = ImageDraw.Draw(sp)
        # 4-point star drawn as two crossed thin diamonds
        sd.polygon([(sx, sy - s * 1.8), (sx + s * 0.6, sy),
                    (sx, sy + s * 1.8), (sx - s * 0.6, sy)], fill=YELLOW)
        sd.polygon([(sx - s * 1.8, sy), (sx, sy - s * 0.6),
                    (sx + s * 1.8, sy), (sx, sy + s * 0.6)], fill=YELLOW)
        sd.ellipse((sx - s * 0.6, sy - s * 0.6, sx + s * 0.6, sy + s * 0.6), fill=WHITE)
        # Soft glow
        glow = sp.filter(ImageFilter.GaussianBlur(s * 0.8))
        canvas.alpha_composite(glow)
        canvas.alpha_composite(sp)


def add_top_highlight(canvas, box, strength=70):
    """Add an elliptical light highlight to give 3D feel."""
    x1, y1, x2, y2 = box
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx = (x1 + x2) // 2
    rw = (x2 - x1) * 0.45
    rh = (y2 - y1) * 0.22
    cy_ = y1 + (y2 - y1) * 0.18
    d.ellipse((cx - rw, cy_ - rh, cx + rw, cy_ + rh),
              fill=(255, 255, 255, strength))
    layer = layer.filter(ImageFilter.GaussianBlur((x2 - x1) * 0.06))
    canvas.alpha_composite(layer)


def add_bottom_vignette(canvas, box, strength=80):
    x1, y1, x2, y2 = box
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx = (x1 + x2) // 2
    cy = y2 + (y2 - y1) * 0.10
    rw = (x2 - x1) * 0.85
    rh = (y2 - y1) * 0.55
    d.ellipse((cx - rw, cy - rh, cx + rw, cy + rh),
              fill=(120, 30, 50, strength))
    layer = layer.filter(ImageFilter.GaussianBlur((x2 - x1) * 0.10))
    canvas.alpha_composite(layer)


# ---------------------- Builders ----------------------

def _clip_to_rounded(layer, box, radius):
    """Return a copy of `layer` with alpha clipped to the rounded rect `box`."""
    full_mask = Image.new('L', layer.size, 0)
    ImageDraw.Draw(full_mask).rounded_rectangle(box, radius=radius, fill=255)
    out = layer.copy()
    # Multiply existing alpha by the mask
    a = out.split()[3]
    new_a = Image.eval(a, lambda v: v)  # noop copy
    new_a = Image.composite(new_a, Image.new('L', a.size, 0), full_mask)
    out.putalpha(new_a)
    return out


def make_icon(size=1024, safe_zone=False):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    margin = int(size * 0.10) if safe_zone else 0
    inner = size - 2 * margin
    radius = int(inner * 0.22)
    box = (margin, margin, size - margin, size - margin)

    # 1) Background gradient inside rounded rect
    bg = vertical_gradient((inner, inner), CORAL_TOP, CORAL_DEEP)
    mask = rounded_mask((inner, inner), radius)
    img.paste(bg, (margin, margin), mask)

    # 2) Bottom vignette (depth) — composited on top, clipped to rounded shape
    bv = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    add_bottom_vignette(bv, box, strength=70)
    bv = _clip_to_rounded(bv, box, radius)
    img.alpha_composite(bv)

    # 3) Top highlight — composited, clipped
    th = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    add_top_highlight(th, box, strength=90)
    th = _clip_to_rounded(th, box, radius)
    img.alpha_composite(th)

    # 4) Hero heart — white, centred, dominant
    heart_scale = inner * 0.58
    cx = size // 2
    cy = size // 2 + int(inner * 0.02)
    draw_smooth_heart(img, cx, cy, heart_scale, WHITE,
                      shadow=True, inner_highlight=True, sparkle=True)

    return img


def make_splash(size=2048):
    """Splash with coral→cream vertical gradient, big YELLOW heart, JOY wordmark + tagline."""
    # Gradient background: warm coral on top → cream at bottom
    img = vertical_gradient((size, size), CORAL_TOP, CREAM)

    cx = size // 2
    cy = int(size * 0.40)
    heart_scale = size * 0.38

    # Soft yellow glow behind the heart
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gr = int(heart_scale * 0.90)
    gd.ellipse((cx - gr, cy - gr, cx + gr, cy + gr),
               fill=(YELLOW_SOFT[0], YELLOW_SOFT[1], YELLOW_SOFT[2], 90))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.05))
    img.alpha_composite(glow)

    # Yellow heart hero
    draw_smooth_heart(img, cx, cy, heart_scale, YELLOW,
                      shadow=True, inner_highlight=True, sparkle=True)

    # JOY wordmark below heart
    font_size = int(size * 0.17)
    font = load_font(font_size, bold=True)
    text = 'JOY'
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = cx - tw // 2 - bbox[0]
    ty = cy + int(heart_scale * 0.55) - bbox[1]

    # Soft drop shadow on wordmark
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.text((tx + 4, ty + 9), text, fill=(120, 30, 50, 60), font=font)
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    img.alpha_composite(sh)
    d.text((tx, ty), text, fill=WHITE, font=font)

    # Tagline
    tag_font = load_font(int(size * 0.040), bold=True)
    tagline = 'Risvegliamo il bene'
    tbbox = d.textbbox((0, 0), tagline, font=tag_font)
    ttw = tbbox[2] - tbbox[0]
    ttx = cx - ttw // 2 - tbbox[0]
    tty = ty + th + int(size * 0.025)
    d.text((ttx, tty), tagline,
           fill=(CORAL_DEEP[0], CORAL_DEEP[1], CORAL_DEEP[2], 230),
           font=tag_font)

    return img


def make_splash_icon(size=2048):
    """Splash icon shown by expo-splash-screen plugin. Transparent bg (Expo
    paints its own backgroundColor) — we keep heart + wordmark + tagline so
    the static splash matches the start of the animated overlay."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    cx = size // 2
    cy = int(size * 0.40)
    heart_scale = size * 0.38

    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gr = int(heart_scale * 0.90)
    gd.ellipse((cx - gr, cy - gr, cx + gr, cy + gr),
               fill=(YELLOW_SOFT[0], YELLOW_SOFT[1], YELLOW_SOFT[2], 110))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.05))
    img.alpha_composite(glow)

    draw_smooth_heart(img, cx, cy, heart_scale, YELLOW,
                      shadow=True, inner_highlight=True, sparkle=True)

    font_size = int(size * 0.17)
    font = load_font(font_size, bold=True)
    text = 'JOY'
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = cx - tw // 2 - bbox[0]
    ty = cy + int(heart_scale * 0.55) - bbox[1]
    d.text((tx, ty), text, fill=CORAL_DEEP, font=font)

    tag_font = load_font(int(size * 0.040), bold=True)
    tagline = 'Risvegliamo il bene'
    tbbox = d.textbbox((0, 0), tagline, font=tag_font)
    ttw = tbbox[2] - tbbox[0]
    ttx = cx - ttw // 2 - tbbox[0]
    tty = ty + th + int(size * 0.025)
    d.text((ttx, tty), tagline,
           fill=(CORAL_DEEP[0], CORAL_DEEP[1], CORAL_DEEP[2], 230),
           font=tag_font)

    return img


# ---------------------- Save ----------------------

def save(img, path, size=None):
    if size and img.size != (size, size):
        img = img.resize((size, size), Image.LANCZOS)
    img.save(path, 'PNG', optimize=True)
    print(f'  ✓ {path} ({img.size[0]}x{img.size[1]}, {os.path.getsize(path) // 1024} KB)')


def make_heart_only(size=1024):
    """Yellow heart on transparent background — used by the React Native
    animated splash overlay so we can animate it freely. Glow is kept small
    so the PNG bounds never show against the gradient background."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    cx, cy = size // 2, size // 2
    heart_scale = size * 0.72  # leave breathing room around the heart

    # Very subtle yellow glow — stays well inside the canvas
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gr = int(heart_scale * 0.55)
    gd.ellipse((cx - gr, cy - gr, cx + gr, cy + gr),
               fill=(YELLOW_SOFT[0], YELLOW_SOFT[1], YELLOW_SOFT[2], 70))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.06))
    img.alpha_composite(glow)

    draw_smooth_heart(img, cx, cy, heart_scale, YELLOW,
                      shadow=True, inner_highlight=True, sparkle=False)
    return img


if __name__ == '__main__':
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(LEGACY_DIR, exist_ok=True)

    print('🎨 Generating JOY brand assets v3…')
    icon = make_icon(1024, safe_zone=False)
    adaptive = make_icon(1024, safe_zone=True)
    splash_icon = make_splash_icon(2048)
    splash_full = make_splash(2048)
    favicon_img = make_icon(512, safe_zone=False)
    heart_only_img = make_heart_only(1024)

    # Active paths used by app.json
    save(icon, f'{OUT_DIR}/icon.png')
    save(adaptive, f'{OUT_DIR}/adaptive-icon.png')
    save(splash_icon, f'{OUT_DIR}/splash-icon.png')
    save(splash_full, f'{OUT_DIR}/splash-image.png')
    save(favicon_img, f'{OUT_DIR}/favicon.png')
    save(heart_only_img, f'{OUT_DIR}/heart-only.png')

    # Legacy copies (kept for any reference / future use)
    save(icon, f'{LEGACY_DIR}/icon.png')
    save(adaptive, f'{LEGACY_DIR}/adaptive-icon.png')
    save(splash_full, f'{LEGACY_DIR}/splash.png')
    save(favicon_img, f'{LEGACY_DIR}/favicon.png')

    print('✅ Done.')
