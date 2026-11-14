"""Thumbnail (cover) drafts for Stay B shorts 01-03 - design A "Editorial Note".
Common frame (instruction 10): series label + number top-left -> title >= 200px, 2-3 lines,
one keyword on a sun highlighter -> one big object bottom-right -> colour band at the bottom.
Only the band colour changes per episode: 01 sea, 02 sun (ink text only), 03 warm tint.
Usage: python3 -B make_thumbs.py <output_root> [--preview <dir>]
"""
import sys, os
from PIL import Image, ImageDraw
from stayb_draw import *

STAMP = "DRAFT · NOT FOR POSTING · needs expert review"  # kept unchanged (instruction 11)
BAND_Y = 1340

EPS = {
    "stayb-shorts-01": dict(num="01", title=["New to", "Busan?"], hl=1, second=None,
                            sub=["Your first place", "to ask."], sub_col=SEA,
                            band=SEA, notice_col=SEA_TINT, obj="suitcase", stamp=False),
    "stayb-shorts-02": dict(num="02", title=["Just", "arrived?"], hl=1, second="Do this first.",
                            sub=["Alien registration", "checklist"], sub_col=INK,
                            band=SUN, notice_col=INK, obj="clipboard", stamp=True),
    "stayb-shorts-03": dict(num="03", title=["Your first", "part-time", "job?"], hl=1, second=None,
                            sub=["Get permission first."], sub_col=INK,
                            band=WARM_TINT, notice_col=CLAY, obj="calendar", stamp=True),
}

def stamp(im):
    d = ImageDraw.Draw(im)
    f = FB("Bold", 32)
    tw = f.getlength(STAMP)
    d.rounded_rectangle([LEFT, 236, LEFT + tw + 48, 312], radius=16, fill=WARM_TINT, outline=CLAY, width=5)
    d.text((LEFT + 24, 274 + cap(f) / 2), STAMP, font=f, fill=CLAY, anchor="ls")

def make(ep):
    im = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(im)
    grid(d, 0, 0, W, BAND_Y)
    d.rectangle([0, BAND_Y, W, H], fill=ep["band"])
    if ep["band"] == WARM_TINT:  # postcard perforation line on the pale band
        for x in range(0, W, 28): d.rectangle([x, BAND_Y - 2, x + 14, BAND_Y + 2], fill=CLAY)
    p = Pen()
    if ep["obj"] == "suitcase": suitcase(p, 600, 1010, 430, 520)
    elif ep["obj"] == "clipboard": clipboard(p, 600, 1110, 1010, 1640)
    else: calendar_clock(p, 640, 1200, 1060, 1660)
    o = p.done(); im.paste(o, (0, 0), o)
    notice(d, ep["notice_col"], y=1440 if ep["obj"] != "calendar" else 1420)
    top = 236
    if ep["stamp"]: stamp(im); top = 348
    label_sprite("STAY B · GUIDE " + ep["num"], top, "cream").paste(im)
    # title: largest size 200-240 that fits inside the right safe line
    size = 240
    while max(FD(size).getlength(s) for s in ep["title"]) > SAFE_RIGHT - LEFT and size > 200: size -= 2
    f = FD(size)
    assert max(f.getlength(s) for s in ep["title"]) <= SAFE_RIGHT - LEFT, ep["num"]
    b = top + 110 + cap(f)
    for i, s in enumerate(ep["title"]):
        text_sprite(LEFT, b, [(s, INK)], f, hl=0 if i == ep["hl"] else None).paste(im)
        last_b = b; b += size * 0.95
    y = last_b + 40
    if ep["second"]:
        f2 = FD(120); y += cap(f2) + 20
        text_sprite(LEFT, y, [(ep["second"], INK)], f2).paste(im); y += 30
    fs = FB("SemiBold", 60)
    y += 80
    for s in ep["sub"]:
        sp = text_sprite(LEFT, y, [(s, ep["sub_col"])], fs)
        assert sp.text_right <= SAFE_RIGHT and sp.bottom() <= SAFE_BOTTOM, (ep["num"], s)
        sp.paste(im); y += 72
    return im, size

def main():
    root = sys.argv[1]
    prev = sys.argv[sys.argv.index("--preview") + 1] if "--preview" in sys.argv else None
    small = []
    for slug, ep in EPS.items():
        im, size = make(ep)
        os.makedirs(os.path.join(root, slug), exist_ok=True)
        im.save(os.path.join(root, slug, "thumbnail.png"), optimize=True)
        print(slug, "title %dpx" % size)
        small.append(im.resize((270, 480), Image.LANCZOS))
    if prev:  # 25% size check (270 px wide, phone grid size)
        os.makedirs(prev, exist_ok=True)
        sheet = Image.new("RGB", (270 * 3 + 40, 480), WHITE)
        for i, s in enumerate(small): sheet.paste(s, (i * 290, 0))
        sheet.save(os.path.join(prev, "thumbs_25pct.png"))

if __name__ == "__main__":
    main()
