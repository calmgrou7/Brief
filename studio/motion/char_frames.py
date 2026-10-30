#!/usr/bin/env python3
"""캐릭터 PNG 한 장에서 눈 감은 프레임, 입 벌린 프레임을 만든다 (깜빡임·립싱크용).

사용법: python3 char_frames.py <캐릭터.png> <설정.json>
설정 예: {"eyes": [[545,432,30,38],[729,482,31,38]], "mouth": [610,538,58,26]}  (중심x, 중심y, 반폭, 반높이)
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageStat

INK = (60, 36, 30, 255)


def skin_around(img, cx, cy, rx, ry):
    """대상 주변 링에서 피부색을 뽑는다."""
    box = (cx - rx * 2, cy - ry * 2, cx + rx * 2, cy + ry * 2)
    ring = Image.new("L", img.size, 0)
    d = ImageDraw.Draw(ring)
    d.ellipse(box, fill=255)
    d.ellipse((cx - rx * 1.4, cy - ry * 1.4, cx + rx * 1.4, cy + ry * 1.4), fill=0)
    return tuple(int(v) for v in ImageStat.Stat(img.convert("RGB"), ring).median) + (255,)


def cover(img, cx, cy, rx, ry, pad=1.3):
    """대상 부위를 주변 피부색으로 부드럽게 덮는다."""
    col = skin_around(img, cx, cy, rx, ry)
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).ellipse((cx - rx * pad, cy - ry * pad, cx + rx * pad, cy + ry * pad), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(6))
    img.paste(Image.new("RGBA", img.size, col), (0, 0), mask)


def soft(img, draw_fn):
    """선을 별도 레이어에 그려 살짝 흐리게 합성 (클레이 질감에 맞춤)."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(layer), layer)
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(1.2)))


def main(src, cfg_path):
    cfg = json.load(open(cfg_path))
    base = Image.open(src).convert("RGBA")
    stem = os.path.splitext(src)[0]

    blink = base.copy()
    for cx, cy, rx, ry in cfg["eyes"]:
        cover(blink, cx, cy, rx, ry, pad=1.6)
        soft(blink, lambda d, _l, cx=cx, cy=cy, rx=rx, ry=ry:
             d.arc((cx - rx * 1.1, cy - ry * 0.9, cx + rx * 1.1, cy + ry * 0.5), 15, 165, fill=INK, width=9))
    blink.save(stem + "_blink.png")

    talk = base.copy()
    cx, cy, rx, ry = cfg["mouth"]
    cover(talk, cx, cy, rx, ry, pad=1.3)

    def mouth(d, layer):
        box = (cx - rx * 0.5, cy - ry * 0.6, cx + rx * 0.5, cy + ry * 1.2)
        d.ellipse(box, fill=INK)
        tongue = Image.new("RGBA", layer.size, (0, 0, 0, 0))
        ImageDraw.Draw(tongue).ellipse((cx - rx * 0.36, cy + ry * 0.3, cx + rx * 0.36, cy + ry * 1.5), fill=(226, 112, 112, 255))
        m = Image.new("L", layer.size, 0)
        ImageDraw.Draw(m).ellipse(box, fill=255)
        layer.paste(tongue, (0, 0), Image.composite(tongue.getchannel("A"), m, m).point(lambda v: v))
    soft(talk, mouth)
    talk.save(stem + "_talk.png")
    print("saved", stem + "_blink.png", stem + "_talk.png")


if __name__ == "__main__":
    main(*sys.argv[1:3])
