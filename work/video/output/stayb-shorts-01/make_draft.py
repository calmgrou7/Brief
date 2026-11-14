"""Stay B shorts 01 - motion draft, design A "Editorial Note" (no footage, silent).
1080x1920 @30fps, 8 scenes / 19.8 s. Frames drawn with Pillow, piped to ffmpeg.
Rules: work/marketing/20261114-shorts-visual-review.md (editor instructions 1-11).
Usage: python3 -B make_draft.py <out.mp4> [--stills <dir>]
"""
import subprocess, sys, os
from PIL import Image, ImageDraw
from stayb_draw import *

FPS = 30
REVEAL = 0.28   # mask reveal duration (instruction 6)
STAGGER = 0.14  # line stagger -> at most 2 elements move at once
ROUTE = 0.30    # route-line draw between stations (instruction 7)
T0 = 0.30       # first reveal starts after the route draw

def ease(t): t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3

# ---------------------------------------------------------------- progress route (instruction 5)
N_ST = 8
RX0, RX1, RY = 100, 926, 260
def route_bar(d, idx, lt, on):
    line = WHITE if on == "teal" else SEA
    faint = mix(SEA, WHITE, 0.45) if on == "teal" else mix(PAPER if on == "cream" else WARM_TINT, SEA, 0.35)
    hole = SEA if on == "teal" else (PAPER if on == "cream" else WARM_TINT)
    sx = [RX0 + (RX1 - RX0) * i / (N_ST - 1) for i in range(N_ST)]
    k = 1.0 if idx == 0 else ease(lt / ROUTE)
    drawn_to = sx[idx - 1] + (sx[idx] - sx[idx - 1]) * k if idx > 0 else sx[0]
    x = RX0
    while x <= RX1:
        on_line = x <= drawn_to
        r = 5 if on_line else 4
        d.ellipse([x - r, RY - r, x + r, RY + r], fill=line if on_line else faint)
        x += 22
    for i, s in enumerate(sx):
        reached = i < idx or (i == idx and k >= 1.0)
        cur = (i == idx and k >= 1.0)
        fill = SUN if cur else (line if reached else hole)
        d.ellipse([s - 16, RY - 16, s + 16, RY + 16], fill=fill, outline=line if (reached or i <= idx) else faint, width=6)

# ---------------------------------------------------------------- scenes
def title_lines(lines, size, color, top, hl_line=None, hl_seg=None, x=LEFT, lh=0.95, start=T0, ink_on_hl=INK):
    """lines: list of strings or list of segment lists. Returns [(sprite, start)]."""
    flat = ["".join(s for s, _ in l) if isinstance(l, list) else l for l in lines]
    while max(FD(size).getlength(s) for s in flat) > SAFE_RIGHT - x and size > 140:
        size -= 2  # auto-fit inside the right safe line (scene titles stay >= 140px)
    f = FD(size)
    out = []
    b = top + cap(f)
    for i, ln in enumerate(lines):
        segs = ln if isinstance(ln, list) else [(ln, color)]
        hl = hl_seg if i == hl_line else None
        if hl is not None:
            segs = [(s, ink_on_hl if j == hl else c) for j, (s, c) in enumerate(segs)]
        out.append((text_sprite(x, b + i * size * lh, segs, f, hl=hl), start + i * STAGGER))
    return out

def body_lines(lines, size, color, first_baseline, start, weight="SemiBold", lh=1.2, x=LEFT):
    f = FB(weight, size)
    return [(text_sprite(x, first_baseline + i * size * lh, [(s, color)], f), start + i * STAGGER)
            for i, s in enumerate(lines)]

def base_layer(bg, band=None, band_col=SEA, grid_on=False, illo=None, notice_col=None):
    im = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(im)
    if grid_on: grid(d, 0, 0, W, band or H)
    if band: d.rectangle([0, band, W, H], fill=band_col)
    if illo is not None: im.paste(illo, (0, 0), illo)
    if notice_col: notice(d, notice_col)
    return im

SCENES = []
def scene(dur, on):
    def deco(fn): SCENES.append(dict(dur=dur, on=on, build=fn)); return fn
    return deco

@scene(2.0, "cream")
def s1():
    p = Pen(); suitcase(p, 590, 930, 440, 520)
    pw = Pen(); waves(pw, -20, 1100, 1300, fill=SEA_TINT); waves(pw, -20, 1100, 1340, fill=SEA_TINT)
    illo = pw.done(); illo.alpha_composite(p.done())
    base = base_layer(PAPER, band=1180, grid_on=True, illo=illo, notice_col=SEA_TINT)
    items = title_lines(["New to", [("Busan?", INK)]], 230, INK, 400, hl_line=1, hl_seg=0, start=-1)  # visible at 0 s
    items += body_lines(["Your first place", "to ask."], 64, SEA, 905, 0.35)
    return dict(base=base, items=items)

@scene(2.5, "teal")
def s2():
    def mk(sel):
        p = Pen(); phone(p, 520, 880, 600, 1200, selected=sel)
        return base_layer(SEA, illo=p.done(), notice_col=SEA_TINT)
    b0, b1 = mk(None), mk(1)
    items = title_lines(["Pick your", [("stage.", WHITE)]], 170, WHITE, 420, hl_line=1, hl_seg=0)
    return dict(base=b0, base_alt=(1.1, b1), items=items, extra_appear=1.1)

@scene(2.6, "cream")
def s3():
    p = Pen(); boxes = notebook(p, 510, 880, 1170, 1640, ["SIM card", "Transit card", "Bank account"])
    base = base_layer(PAPER, band=1380, grid_on=True, illo=p.done(), notice_col=SEA_TINT)
    items = title_lines(["Get simple", [("guides.", INK)]], 170, INK, 420, hl_line=1, hl_seg=0)
    items += [(check_mark(x, y), 0.80 + i * STAGGER) for i, (x, y) in enumerate(boxes)]
    return dict(base=base, items=items)

@scene(2.3, "warm")
def s4():
    p = Pen(); village(p)
    base = base_layer(WARM_TINT, illo=p.done(), notice_col=CLAY)
    items = title_lines([[("And ", CLAY), ("real", CLAY), (" help", CLAY)], "in Busan."], 150, CLAY, 420, hl_line=0, hl_seg=1)
    return dict(base=base, items=items)

@scene(2.3, "warm")
def s5():
    p = Pen(); welcome_kit(p, 560, 1010, 1160, 1600)
    base = base_layer(WARM_TINT, illo=p.done(), notice_col=CLAY)
    items = title_lines(["Welcome kit,", "member card"], 140, CLAY, 420)
    items += body_lines(["(mockup)"], 56, CLAY, 780, T0 + 2 * STAGGER)
    items += [(member_card(300, 850), T0 + 3 * STAGGER + 0.04)]
    return dict(base=base, items=items)

def list_item(y, text, first):
    f = FB("SemiBold", 60)
    w = int(f.getlength(text)) + 120
    p = Pen(w, 130)
    if not first:
        for yy in range(6, 56, 16): p.circle(28, yy, 4, fill=SEA, outline=None)
    p.circle(28, 82, 17, fill=WHITE, outline=SEA, width=6)
    body_text(p, (70, 102), text, "SemiBold", 60, INK)
    return Sprite(p.done(), LEFT, y)

@scene(2.6, "cream")
def s6():
    p = Pen(); postcard(p, 640, 1160, 1170, 1620)
    base = base_layer(PAPER, band=1380, grid_on=True, illo=p.done(), notice_col=SEA_TINT)
    items = title_lines(["Meet us", [("offline.", INK)]], 170, INK, 400, hl_line=1, hl_seg=0)
    for i, s in enumerate(["Info sessions", "First-week help", "Meetups"]):
        items.append((list_item(760 + i * 120, s, i == 0), T0 + (2 + i) * STAGGER))
    return dict(base=base, items=items)

@scene(2.5, "teal")
def s7():
    p = Pen(); ferry(p)
    base = base_layer(SEA, illo=p.done(), notice_col=SEA_TINT)
    items = title_lines([[("Your ", WHITE), ("first", WHITE)], "place to ask", "in Busan."], 150, WHITE, 420, hl_line=0, hl_seg=1)
    return dict(base=base, items=items)

def logo_row():
    sym = symbol(150)
    f = FD(150)
    tw = int(f.getlength("Stay B"))
    img = Image.new("RGBA", (150 + 34 + tw + 20, 170), (0, 0, 0, 0))
    img.paste(sym, (0, 10), sym)
    d = ImageDraw.Draw(img)
    # wordmark: "Stay" ink + "B" sea (design-spec 3)
    d.text((184, 160 - 10 - (150 - cap(f)) / 2 + 4), "Stay ", font=f, fill=INK, anchor="ls")
    d.text((184 + f.getlength("Stay "), 160 - 10 - (150 - cap(f)) / 2 + 4), "B", font=f, fill=SEA, anchor="ls")
    return img

def qr_box():
    p = Pen(400, 250)
    p.rrect([6, 6, 394, 244], 26, fill=WHITE, outline=SEA, width=6)
    body_text(p, (40, 110), "[QR / link here]", "SemiBold", 40, SEA)
    body_text(p, (40, 175), "domain TBD", "Medium", 40, MUTED)
    return p.done()

def handnote(lines=("see you", "in Busan"), size=84):
    f = FG(size)
    wd = int(max(f.getlength(s) for s in lines)) + 30
    img = Image.new("RGBA", (wd, int(size * 1.05 * len(lines)) + 30), (0, 0, 0, 0))
    dd = ImageDraw.Draw(img)
    for i, s in enumerate(lines):
        dd.text((12, 12 + i * size * 1.0), s, font=f, fill=INK)
    return img.rotate(4, resample=Image.BICUBIC, expand=True)  # -4deg tilt (CSS sense)

@scene(3.0, "cream")
def s8():
    illo = Pen(); gwangan(illo, 600, 1080, 1470, 1250)
    base = base_layer(PAPER, band=1380, grid_on=True, illo=illo.done(), notice_col=SEA_TINT)
    items = [(Sprite(logo_row(), LEFT, 380), T0)]
    items += title_lines([[("Free", INK), (" guides.", INK)], "Free to ask."], 140, INK, 610, hl_line=0, hl_seg=0, start=T0 + STAGGER)
    items += [(Sprite(qr_box(), LEFT, 940), T0 + 4 * STAGGER)]
    hn = handnote()
    items += [(Sprite(hn, 560, 950), T0 + 5 * STAGGER)]
    return dict(base=base, items=items, deck=(600, 1050, 1458), deck_start=T0 + 7 * STAGGER)

# ---------------------------------------------------------------- render
LABEL = "STAY B · GUIDE 01"
def build_all():
    out, t = [], 0.0
    for i, sc in enumerate(SCENES):
        data = sc["build"]()
        data.update(sc, idx=i, t0=t, label=label_sprite(LABEL, 304, sc["on"]))
        out.append(data); t += sc["dur"]
    return out, t

def render(scenes, t):
    for sc in scenes:
        if sc["t0"] <= t < sc["t0"] + sc["dur"] or sc is scenes[-1]:
            break
    lt = t - sc["t0"]
    base = sc["base"]
    if "base_alt" in sc and lt >= sc["base_alt"][0]: base = sc["base_alt"][1]
    im = base.copy()
    d = ImageDraw.Draw(im)
    route_bar(d, sc["idx"], lt, sc["on"])
    sc["label"].paste(im)
    for sp, st in sc["items"]:
        sp.paste(im, 1.0 if st < 0 else ease((lt - st) / REVEAL))
    if "deck" in sc:  # route dots run along the bridge deck to a sun station
        x0, x1, y = sc["deck"]
        k = ease((lt - sc["deck_start"]) / ROUTE)
        if k > 0:
            xe = x0 + (x1 - x0) * k; x = x0
            while x <= xe:
                d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=SEA); x += 22
            if k >= 1: d.ellipse([x1 - 16, y - 16, x1 + 16, y + 16], fill=SUN, outline=SEA, width=6)
    return im

def hold_report(scenes):
    rows = []
    for sc in scenes:
        last = max([st + REVEAL for _, st in sc["items"]] + [sc.get("extra_appear", 0), sc.get("deck_start", -1) + ROUTE])
        rows.append((sc["idx"] + 1, sc["dur"], round(sc["dur"] - last, 2)))
    return rows

def main():
    out = sys.argv[1]
    stills = sys.argv[sys.argv.index("--stills") + 1] if "--stills" in sys.argv else None
    scenes, total = build_all()
    for sc in scenes:
        for sp, _ in sc["items"]:
            if hasattr(sp, "text_right"):
                assert sp.text_right <= SAFE_RIGHT, ("text in right safe zone", sc["idx"] + 1, sp.text_right)
                assert sp.y >= SAFE_TOP and sp.bottom() <= SAFE_BOTTOM, ("text in top/bottom safe zone", sc["idx"] + 1)
    for r in hold_report(scenes):
        print("scene %d  dur %.1fs  hold after last reveal %.2fs" % r)
        assert r[2] >= 1.2 - 1e-6, "hold < 1.2 s"
    print("total %.1fs" % total)
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-shortest", "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "32k", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    n = int(round(total * FPS))
    for i in range(n):
        p.stdin.write(render(scenes, i / FPS).tobytes())
    p.stdin.close(); p.wait()
    if stills:
        os.makedirs(stills, exist_ok=True)
        frames = []
        for sc in scenes:
            tt = sc["t0"] + sc["dur"] - 0.1
            im = render(scenes, tt)
            im.save(os.path.join(stills, "storyboard_%02d.png" % (sc["idx"] + 1)), optimize=True)
            frames.append((tt, im))
        # safe-zone check sheet: frame 0 + 8 scene frames, quarter size, red guide lines
        frames.insert(0, (0.0, render(scenes, 0.0)))
        cw, ch = W // 4, H // 4
        sheet = Image.new("RGB", (cw * 5, ch * 2 + 60), WHITE)
        sd = ImageDraw.Draw(sheet)
        for i, (tt, im) in enumerate(frames):
            th = im.resize((cw, ch), Image.LANCZOS)
            td = ImageDraw.Draw(th)
            for y in (SAFE_TOP, SAFE_BOTTOM): td.line([0, y / 4, cw, y / 4], fill=(230, 0, 0), width=1)
            for x in (LEFT, SAFE_RIGHT): td.line([x / 4, 0, x / 4, ch], fill=(230, 0, 0), width=1)
            cx, cy = (i % 5) * cw, (i // 5) * (ch + 30) + 30
            sheet.paste(th, (cx, cy))
            sd.text((cx + 6, cy - 26), "%.1fs" % tt, font=FB("Bold", 22), fill=CLAY)
        sheet.save(os.path.join(stills, "storyboard_00_safe-zone-check.png"), optimize=True)

if __name__ == "__main__":
    main()
