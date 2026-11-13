"""Stay B shorts 01 - text + illustration motion draft (no footage, no audio).
Renders 1080x1920 @30fps frames with Pillow and pipes them to ffmpeg.
Colors: Stay B v2 design tokens (work/design/stayb-v2/design-spec.md 2-1).
Fonts: Bricolage Grotesque (headings) + Figtree (body), SIL OFL 1.1, bundled in ./fonts with licenses.
Illustrations: drawn in code.
Usage: python3 make_draft.py <out.mp4> [--stills <dir>]
"""
import math, subprocess, sys, os
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, DUR = 1080, 1920, 30, 20.0

def hx(s): s = s.lstrip("#"); return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
# v2 tokens (light)
PAPER = hx("#FBF7F0"); SURFACE = hx("#FFFFFF"); SURFACE_WARM = hx("#FFFDF9")
INK = hx("#16302F"); MUTED = hx("#4E605E")
SEA = hx("#0B6B66"); SEA_STRONG = hx("#08524E"); SEA_TINT = hx("#DDEFEC")
SUN = hx("#F4B942"); CLAY = hx("#A9481F"); WARM_TINT = hx("#FCEBD7")
LINE = hx("#E6DED1"); LINE_STRONG = hx("#C9BFAE")
BG = PAPER

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_H = os.path.join(HERE, "fonts", "BricolageGrotesque-VF.ttf")
FONT_B = os.path.join(HERE, "fonts", "Figtree-VF.ttf")
_cache = {}
def FH(w, s):  # heading: Bricolage Grotesque
    k = ("H", w, s)
    if k not in _cache:
        f = ImageFont.truetype(FONT_H, s); f.set_variation_by_name(w); _cache[k] = f
    return _cache[k]
def FB(w, s):  # body: Figtree
    k = ("B", w, s)
    if k not in _cache:
        f = ImageFont.truetype(FONT_B, s); f.set_variation_by_name(w); _cache[k] = f
    return _cache[k]

f_hero = FH("Bold", 116); f_big = FH("Bold", 88); f_logo = FH("Bold", 160)
f_mid = FB("SemiBold", 54); f_small = FB("Medium", 40); f_tiny = FB("Medium", 30)

def ease(t): t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3
def prog(t, a, d=0.5): return ease((t - a) / d)
def mix(c1, c2, k): return tuple(int(c1[i] + (c2[i] - c1[i]) * k) for i in range(3))

def text_c(d, y, s, font, fill, alpha=1.0, dy=0, bg=None):
    col = mix(bg or BG, fill, alpha)
    w = d.textlength(s, font=font)
    d.text(((W - w) / 2, y + dy * (1 - alpha)), s, font=font, fill=col)

def lines_in(d, t, start, y, lines, font, fill, gap=1.2, stagger=0.25):
    for i, s in enumerate(lines):
        a = prog(t, start + i * stagger)
        text_c(d, y + i * font.size * gap, s, font, fill, a, dy=40)

def highlight_line(d, t, start, y, s, font):
    """Ink text with a sun highlighter stroke behind (sun = surface accent; text on it is ink)."""
    a = prog(t, start)
    if a <= 0: return
    w = d.textlength(s, font=font)
    x = (W - w) / 2
    hl = prog(t, start + 0.2, 0.5)
    if hl > 0:
        y0 = y + font.size * 0.55
        d.rounded_rectangle([x - 14, y0, x - 14 + (w + 28) * hl, y0 + font.size * 0.5], radius=10, fill=mix(BG, SUN, a))
    d.text((x, y + 40 * (1 - a)), s, font=font, fill=mix(BG, INK, a))

FOOTER_Y = H - 400  # above platform UI safe zone
def footer(d):
    s = "Concept · Stay B is a working name"
    w = d.textlength(s, font=f_tiny)
    d.text(((W - w) / 2, FOOTER_Y), s, font=f_tiny, fill=MUTED)

def route(d, x0, x1, y, k, stops=3):
    """Signature 'route line': dotted line + station dots (design-spec 1)."""
    if k <= 0: return
    xe = x0 + (x1 - x0) * k
    x = x0
    while x < xe:
        d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=SEA); x += 22
    for i in range(stops):
        sx = x0 + (x1 - x0) * i / (stops - 1)
        if sx <= xe + 1:
            d.ellipse([sx - 14, y - 14, sx + 14, y + 14], fill=SURFACE, outline=SEA, width=6)

def suitcase(d, cx, cy, k, tilt=0):
    s = 1.0 * k
    if s <= 0: return
    w, h = 300 * s, 400 * s
    x0, y0 = cx - w / 2, cy - h / 2 + tilt
    d.rounded_rectangle([cx - 70 * s, y0 - 90 * s, cx + 70 * s, y0 + 10 * s], radius=30 * s, outline=SEA_STRONG, width=max(1, int(18 * s)))
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=40 * s, fill=SEA)
    for i in (1, 2):
        xx = x0 + w * i / 3
        d.line([xx, y0 + 30 * s, xx, y0 + h - 30 * s], fill=SEA_STRONG, width=max(1, int(14 * s)))
    d.rounded_rectangle([x0 + 40 * s, y0 + 60 * s, x0 + 140 * s, y0 + 120 * s], radius=10 * s, fill=SUN)
    for xx in (x0 + 60 * s, x0 + w - 60 * s):
        d.ellipse([xx - 24 * s, y0 + h - 4 * s, xx + 24 * s, y0 + h + 44 * s], fill=INK)

# phone geometry: bottom edge (1440) stays well above the footer line (1520)
PH_W, PH_H, PH_CY = 520, 880, 1000
BEZEL, SCR_R = 22, 50
STAGES = ["Before I arrive", "Just arrived", "Study, life & work", "Visa & after graduation"]
BTN_PAD = 32  # equal left/right inner padding of stage buttons
def _btn_font(btn_w):
    for size in (34, 32, 30, 28):
        f = FB("SemiBold", size)
        if max(f.getlength(s) for s in STAGES) <= btn_w - 2 * BTN_PAD:
            return f
    return FB("SemiBold", 26)

def phone_screen(t, sw, sh):
    """Draws the phone screen content on its own layer so everything is clipped to the screen."""
    scr = Image.new("RGB", (sw, sh), SURFACE)
    d = ImageDraw.Draw(scr)
    d.text((48, 56), "Stay B", font=FH("Bold", 52), fill=SEA)
    d.text((48, 126), "Which stage are you in?", font=FB("Medium", 30), fill=MUTED)
    bx0, bx1 = 30, sw - 30
    bf = _btn_font(bx1 - bx0)
    sel = 1 if t > 4.3 else -1
    for i, s in enumerate(STAGES):
        a = prog(t, 2.6 + i * 0.2, 0.4)
        by = 190 + i * 106 + (1 - a) * 30
        on = (i == sel)
        fill = SEA if on else mix(SURFACE, SEA_TINT, a)
        d.rounded_rectangle([bx0, by, bx1, by + 92], radius=24, fill=fill)
        tc = SURFACE if on else mix(SURFACE, SEA, a)
        th = bf.getbbox(s)
        d.text((bx0 + BTN_PAD, by + (92 - (th[3] + th[1])) / 2), s, font=bf, fill=tc)
    # tap ripple on "Just arrived"
    if 3.9 < t < 4.6:
        r = 30 + 40 * (t - 3.9)
        cy = 190 + 106 + 46
        d.ellipse([sw / 2 - r, cy - r, sw / 2 + r, cy + r], outline=SUN, width=6)
    # guide card slides up from the screen bottom (clipped by the screen layer)
    g = prog(t, 4.8, 0.6)
    if g > 0:
        ch = 210
        gy = sh - ch * g
        d.rounded_rectangle([0, gy, sw, sh + 40], radius=36, fill=SEA_TINT)
        d.text((48, gy + 26), "Settling-in checklist", font=FH("Bold", 36), fill=SEA)
        for j in range(3):
            yy = gy + 86 + j * 40
            d.rounded_rectangle([48, yy, 80, yy + 32], radius=8, outline=SEA, width=4)
            d.rounded_rectangle([100, yy + 10, 100 + [260, 200, 230][j], yy + 22], radius=6, fill=hx("#9FCFC9"))
    return scr

def phone(im, d, t, cx, cy, k):
    if k <= 0: return
    w, h = PH_W, PH_H
    y_off = (1 - k) * 200
    x0, y0 = int(cx - w / 2), int(cy - h / 2 + y_off)
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=70, fill=INK)
    sw, sh = w - 2 * BEZEL, h - 2 * BEZEL
    scr = phone_screen(t, sw, sh)
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh - 1], radius=SCR_R, fill=255)
    im.paste(scr, (x0 + BEZEL, y0 + BEZEL), mask)

def kit_and_card(d, t, k):
    if k <= 0: return
    # welcome kit box (offline = clay + sun)
    bx, by = 200, 820 + (1 - k) * 120
    d.rounded_rectangle([bx, by + 60, bx + 380, by + 360], radius=24, fill=CLAY)
    d.polygon([(bx - 10, by + 60), (bx + 390, by + 60), (bx + 350, by), (bx + 30, by)], fill=hx("#8E3B18"))
    d.rectangle([bx + 300, by, bx + 336, by + 360], fill=SUN)
    d.text((bx + 40, by + 280), "Welcome kit", font=FB("Bold", 34), fill=SURFACE)
    # membership card
    c = prog(t, 8.0, 0.6)
    if c > 0:
        cx0, cy0 = 520 + (1 - c) * 300, 980
        d.rounded_rectangle([cx0, cy0, cx0 + 400, cy0 + 250], radius=26, fill=SEA)
        d.text((cx0 + 34, cy0 + 28), "Stay B", font=FH("Bold", 50), fill=SURFACE)
        d.text((cx0 + 34, cy0 + 95), "MEMBER", font=FB("SemiBold", 26), fill=SEA_TINT)
        d.ellipse([cx0 + 300, cy0 + 150, cx0 + 360, cy0 + 210], fill=SUN)
        d.rounded_rectangle([cx0 + 34, cy0 + 180, cx0 + 220, cy0 + 196], radius=8, fill=hx("#5E9F9A"))

def icon(d, kind, cx, cy, a):
    if a <= 0: return
    r = 120 * a
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WARM_TINT)
    s = a
    if kind == 0:  # info session: screen + stand
        d.rounded_rectangle([cx - 70 * s, cy - 60 * s, cx + 70 * s, cy + 20 * s], radius=10 * s, fill=CLAY)
        d.line([cx, cy + 20 * s, cx, cy + 60 * s], fill=CLAY, width=max(1, int(10 * s)))
        d.line([cx - 40 * s, cy + 60 * s, cx + 40 * s, cy + 60 * s], fill=CLAY, width=max(1, int(10 * s)))
        d.rectangle([cx - 40 * s, cy - 30 * s, cx + 10 * s, cy - 18 * s], fill=SUN)
    elif kind == 1:  # first-week help: calendar with check
        d.rounded_rectangle([cx - 70 * s, cy - 60 * s, cx + 70 * s, cy + 70 * s], radius=14 * s, fill=SURFACE_WARM, outline=CLAY, width=max(1, int(8 * s)))
        d.rectangle([cx - 70 * s, cy - 60 * s, cx + 70 * s, cy - 25 * s], fill=CLAY)
        d.line([(cx - 30 * s, cy + 20 * s), (cx - 5 * s, cy + 45 * s), (cx + 40 * s, cy - 5 * s)], fill=SEA, width=max(1, int(12 * s)))
    else:  # meetups: three heads
        for i, ox in enumerate((-55, 0, 55)):
            col = SUN if i == 1 else CLAY
            d.ellipse([cx + ox * s - 22 * s, cy - 50 * s, cx + ox * s + 22 * s, cy - 6 * s], fill=col)
            d.pieslice([cx + ox * s - 40 * s, cy, cx + ox * s + 40 * s, cy + 80 * s], 180, 360, fill=col)

def frame(t):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    if t < 2.0:  # hook
        lines_in(d, t, 0.0, 420, ["New to", "Busan?"], f_hero, SEA, stagger=0.2)
        suitcase(d, W / 2, 1180, prog(t, 0.3, 0.6), tilt=8 * math.sin(t * 6))
    elif t < 7.0:
        lines_in(d, t, 2.0, 230, ["Pick your stage."], f_big, SEA)
        highlight_line(d, t, 4.6, 340, "Get simple guides.", f_big)
        phone(im, d, t, W / 2, PH_CY, prog(t, 2.1, 0.6))
    elif t < 13.0:
        lines_in(d, t, 7.0, 420, ["And real help", "in Busan."], f_hero, CLAY, stagger=0.3)
        kit_and_card(d, t, prog(t, 7.4, 0.6))
        a = prog(t, 9.5, 0.6)
        text_c(d, 1290, "Welcome kit · Membership card", f_small, MUTED, a, dy=20)
        text_c(d, 1350, "(mockup)", f_tiny, MUTED, a, dy=20)
    elif t < 17.0:
        labels = ["Info sessions", "First-week help", "Meetups"]
        lines_in(d, t, 13.0, 300, ["Meet us offline"], f_big, CLAY)
        for i, s in enumerate(labels):
            a = prog(t, 13.4 + i * 0.6, 0.5)
            y = 640 + i * 300
            icon(d, i, 300, y, a)
            d.text((470 + (1 - a) * 40, y - 34), s, font=f_mid, fill=mix(BG, INK, a))
    else:  # end card
        a = prog(t, 17.0, 0.5)
        text_c(d, 450, "Stay B", f_logo, SEA, a, dy=30)
        bar = 240 * prog(t, 17.3, 0.5)
        d.rounded_rectangle([W / 2 - bar, 670, W / 2 + bar, 684], radius=7, fill=SUN)
        lines_in(d, t, 17.5, 770, ["Your first place", "to ask in Busan."], f_big, INK, stagger=0.2)
        b = prog(t, 18.2, 0.5)
        text_c(d, 1030, "Free guides · Free to ask", f_mid, CLAY, b, dy=20)
        if b > 0:
            col = mix(BG, SEA, b)
            d.rounded_rectangle([W / 2 - 230, 1140, W / 2 + 230, 1360], radius=24, outline=col, width=5)
            text_c(d, 1190, "[QR / link here]", f_small, SEA, b)
            text_c(d, 1260, "domain to be decided", f_tiny, MUTED, b)
        route(d, W / 2 - 300, W / 2 + 300, 1440, prog(t, 18.6, 0.8))
    footer(d)
    return im

def main():
    out = sys.argv[1]
    stills = sys.argv[sys.argv.index("--stills") + 1] if "--stills" in sys.argv else None
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-shortest", "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "32k", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    n = int(DUR * FPS)
    for i in range(n):
        p.stdin.write(frame(i / FPS).tobytes())
    p.stdin.close(); p.wait()
    if stills:
        os.makedirs(stills, exist_ok=True)
        for idx, tt in enumerate([1.8, 6.5, 12.0, 16.5, 19.5], 1):
            frame(tt).save(os.path.join(stills, f"storyboard_{idx:02d}.png"), optimize=True)
        # V-3 check sheet: 3.5 / 4.5 / 5.0 / 5.5 s side by side (half size)
        ts = [3.5, 4.5, 5.0, 5.5]
        sheet = Image.new("RGB", (W // 2 * len(ts), H // 2), BG)
        sd = ImageDraw.Draw(sheet)
        for i, tt in enumerate(ts):
            sheet.paste(frame(tt).resize((W // 2, H // 2)), (i * W // 2, 0))
            sd.text((i * W // 2 + 20, 20), f"{tt:.1f}s", font=FB("Bold", 32), fill=CLAY)
        sheet.save(os.path.join(stills, "storyboard_06_check_4.5-5.5s.png"), optimize=True)

if __name__ == "__main__":
    main()
