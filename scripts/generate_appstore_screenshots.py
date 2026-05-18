"""Generate App Store-ready promotional screenshots (1290x2796 — 6.7").

Pipeline:
1. Reads 5 raw app screenshots captured at 390x844 (iPhone 13/14 size) from
   /tmp/screenshots/<slug>.png
2. Composes each one into a 1290x2796 promotional image:
   - Soft coral→cream gradient background
   - Bold marketing title at the top (Italian)
   - Brief subtitle
   - The raw screenshot framed inside a stylised iPhone bezel, centered below
3. Writes the final composites to /app/frontend/store-assets/ios/<slug>.png

Usage:
    python scripts/generate_appstore_screenshots.py
"""
import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ----- Layout constants (App Store 6.7" Pro Max) -----
W, H = 1290, 2796
MARGIN = 60

# ----- Source screenshots (captured at iPhone 13 logical size) -----
SRC_DIR = '/tmp/screenshots'
OUT_DIR = '/app/frontend/store-assets/ios'

# ----- Brand palette (matches JOY theme) -----
CORAL_TOP = (255, 138, 128)
CORAL_MID = (255, 142, 128)
CORAL_DEEP = (220, 70, 80)
CREAM = (255, 248, 240)
YELLOW = (255, 213, 79)
INK = (40, 30, 35)
WHITE = (255, 255, 255)

SCREENS = [
    {
        'slug': '01-mappa',
        'title': 'Trova le gioie\nvicino a te',
        'subtitle': 'Mappa interattiva con pin\ncolorati e ricerca per città',
    },
    {
        'slug': '02-home',
        'title': 'Doni, libri, giochi\na portata di mano',
        'subtitle': 'Tutto quello che non usi più\npuò diventare la gioia di qualcuno',
    },
    {
        'slug': '03-dettaglio',
        'title': 'Foto a schermo intero\ncon zoom e swipe',
        'subtitle': 'Vedi ogni dettaglio\nprima di contattare il donatore',
    },
    {
        'slug': '04-dona',
        'title': 'Pubblica una gioia\nin 30 secondi',
        'subtitle': 'Fino a 3 foto, una categoria\ne due righe — fatto',
    },
    {
        'slug': '05-chat',
        'title': 'Chatta direttamente\ncon chi dona',
        'subtitle': 'Notifiche push istantanee\ne badge non lette',
    },
    {
        'slug': '06-recensioni',
        'title': 'Comunità affidabile\nbasata su recensioni',
        'subtitle': 'Sistema a 5 stelle:\nscegli con chi scambiare',
    },
]


# ----- Helpers -----

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


def vertical_gradient(size, top, bottom):
    w, h = size
    img = Image.new('RGB', size, top)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        t = t * t * (3 - 2 * t)
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    return img.convert('RGBA')


def draw_iphone_frame(canvas, sx, sy, sw, sh, screenshot):
    """Draw a soft realistic-ish iPhone bezel around `screenshot` placed at (sx,sy)
    sized (sw,sh). The frame extends ~30px around the screenshot for the bezel,
    plus dynamic island on top."""
    bezel_thick = 28
    radius = 78  # rounded corners of the bezel
    inner_radius = 60
    fx, fy = sx - bezel_thick, sy - bezel_thick
    fw, fh = sw + bezel_thick * 2, sh + bezel_thick * 2

    # Shadow under the phone
    shadow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((fx + 20, fy + 50, fx + fw + 20, fy + fh + 60), radius=radius, fill=(0, 0, 0, 80))
    shadow = shadow.filter(ImageFilter.GaussianBlur(30))
    canvas.alpha_composite(shadow)

    # Outer bezel (black-ish gradient)
    bezel = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(bezel)
    bd.rounded_rectangle((fx, fy, fx + fw, fy + fh), radius=radius, fill=(28, 28, 32, 255))
    canvas.alpha_composite(bezel)

    # Inner highlight (thin lighter rim)
    rim = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    rd = ImageDraw.Draw(rim)
    rd.rounded_rectangle((fx + 6, fy + 6, fx + fw - 6, fy + fh - 6), radius=radius - 4, outline=(80, 80, 90, 255), width=2)
    canvas.alpha_composite(rim)

    # Screenshot — corner-rounded and pasted inside the bezel
    ss = screenshot.resize((sw, sh), Image.LANCZOS).convert('RGBA')
    mask = Image.new('L', (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw, sh), radius=inner_radius, fill=255)
    canvas.paste(ss, (sx, sy), mask)

    # Dynamic island (pill at top of screen)
    island_w, island_h = 230, 38
    island_x = sx + (sw - island_w) // 2
    island_y = sy + 22
    island = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    idr = ImageDraw.Draw(island)
    idr.rounded_rectangle((island_x, island_y, island_x + island_w, island_y + island_h),
                           radius=island_h // 2, fill=(0, 0, 0, 255))
    canvas.alpha_composite(island)


def draw_centered_multiline(draw, text, font, x, y, color, line_spacing=8, max_width=None, shadow=None):
    lines = text.split('\n')
    total_h = 0
    metrics = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        lw = bbox[2] - bbox[0]
        lh = bbox[3] - bbox[1]
        metrics.append((line, lw, lh, bbox))
        total_h += lh + line_spacing
    total_h -= line_spacing
    cy = y
    for (line, lw, lh, bbox) in metrics:
        tx = x - lw // 2 - bbox[0]
        if shadow:
            sx_off, sy_off, sa = shadow
            draw.text((tx + sx_off, cy + sy_off - bbox[1]), line, font=font,
                       fill=(0, 0, 0, sa))
        draw.text((tx, cy - bbox[1]), line, font=font, fill=color)
        cy += lh + line_spacing
    return total_h


def compose(slug, title, subtitle):
    src_path = os.path.join(SRC_DIR, f'{slug}.png')
    if not os.path.exists(src_path):
        print(f'  ⚠️  missing source: {src_path} — skipping')
        return False

    # 1) Background gradient
    canvas = vertical_gradient((W, H), CORAL_TOP, CREAM)

    # 2) Soft yellow glow blob in upper-left for joy/highlight
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((-400, -300, 800, 600), fill=(YELLOW[0], YELLOW[1], YELLOW[2], 50))
    glow = glow.filter(ImageFilter.GaussianBlur(100))
    canvas.alpha_composite(glow)

    # 3) JOY wordmark mini in top-right
    d = ImageDraw.Draw(canvas)
    logo_font = load_font(58, bold=True)
    d.text((W - 220, 60), 'JOY', font=logo_font, fill=WHITE)
    d.text((W - 224, 56), 'JOY', font=logo_font, fill=CORAL_DEEP)  # subtle outline trick
    d.text((W - 220, 60), 'JOY', font=logo_font, fill=WHITE)

    # 4) Title (big, white with shadow)
    title_font = load_font(96, bold=True)
    title_y = 180
    title_h = draw_centered_multiline(
        d, title, title_font, W // 2, title_y, WHITE,
        line_spacing=10, shadow=(4, 8, 90),
    )

    # 5) Subtitle
    subtitle_font = load_font(44, bold=False)
    subtitle_y = title_y + title_h + 50
    sub_h = draw_centered_multiline(
        d, subtitle, subtitle_font, W // 2, subtitle_y,
        (255, 255, 255, 220), line_spacing=8, shadow=(2, 4, 60),
    )

    # 6) Phone frame with screenshot
    # Target screenshot size inside frame: 800x1731 (390:844 aspect)
    src = Image.open(src_path)
    target_w = 800
    target_h = int(target_w * 844 / 390)  # 1731
    sx = (W - target_w) // 2
    sy = subtitle_y + sub_h + 110
    # Make sure it fits within H - MARGIN
    if sy + target_h > H - MARGIN:
        scale = (H - MARGIN - sy) / target_h
        target_w = int(target_w * scale)
        target_h = int(target_h * scale)
        sx = (W - target_w) // 2
    draw_iphone_frame(canvas, sx, sy, target_w, target_h, src)

    # 7) Save
    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, f'{slug}.png')
    canvas.convert('RGB').save(out_path, 'PNG', optimize=True)
    print(f'  ✅ {out_path}  ({os.path.getsize(out_path) // 1024} KB)')
    return True


if __name__ == '__main__':
    print('🎨 Generating App Store promotional screenshots (1290x2796)…')
    print(f'   Source dir : {SRC_DIR}')
    print(f'   Output dir : {OUT_DIR}')
    ok = 0
    for sc in SCREENS:
        if compose(sc['slug'], sc['title'], sc['subtitle']):
            ok += 1
    print(f'Done — {ok}/{len(SCREENS)} composites generated.')
