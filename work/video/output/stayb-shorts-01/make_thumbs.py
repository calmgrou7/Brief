"""Thumbnail (cover) drafts for Stay B shorts 01-03.
Colors: Stay B v2 tokens (work/design/stayb-v2/design-spec.md 2-1). Fonts: Bricolage Grotesque + Figtree (OFL, ./fonts).
Usage: python3 make_thumbs.py <output_root>"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
W, H = 1080, 1920
def hx(s): s = s.lstrip("#"); return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
PAPER = hx("#FBF7F0"); INK = hx("#16302F"); MUTED = hx("#4E605E"); SEA = hx("#0B6B66")
SUN = hx("#F4B942"); CLAY = hx("#A9481F"); WARM_TINT = hx("#FCEBD7"); SURFACE = hx("#FFFFFF")
HERE = os.path.dirname(os.path.abspath(__file__))
def _f(path, w, s):
    f = ImageFont.truetype(os.path.join(HERE, "fonts", path), s); f.set_variation_by_name(w); return f
def FH(w, s): return _f("BricolageGrotesque-VF.ttf", w, s)
def FB(w, s): return _f("Figtree-VF.ttf", w, s)
def c(d, y, s, f, col):
    d.text(((W - d.textlength(s, font=f)) / 2, y), s, font=f, fill=col)
def route(d, x0, x1, y, stops=3):
    x = x0
    while x < x1:
        d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=SEA); x += 22
    for i in range(stops):
        sx = x0 + (x1 - x0) * i / (stops - 1)
        d.ellipse([sx - 14, y - 14, sx + 14, y + 14], fill=SURFACE, outline=SEA, width=6)
STAMP = "DRAFT · NOT FOR POSTING · needs expert review"
items = {
    "stayb-shorts-01": (["New to", "Busan?"], "Your first place to ask", None),
    "stayb-shorts-02": (["Just arrived?", "Do this first."], "Alien registration checklist", STAMP),
    "stayb-shorts-03": (["Before your", "first part-time job"], "Get permission first", STAMP),
}
root = sys.argv[1]
for slug, (head, sub, stamp) in items.items():
    im = Image.new("RGB", (W, H), PAPER); d = ImageDraw.Draw(im)
    c(d, 290, "Stay B", FH("Bold", 96), SEA)
    d.rounded_rectangle([W / 2 - 120, 425, W / 2 + 120, 437], radius=6, fill=SUN)
    longest = max(head, key=len)
    fh = FH("Bold", 124)
    while d.textlength(longest, font=fh) > W - 160: fh = FH("Bold", fh.size - 4)
    for i, s in enumerate(head): c(d, 640 + i * fh.size * 1.18, s, fh, SEA)
    c(d, 1050, sub, FB("SemiBold", 56), CLAY)
    route(d, W / 2 - 260, W / 2 + 260, 1260)
    c(d, 1520, "Concept · Stay B is a working name", FB("Medium", 30), MUTED)
    if stamp:  # kept from v1: draft stamp (clay on warm tint, contrast 4.95:1)
        d.rounded_rectangle([90, 120, W - 90, 210], radius=16, fill=WARM_TINT, outline=CLAY, width=5)
        sf = FB("Bold", 34)
        c(d, 165 - 34 * 0.62, stamp, sf, CLAY)
    os.makedirs(os.path.join(root, slug), exist_ok=True)
    im.save(os.path.join(root, slug, "thumbnail.png"), optimize=True)
