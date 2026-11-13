"""Thumbnail (cover) drafts for Stay B shorts 01-03. Inter font (OFL). Usage: python3 make_thumbs.py <output_root>"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
W, H = 1080, 1920
BG = (251, 250, 247); NAVY = (31, 78, 121); ORANGE = (242, 140, 56); GREY = (110, 118, 128); RED = (190, 40, 40)
FD = "/usr/share/fonts/opentype/inter/"
def F(w, s): return ImageFont.truetype(FD + f"Inter-{w}.otf", s)
def c(d, y, s, f, col):
    d.text(((W - d.textlength(s, font=f)) / 2, y), s, font=f, fill=col)
items = {
    "stayb-shorts-01": (["New to", "Busan?"], "Your first place to ask", None),
    "stayb-shorts-02": (["Just arrived?", "Do this first."], "Alien registration checklist", "DRAFT · NOT FOR POSTING · needs expert review"),
    "stayb-shorts-03": (["Before your", "first part-time job"], "Get permission first", "DRAFT · NOT FOR POSTING · needs expert review"),
}
root = sys.argv[1]
for slug, (head, sub, stamp) in items.items():
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    c(d, 300, "Stay B", F("Black", 90), NAVY)
    d.rounded_rectangle([W/2 - 120, 420, W/2 + 120, 430], radius=5, fill=ORANGE)
    fh = F("ExtraBold", 120 if len(max(head, key=len)) < 14 else 92)
    for i, s in enumerate(head): c(d, 640 + i * fh.size * 1.2, s, fh, NAVY)
    c(d, 1040, sub, F("SemiBold", 56), ORANGE)
    c(d, 1520, "Concept · Stay B is a working name", F("Medium", 30), GREY)
    if stamp:
        d.rounded_rectangle([90, 120, W - 90, 210], radius=16, outline=RED, width=5)
        c(d, 142, stamp, F("Bold", 34), RED)
    os.makedirs(os.path.join(root, slug), exist_ok=True)
    im.save(os.path.join(root, slug, "thumbnail.png"), optimize=True)
