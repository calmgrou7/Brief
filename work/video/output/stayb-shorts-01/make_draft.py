"""Stay B shorts 01 - text + illustration motion draft (no footage, no audio).
Renders 1080x1920 @30fps frames with Pillow and pipes them to ffmpeg.
Fonts: Inter (SIL OFL 1.1, system-installed). Illustrations: drawn in code.
Usage: python3 make_draft.py <out.mp4> [--stills <dir>]
"""
import math, subprocess, sys, os
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, DUR = 1080, 1920, 30, 20.0
BG = (251, 250, 247); NAVY = (31, 78, 121); NAVY_D = (22, 58, 92)
ORANGE = (242, 140, 56); TINT = (220, 232, 243); INK = (28, 36, 46); GREY = (110, 118, 128)
FD = "/usr/share/fonts/opentype/inter/"
def F(w, s): return ImageFont.truetype(FD + f"Inter-{w}.otf", s)
f_hero = F("ExtraBold", 108); f_big = F("Bold", 84); f_mid = F("SemiBold", 54)
f_small = F("Medium", 40); f_tiny = F("Medium", 30); f_logo = F("Black", 150)

def ease(t): t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3
def prog(t, a, d=0.5): return ease((t - a) / d)
def mix(c1, c2, k): return tuple(int(c1[i] + (c2[i] - c1[i]) * k) for i in range(3))

def text_c(d, y, s, font, fill, alpha=1.0, dy=0):
    k = alpha
    col = mix(BG, fill, k)
    w = d.textlength(s, font=font)
    d.text(((W - w) / 2, y + dy * (1 - k)), s, font=font, fill=col)

def lines_in(d, t, start, y, lines, font, fill, gap=1.25, stagger=0.25):
    for i, s in enumerate(lines):
        a = prog(t, start + i * stagger)
        text_c(d, y + i * font.size * gap, s, font, fill, a, dy=40)

def footer(d):
    s = "Concept · Stay B is a working name"
    w = d.textlength(s, font=f_tiny)
    d.text(((W - w) / 2, H - 400), s, font=f_tiny, fill=GREY)  # above platform UI safe zone

def suitcase(d, cx, cy, k, tilt=0):
    s = 1.0 * k
    if s <= 0: return
    w, h = 300 * s, 400 * s
    x0, y0 = cx - w / 2, cy - h / 2 + tilt
    d.rounded_rectangle([cx - 70 * s, y0 - 90 * s, cx + 70 * s, y0 + 10 * s], radius=30 * s, outline=NAVY_D, width=max(1, int(18 * s)))
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=40 * s, fill=NAVY)
    for i in (1, 2):
        xx = x0 + w * i / 3
        d.line([xx, y0 + 30 * s, xx, y0 + h - 30 * s], fill=NAVY_D, width=max(1, int(14 * s)))
    d.rounded_rectangle([x0 + 40 * s, y0 + 60 * s, x0 + 140 * s, y0 + 120 * s], radius=10 * s, fill=ORANGE)
    for xx in (x0 + 60 * s, x0 + w - 60 * s):
        d.ellipse([xx - 24 * s, y0 + h - 4 * s, xx + 24 * s, y0 + h + 44 * s], fill=INK)

def phone(d, t, cx, cy, k):
    if k <= 0: return
    w, h = 520, 900
    y_off = (1 - k) * 200
    x0, y0 = cx - w / 2, cy - h / 2 + y_off
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=70, fill=INK)
    d.rounded_rectangle([x0 + 22, y0 + 22, x0 + w - 22, y0 + h - 22], radius=52, fill=(255, 255, 255))
    d.text((x0 + 70, y0 + 90), "Stay B", font=F("Black", 52), fill=NAVY)
    d.text((x0 + 70, y0 + 160), "Which stage are you in?", font=f_tiny, fill=GREY)
    stages = ["Before I arrive", "Just arrived", "Study, life & work", "Visa & after graduation"]
    sel = 1 if t > 4.3 else -1
    for i, s in enumerate(stages):
        a = prog(t, 2.6 + i * 0.2, 0.4)
        by = y0 + 240 + i * 130 + (1 - a) * 30
        on = (i == sel)
        fill = ORANGE if on else mix((255, 255, 255), TINT, a)
        d.rounded_rectangle([x0 + 60, by, x0 + w - 60, by + 100], radius=26, fill=fill)
        d.text((x0 + 95, by + 30), s, font=F("SemiBold", 34), fill=(255, 255, 255) if on else mix((255, 255, 255), NAVY, a))
    # guide card sliding up after selection
    g = prog(t, 4.8, 0.6)
    if g > 0:
        gy = y0 + h - 22 - 280 * g
        d.rounded_rectangle([x0 + 22, gy, x0 + w - 22, y0 + h - 22], radius=40, fill=TINT)
        d.text((x0 + 70, gy + 40), "Settling-in checklist", font=F("Bold", 36), fill=NAVY)
        for j in range(3):
            yy = gy + 110 + j * 52
            d.rounded_rectangle([x0 + 70, yy, x0 + 104, yy + 34], radius=8, outline=NAVY, width=4)
            d.rounded_rectangle([x0 + 125, yy + 10, x0 + 125 + [300, 240, 270][j], yy + 24], radius=7, fill=(170, 196, 222))
    # tap dot
    if 3.9 < t < 4.6:
        r = 30 + 40 * (t - 3.9)
        cyy = y0 + 240 + 130 + 50
        d.ellipse([cx - r, cyy - r, cx + r, cyy + r], outline=ORANGE, width=6)

def kit_and_card(d, t, k):
    if k <= 0: return
    # welcome kit box
    bx, by = 200, 820 + (1 - k) * 120
    d.rounded_rectangle([bx, by + 60, bx + 380, by + 360], radius=24, fill=ORANGE)
    d.polygon([(bx - 10, by + 60), (bx + 390, by + 60), (bx + 350, by), (bx + 30, by)], fill=(232, 120, 40))
    d.rectangle([bx + 300, by, bx + 336, by + 360], fill=(255, 225, 190))
    d.text((bx + 40, by + 280), "Welcome kit", font=F("Bold", 34), fill=(255, 255, 255))
    # membership card
    c = prog(t, 8.0, 0.6)
    if c > 0:
        cx0, cy0 = 520 + (1 - c) * 300, 980
        d.rounded_rectangle([cx0, cy0, cx0 + 400, cy0 + 250], radius=26, fill=NAVY)
        d.text((cx0 + 34, cy0 + 30), "Stay B", font=F("Black", 48), fill=(255, 255, 255))
        d.text((cx0 + 34, cy0 + 95), "MEMBER", font=F("SemiBold", 26), fill=(188, 214, 238))
        d.ellipse([cx0 + 300, cy0 + 150, cx0 + 360, cy0 + 210], fill=ORANGE)
        d.rounded_rectangle([cx0 + 34, cy0 + 180, cx0 + 220, cy0 + 196], radius=8, fill=(90, 130, 170))

def icon(d, kind, cx, cy, a):
    if a <= 0: return
    r = 120 * a
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=TINT)
    s = a
    if kind == 0:  # info session: screen + presenter
        d.rounded_rectangle([cx - 70 * s, cy - 60 * s, cx + 70 * s, cy + 20 * s], radius=10 * s, fill=NAVY)
        d.line([cx, cy + 20 * s, cx, cy + 60 * s], fill=NAVY, width=max(1, int(10 * s)))
        d.line([cx - 40 * s, cy + 60 * s, cx + 40 * s, cy + 60 * s], fill=NAVY, width=max(1, int(10 * s)))
        d.rectangle([cx - 40 * s, cy - 30 * s, cx + 10 * s, cy - 18 * s], fill=ORANGE)
    elif kind == 1:  # first-week help: calendar with check
        d.rounded_rectangle([cx - 70 * s, cy - 60 * s, cx + 70 * s, cy + 70 * s], radius=14 * s, fill=(255, 255, 255), outline=NAVY, width=max(1, int(8 * s)))
        d.rectangle([cx - 70 * s, cy - 60 * s, cx + 70 * s, cy - 25 * s], fill=NAVY)
        d.line([(cx - 30 * s, cy + 20 * s), (cx - 5 * s, cy + 45 * s), (cx + 40 * s, cy - 5 * s)], fill=ORANGE, width=max(1, int(12 * s)))
    else:  # meetups: three heads
        for i, ox in enumerate((-55, 0, 55)):
            col = ORANGE if i == 1 else NAVY
            d.ellipse([cx + ox * s - 22 * s, cy - 50 * s, cx + ox * s + 22 * s, cy - 6 * s], fill=col)
            d.pieslice([cx + ox * s - 40 * s, cy, cx + ox * s + 40 * s, cy + 80 * s], 180, 360, fill=col)

def frame(t):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    if t < 2.0:  # hook
        lines_in(d, t, 0.0, 420, ["New to", "Busan?"], f_hero, NAVY, stagger=0.2)
        suitcase(d, W / 2, 1180, prog(t, 0.3, 0.6), tilt=8 * math.sin(t * 6))
    elif t < 7.0:
        lines_in(d, t, 2.0, 230, ["Pick your stage."], f_big, NAVY)
        lines_in(d, t, 4.6, 340, ["Get simple guides."], f_big, ORANGE)
        phone(d, t, W / 2, 1050, prog(t, 2.1, 0.6))
    elif t < 13.0:
        lines_in(d, t, 7.0, 420, ["And real help", "in Busan."], f_hero, NAVY, stagger=0.3)
        kit_and_card(d, t, prog(t, 7.4, 0.6))
        a = prog(t, 9.5, 0.6)
        text_c(d, 1290, "Welcome kit · Membership card", f_small, GREY, a, dy=20)
        text_c(d, 1350, "(mockup)", f_tiny, GREY, a, dy=20)
    elif t < 17.0:
        labels = ["Info sessions", "First-week help", "Meetups"]
        lines_in(d, t, 13.0, 300, ["Meet us offline"], f_big, NAVY)
        for i, s in enumerate(labels):
            a = prog(t, 13.4 + i * 0.6, 0.5)
            y = 640 + i * 340
            icon(d, i, 300, y, a)
            col = mix(BG, INK, a)
            d.text((470 + (1 - a) * 40, y - 34), s, font=f_mid, fill=col)
    else:  # end card
        a = prog(t, 17.0, 0.5)
        text_c(d, 470, "Stay B", f_logo, NAVY, a, dy=30)
        bar = 260 * prog(t, 17.3, 0.5)
        d.rounded_rectangle([W / 2 - bar, 680, W / 2 + bar, 692], radius=6, fill=ORANGE)
        lines_in(d, t, 17.5, 790, ["Your first place", "to ask in Busan."], f_big, INK, stagger=0.2)
        b = prog(t, 18.2, 0.5)
        text_c(d, 1060, "Free guides · Free to ask", f_mid, ORANGE, b, dy=20)
        if b > 0:
            col = mix(BG, NAVY, b)
            d.rounded_rectangle([W / 2 - 230, 1190, W / 2 + 230, 1420], radius=24, outline=col, width=5)
            text_c(d, 1240, "[QR / link here]", f_small, NAVY, b)
            text_c(d, 1310, "domain to be decided", f_tiny, GREY, b)
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

if __name__ == "__main__":
    main()
