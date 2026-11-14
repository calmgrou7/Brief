"""Shared drawing kit for Stay B shorts - design A "Editorial Note" (2026-11-14).
Used by make_draft.py (video) and make_thumbs.py (covers).
Rules: work/marketing/20261114-shorts-visual-review.md (editor instructions 1-11).
Tokens: work/design/stayb-v2/design-spec.md 2-1. Symbol: design-spec 3, option A "lying B".
Fonts (SIL OFL 1.1, ./fonts): Bricolage Grotesque (display, opsz 96 / wght 700),
Figtree (body), Gaegu Bold (one handwritten note per episode).
Illustrations are drawn here in code at 2x and downsampled (anti-aliased).
"""
import math, os
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
# safe zones (instruction 1)
SAFE_TOP, SAFE_BOTTOM, SAFE_RIGHT, LEFT = 220, H - 420, W - 140, 88

def hx(s): s = s.lstrip("#"); return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
PAPER = hx("#FBF7F0"); SURFACE = hx("#FFFFFF")
INK = hx("#16302F"); MUTED = hx("#4E605E")
SEA = hx("#0B6B66"); SEA_TINT = hx("#DDEFEC")
SUN = hx("#F4B942"); CLAY = hx("#A9481F"); WARM_TINT = hx("#FCEBD7")
WHITE = SURFACE

def mix(c1, c2, k): return tuple(int(round(c1[i] + (c2[i] - c1[i]) * k)) for i in range(3))
GRID = mix(PAPER, SEA, 0.07)

HERE = os.path.dirname(os.path.abspath(__file__))
_fc = {}
def FD(size):
    """Display: Bricolage Grotesque, optical size 96, weight 700, width 100."""
    k = ("D", size)
    if k not in _fc:
        f = ImageFont.truetype(os.path.join(HERE, "fonts", "BricolageGrotesque-VF.ttf"), size)
        f.set_variation_by_axes([96, 700, 100]); _fc[k] = f
    return _fc[k]
def FB(weight, size):
    """Body: Figtree (weight name e.g. 'SemiBold', 'Bold', 'Medium')."""
    k = ("B", weight, size)
    if k not in _fc:
        f = ImageFont.truetype(os.path.join(HERE, "fonts", "Figtree-VF.ttf"), size)
        f.set_variation_by_name(weight); _fc[k] = f
    return _fc[k]
def FG(size):
    """Handwriting: Gaegu Bold (one place per episode only)."""
    k = ("G", size)
    if k not in _fc:
        _fc[k] = ImageFont.truetype(os.path.join(HERE, "fonts", "Gaegu-Bold.ttf"), size)
    return _fc[k]

def cap(font): return -font.getbbox("H", anchor="ls")[1]

# ---------------------------------------------------------------- sprites
class Sprite:
    """RGBA image + resting top-left position. Revealed by a bottom-edge mask."""
    def __init__(self, img, x, y): self.img, self.x, self.y = img, int(x), int(y)
    def bottom(self): return self.y + self.img.height
    def right(self): return self.x + self.img.width
    def paste(self, frame, p=1.0):
        p = max(0.0, min(1.0, p))
        h = self.img.height
        vis = int(round(h * p))
        if vis <= 0: return
        crop = self.img.crop((0, 0, self.img.width, vis))
        frame.paste(crop, (self.x, self.y + h - vis), crop)

def text_sprite(x, baseline, segments, font, hl=None, hl_color=SUN):
    """One text line. segments = [(text, color), ...]. hl = index of the segment to
    put on a sun highlighter (text on it must be ink)."""
    full = "".join(s for s, _ in segments)
    l, t, r, b = font.getbbox(full, anchor="ls")
    pad_x, pad_top = 20, 6
    bot = max(b, int(font.size * 0.10)) + 6
    w = int(r - min(l, 0) + 2 * pad_x)
    h = int(bot - t + pad_top)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ox, oy = pad_x - min(l, 0), pad_top - t  # baseline origin inside sprite
    cx = ox
    for i, (s, col) in enumerate(segments):
        sw = font.getlength(s)
        if hl is not None and i == hl:
            st = s.rstrip(); sw2 = font.getlength(st)
            d.rounded_rectangle([cx - 14, oy - font.size * 0.30, cx + sw2 + 14, oy + font.size * 0.05],
                                radius=max(6, font.size // 18), fill=hl_color)
        cx += sw
    cx = ox
    for s, col in segments:
        d.text((cx, oy), s, font=font, fill=col, anchor="ls")
        cx += font.getlength(s)
    sp = Sprite(img, x - ox, baseline - oy)
    sp.text_right = x + font.getlength(full.rstrip())
    return sp

def image_sprite(img, x, y): return Sprite(img, x, y)

# ---------------------------------------------------------------- 2x canvas
SS = 2
class Pen:
    """Drawing on a 2x RGBA canvas with 1x coordinates. Line widths in 1x px."""
    def __init__(self, w=W, h=H):
        self.w, self.h = w, h
        self.im = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)
    def _b(self, box): return [v * SS for v in box]
    def rrect(self, box, r, fill=None, outline=INK, width=7):
        self.d.rounded_rectangle(self._b(box), radius=r * SS, fill=fill, outline=outline, width=int(width * SS) if outline else 0)
    def rect(self, box, fill=None, outline=INK, width=7):
        self.d.rectangle(self._b(box), fill=fill, outline=outline, width=int(width * SS) if outline else 0)
    def ellipse(self, box, fill=None, outline=INK, width=7):
        self.d.ellipse(self._b(box), fill=fill, outline=outline, width=int(width * SS) if outline else 0)
    def circle(self, cx, cy, r, **k): self.ellipse([cx - r, cy - r, cx + r, cy + r], **k)
    def line(self, pts, fill=INK, width=7, round_caps=True):
        P = [(x * SS, y * SS) for x, y in pts]
        self.d.line(P, fill=fill, width=int(width * SS), joint="curve")
        if round_caps:
            rr = width * SS / 2
            for x, y in (P[0], P[-1]):
                self.d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=fill)
    def polygon(self, pts, fill=None, outline=INK, width=7):
        P = [(x * SS, y * SS) for x, y in pts]
        if fill: self.d.polygon(P, fill=fill)
        if outline: self.line(list(pts) + [pts[0], pts[1]], fill=outline, width=width, round_caps=False)
    def done(self):
        return self.im.resize((self.w, self.h), Image.LANCZOS)

def body_text(pen, xy, s, weight, size, fill=INK):
    f = FB(weight, size * SS)
    pen.d.text((xy[0] * SS, xy[1] * SS), s, font=f, fill=fill, anchor="ls")
def display_text(pen, xy, s, size, fill=INK):
    f = FD(size * SS)
    pen.d.text((xy[0] * SS, xy[1] * SS), s, font=f, fill=fill, anchor="ls")

def waves(pen, x0, x1, y, amp=10, period=120, fill=WHITE, width=6):
    pts = [(x, y + amp * math.sin((x - x0) / period * 2 * math.pi)) for x in range(int(x0), int(x1) + 1, 6)]
    pen.line(pts, fill=fill, width=width)

# ---------------------------------------------------------------- symbol (option A, lying B)
def _symbol_path(n=48):
    """SVG: M5.5 21.5 A4.6 6.2 0 0 1 14.7 21.5 A5.4 7.2 0 0 1 25.5 21.5 Z (32x32 viewBox)."""
    pts = []
    for cx, rx, ry in ((10.1, 4.6, 6.2), (20.1, 5.4, 7.2)):
        for i in range(n + 1):
            a = math.pi + math.pi * i / n
            pts.append((cx + rx * math.cos(a), 21.5 + ry * math.sin(a)))
    pts.append((5.5, 21.5))
    return pts

def symbol(size, box=SEA, mark=WHITE):
    """Rounded-square symbol. Colour: box sea + mark white. Mono/inverse: box=fg colour, mark=bg colour."""
    S = 16
    px = size * S
    im = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    k = px / 32
    d.rounded_rectangle([0, 0, px - 1, px - 1], radius=int(9 * k), fill=box)
    P = [(x * k, y * k) for x, y in _symbol_path()]
    wdt = int(round(3.4 * k))
    d.line(P + [P[1]], fill=mark, width=wdt, joint="curve")
    return im.resize((size, size), Image.LANCZOS)

def label_sprite(text, y_top, on="cream"):
    """'[symbol] STAY B · GUIDE 01' label, Figtree 700 34px, left aligned."""
    col = {"cream": SEA, "teal": WHITE, "warm": SEA, "sun": INK}[on]
    sym = symbol(46, box=SEA, mark=WHITE) if on in ("cream", "warm") else \
        (symbol(46, box=WHITE, mark=SEA) if on == "teal" else symbol(46, box=INK, mark=SUN))
    f = FB("Bold", 34)
    tw = int(f.getlength(text))
    img = Image.new("RGBA", (46 + 18 + tw + 10, 56), (0, 0, 0, 0))
    img.paste(sym, (0, 5), sym)
    d = ImageDraw.Draw(img)
    d.text((46 + 18, 5 + 23 + cap(f) / 2), text, font=f, fill=col, anchor="ls")
    return Sprite(img, LEFT, y_top)

NOTICE = ("Concept ·", "Stay B is a working name")
def notice(pen_or_draw, color, y=1440, lines=NOTICE):
    """Rule 11 notice, 32px, two lines so it stays out of the illustrations (x 88-480)."""
    f = FB("Medium", 32)
    for i, s in enumerate(lines):
        if isinstance(pen_or_draw, Pen):
            body_text(pen_or_draw, (LEFT, y + i * 40), s, "Medium", 32, color)
        else:
            pen_or_draw.text((LEFT, y + i * 40), s, font=f, fill=color, anchor="ls")

def grid(d, x0, y0, x1, y1, step=48):
    x = x0
    while x <= x1:
        d.line([x, y0, x, y1], fill=GRID, width=2); x += step
    y = y0
    while y <= y1:
        d.line([x0, y, x1, y], fill=GRID, width=2); y += step

# ---------------------------------------------------------------- illustrations (spec 5-1, ink outline 7px)
def suitcase(pen, x0, y0, w, h):
    cx = x0 + w / 2
    pen.rrect([cx - 72, y0 - 84, cx + 72, y0 + 20], 30, fill=None, outline=INK, width=7)
    pen.rrect([x0, y0, x0 + w, y0 + h], 48, fill=SUN)
    for k in (0.34, 0.66):
        xx = x0 + w * k
        pen.line([(xx, y0 + 46), (xx, y0 + h - 46)], width=7)
    pen.rrect([x0 + w * 0.5, y0 + 90, x0 + w * 0.82, y0 + 170], 12, fill=SEA_TINT)
    pen.circle(x0 + w * 0.18, y0 + h * 0.62, 34, fill=WARM_TINT)  # sticker
    for xx in (x0 + 78, x0 + w - 78):
        pen.circle(xx, y0 + h + 14, 32, fill=WHITE)

STAGES = ["Before I arrive", "Just arrived", "Study, life & work", "Visa & after graduation"]
def phone(pen, x0, y0, w, h, selected=None):
    """Phone with Stay B stage buttons; only 3 labels sit above the bottom safe line."""
    pen.rrect([x0, y0, x0 + w, y0 + h], 74, fill=INK, outline=INK, width=7)
    sx0, sy0, sx1, sy1 = x0 + 26, y0 + 26, x0 + w - 26, y0 + h - 26
    pen.rrect([sx0, sy0, sx1, sy1], 52, fill=PAPER, outline=None)
    pen.rrect([(sx0 + sx1) / 2 - 70, sy0 + 18, (sx0 + sx1) / 2 + 70, sy0 + 44], 13, fill=INK, outline=None)
    body_text(pen, (sx0 + 36, sy0 + 120), "Which stage?", "Bold", 44, INK)
    bx0, bx1 = sx0 + 28, sx1 - 28
    for i, s in enumerate(STAGES):
        by = sy0 + 160 + i * 124
        on = (i == selected)
        pen.rrect([bx0, by, bx1, by + 104], 26, fill=SUN if on else SEA_TINT, outline=INK, width=5)
        if by + 104 < SAFE_BOTTOM + 10:
            body_text(pen, (bx0 + 30, by + 66), s, "SemiBold", 40, INK)
        else:  # below the safe line: skeleton bar instead of words
            pen.rrect([bx0 + 30, by + 40, bx0 + 260, by + 64], 12, fill=mix(SEA_TINT, SEA, 0.35), outline=None)

def notebook(pen, x0, y0, x1, y1, rows):
    pen.rrect([x0, y0, x1, y1], 28, fill=WHITE)
    for y in range(int(y0) + 170, int(y1) - 20, 120):
        pen.line([(x0 + 24, y + 96), (x1 - 24, y + 96)], fill=SEA_TINT, width=4, round_caps=False)
    for x in range(int(x0) + 60, int(x1) - 30, 76):
        pen.rrect([x, y0 - 30, x + 22, y0 + 34], 11, fill=SEA_TINT, width=6)
    display_text(pen, (x0 + 50, y0 + 112), "Checklist", 60, INK)
    boxes = []
    for i, s in enumerate(rows):
        yy = y0 + 170 + i * 120
        pen.rrect([x0 + 50, yy, x0 + 110, yy + 60], 12, fill=SEA_TINT, width=6)
        body_text(pen, (x0 + 130, yy + 46), s, "SemiBold", 44, INK)
        boxes.append((x0 + 50, yy))
    return boxes

def check_mark(x, y):
    p = Pen(90, 90)
    p.line([(14, 44), (36, 66), (78, 14)], fill=SEA, width=12)
    return Sprite(p.done(), x - 4, y - 14)

def village(pen):
    """Hill village (Gamcheon-like stepped boxes) rising to the right, cut by the frame."""
    fills = [SEA_TINT, SUN, WARM_TINT, WHITE]
    rows = [  # (y_top, height, x_start, widths)
        (1100, 160, 640, [150, 120, 170]),
        (1240, 200, 520, [140, 180, 120, 160]),
        (1420, 220, 500, [170, 130, 190, 150, 160]),
        (1620, 320, -40, [200, 160, 210, 170, 180, 200]),
    ]
    k = 0
    for yt, hh, xs, ws in rows:
        x = xs
        for wdt in ws:
            pen.rect([x, yt, x + wdt, yt + hh], fill=fills[k % 4])
            for j in range(2):
                pen.circle(x + wdt * (0.32 + 0.36 * j), yt + hh * 0.38, 13, fill=SUN if fills[k % 4] != SUN else WHITE, width=5)
            pen.rect([x + wdt * 0.38, yt + hh * 0.62, x + wdt * 0.62, yt + hh], fill=INK, outline=None)
            x += wdt; k += 1
    pen.circle(880, 930, 64, fill=SUN)

def welcome_kit(pen, x0, y0, x1, y1):
    pen.rect([x0, y0 + 70, x1, y1], fill=SUN)
    pen.polygon([(x0 - 24, y0 + 70), (x1 + 24, y0 + 70), (x1 - 10, y0), (x0 + 10, y0)], fill=WARM_TINT)
    rx = x0 + 400  # ribbon right of the label
    pen.rect([rx, y0, rx + 64, y1], fill=SEA_TINT)
    body_text(pen, (x0 + 40, y1 - 60 if y1 - 60 < SAFE_BOTTOM else SAFE_BOTTOM - 20), "WELCOME KIT", "Bold", 44, INK)

def member_card(x0, y0, w=520, h=330):
    p = Pen(w + 20, h + 20)
    p.rrect([6, 6, w + 6, h + 6], 34, fill=SEA_TINT)
    sym = symbol(76)
    display_text(p, (130, 104), "Stay B", 64, INK)
    body_text(p, (46, h - 40), "MEMBER", "Bold", 40, INK)
    p.circle(w - 70, h - 60, 34, fill=SUN)
    img = p.done()
    img.paste(sym, (42, 42), sym)
    return Sprite(img, x0 - 6, y0 - 6)

def postcard(pen, x0, y0, x1, y1):
    pen.rrect([x0, y0, x1, y1], 22, fill=WARM_TINT)
    mx = x0 + (x1 - x0) * 0.52
    pen.line([(mx, y0 + 40), (mx, y1 - 40)], width=5)
    pen.rect([mx + 50, y0 + 40, mx + 170, y0 + 170], fill=SUN, width=6)
    pen.line([(mx + 70, y0 + 140), (mx + 92, y0 + 92), (mx + 112, y0 + 140), (mx + 132, y0 + 92), (mx + 152, y0 + 140)], width=5)
    for i in range(3):
        pen.line([(mx + 50, y0 + 240 + i * 60), (x1 - 40, y0 + 240 + i * 60)], width=5)
    # mini Gwangan arch + waves on the picture side
    bx0, bx1, by = x0 + 40, mx - 40, y0 + 230
    pen.line([(bx0, by), (bx0 + (bx1 - bx0) * 0.5, by - 90), (bx1, by)], width=6)
    pen.line([(bx0 - 10, by), (bx1 + 10, by)], width=6)
    waves(pen, bx0, bx1, by + 60, amp=8, period=70, fill=SEA, width=5)
    waves(pen, bx0, bx1, by + 100, amp=8, period=70, fill=SEA, width=5)

def ferry(pen):
    waves(pen, -20, 1100, 1352, amp=9, period=140, fill=WHITE, width=6)
    pen.polygon([(430, 1250), (1150, 1250), (1110, 1340), (480, 1340)], fill=SEA_TINT)
    pen.rect([560, 1140, 1000, 1250], fill=WHITE)
    for i in range(5):
        pen.circle(612 + i * 84, 1195, 20, fill=SUN, width=5)
    pen.rect([700, 1050, 780, 1140], fill=SUN)
    pen.rect([700, 1050, 780, 1078], fill=INK, outline=INK)
    waves(pen, -20, 1100, 1390, amp=9, period=140, fill=SEA_TINT, width=6)
    pen.line([(250, 990), (275, 970), (300, 990)], width=6)
    pen.line([(300, 990), (325, 970), (350, 990)], width=6)

def gwangan(pen, x0, x1, deck_y, top_y):
    """Gwangan Bridge arches: two towers, suspension cables, deck."""
    t1 = x0 + (x1 - x0) * 0.27; t2 = x0 + (x1 - x0) * 0.73
    def curve(a, b, ya, yb, sag_y):
        pts = []
        for i in range(41):
            u = i / 40
            x = a + (b - a) * u
            base = ya + (yb - ya) * u
            y = base + (sag_y - min(ya, yb)) * 4 * u * (1 - u) * (1 if sag_y > min(ya, yb) else 0)
            pts.append((x, y))
        return pts
    pen.line(curve(x0 - 40, t1, deck_y - 10, top_y + 10, top_y + 10), width=6)
    pen.line(curve(t1, t2, top_y + 10, top_y + 10, deck_y - 30), width=6)
    pen.line(curve(t2, x1 + 60, top_y + 10, deck_y - 10, top_y + 10), width=6)
    for t in (t1, t2):
        pen.rect([t - 18, top_y, t + 18, deck_y + 40], fill=SUN, width=6)
    pen.rect([x0 - 60, deck_y, x1 + 80, deck_y + 22], fill=WHITE, width=6)
    return t1, t2

def clipboard(pen, x0, y0, x1, y1):
    pen.rrect([x0, y0, x1, y1], 30, fill=SEA_TINT)
    pen.rrect([x0 + 40, y0 + 60, x1 - 40, y1 - 40], 14, fill=WHITE, width=6)
    cx = (x0 + x1) / 2
    pen.rrect([cx - 90, y0 - 30, cx + 90, y0 + 70], 18, fill=SUN)
    for i in range(4):
        yy = y0 + 130 + i * 100
        if yy + 50 > y1 - 50: break
        pen.rrect([x0 + 80, yy, x0 + 130, yy + 50], 10, fill=SEA_TINT if i else SUN, width=5)
        pen.rrect([x0 + 160, yy + 16, x1 - 90 - (i % 2) * 60, yy + 34], 9, fill=mix(SEA_TINT, SEA, 0.35), outline=None)
    pen.line([(x0 + 88, y0 + 152), (x0 + 102, y0 + 168), (x0 + 124, y0 + 136)], fill=INK, width=6)

def calendar_clock(pen, x0, y0, x1, y1):
    pen.rrect([x0, y0, x1, y1], 30, fill=WHITE)
    pen.rrect([x0, y0, x1, y0 + 110], 30, fill=SUN)
    pen.rect([x0 + 4, y0 + 70, x1 - 4, y0 + 110], fill=SUN, outline=None)
    pen.line([(x0, y0 + 110), (x1, y0 + 110)], width=7, round_caps=False)
    for x in (x0 + 90, x1 - 90):
        pen.rrect([x - 12, y0 - 34, x + 12, y0 + 40], 12, fill=SEA_TINT, width=6)
    cw = (x1 - x0 - 80) / 5
    for r in range(4):
        for c in range(5):
            cx = x0 + 40 + cw * (c + 0.5); cy = y0 + 170 + r * 80
            if cy > y1 - 30: continue
            pen.circle(cx, cy, 10, fill=mix(SEA_TINT, SEA, 0.35), outline=None)
    pen.circle(x0 + 40 + cw * 2.5, y0 + 250, 34, fill=None, outline=SEA, width=7)
    ccx, ccy, r = x0 - 10, y1 - 60, 120  # clock overlapping the calendar corner
    pen.circle(ccx, ccy, r, fill=WARM_TINT)
    pen.line([(ccx, ccy), (ccx, ccy - 72)], width=8)
    pen.line([(ccx, ccy), (ccx + 54, ccy + 20)], width=8)
    pen.circle(ccx, ccy, 10, fill=INK, outline=None)
