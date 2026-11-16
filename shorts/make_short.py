#!/usr/bin/env python3
"""인생실록 질문카드 쇼츠 생성기.

config.json 의 포스터 이미지 + 장면 좌표 + 질문만 바꾸면
1080x1920 세로 쇼츠(mp4)와 썸네일을 자동으로 만듭니다.

사용법:
    python3 make_short.py              # config.json 사용
    python3 make_short.py other.json   # 다른 설정 파일 사용
"""
import json
import math
import subprocess
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
W, H = 1080, 1920

# 포스터 톤에 맞춘 색
BG = (249, 243, 235)  # 포스터 배경과 동일
INK = (40, 54, 42)
MUTED = (110, 116, 104)
GOLD = (184, 149, 90)


FONT_DIR = ROOT / "fonts"
FONT_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/gowunbatang/{}"
FONT_REG = FONT_DIR / "GowunBatang-Regular.ttf"
FONT_BOLD = FONT_DIR / "GowunBatang-Bold.ttf"


def ensure_fonts():
    FONT_DIR.mkdir(exist_ok=True)
    for f in (FONT_REG, FONT_BOLD):
        if not f.exists():
            print(f"폰트 다운로드: {f.name}")
            urllib.request.urlretrieve(FONT_URL.format(f.name), f)


_font_cache = {}


def font(size, bold=False):
    key = (size, bold)
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(str(FONT_BOLD if bold else FONT_REG), size)
    return _font_cache[key]


# ---------- easing / helpers ----------
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    x = clamp(x)
    return 0.5 - 0.5 * math.cos(math.pi * x)


def seg_alpha(t, dur, fade_in=0.35, fade_out=0.3):
    return clamp(t / fade_in) * clamp((dur - t) / fade_out)


def draw_text_block(img, text, cx, y, fnt, fill, alpha=1.0, dy=0, spacing=1.35):
    """가운데 정렬 여러 줄 텍스트를 alpha/offset 애니메이션과 함께 그림."""
    if alpha <= 0:
        return y
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    line_h = int(fnt.size * spacing)
    cur = y
    for line in text.split("\n"):
        w = d.textlength(line, font=fnt)
        d.text((cx - w / 2, cur + dy), line, font=fnt, fill=fill + (int(255 * alpha),))
        cur += line_h
    img.alpha_composite(layer)
    return cur


def fit_box(box, aspect):
    """원본 좌표 박스를 목표 비율에 맞게 (중심 유지) 확장."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    if w / h > aspect:
        h = w / aspect
    else:
        w = h * aspect
    return (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)


def ken_burns(poster, box, size, p, zoom=0.10, pan=(0.0, 0.0)):
    """box 영역을 p(0~1)에 따라 천천히 확대/이동하며 size로 리샘플."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    z = 1 + zoom * ease_in_out(p)
    nw, nh = w / z, h / z
    cx = (x0 + x1) / 2 + pan[0] * w * ease_in_out(p)
    cy = (y0 + y1) / 2 + pan[1] * h * ease_in_out(p)
    b = (cx - nw / 2, cy - nh / 2, cx + nw / 2, cy + nh / 2)
    # 포스터 바깥으로 나가면 배경색 패딩
    pw, ph = poster.size
    if b[0] < 0 or b[1] < 0 or b[2] > pw or b[3] > ph:
        pad = 200
        padded = Image.new("RGB", (pw + 2 * pad, ph + 2 * pad), BG)
        padded.paste(poster, (pad, pad))
        b = (b[0] + pad, b[1] + pad, b[2] + pad, b[3] + pad)
        return padded.resize(size, Image.LANCZOS, box=b)
    return poster.resize(size, Image.LANCZOS, box=b)


def rounded_mask(size, r):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), r, fill=255)
    return m


def gold_rule(d, cx, y, half_gap, length, alpha=255):
    d.line((cx - half_gap - length, y, cx - half_gap, y), fill=GOLD + (alpha,), width=3)
    d.line((cx + half_gap, y, cx + half_gap + length, y), fill=GOLD + (alpha,), width=3)


# ---------- 장면 렌더러 ----------
class Renderer:
    def __init__(self, cfg):
        self.cfg = cfg
        self.poster = Image.open(ROOT / cfg["poster"]).convert("RGB")
        self.n = len(cfg["cards"])
        self.panel = (960, 760)
        self.panel_xy = ((W - 960) // 2, 330)
        self.panel_mask = rounded_mask(self.panel, 28)

    def base(self):
        return Image.new("RGBA", (W, H), BG + (255,))

    def footer(self, img, alpha=1.0):
        d = ImageDraw.Draw(img)
        f = font(34)
        txt = self.cfg["footer"]
        w = d.textlength(txt, font=f)
        y = 1700
        d.text(((W - w) / 2, y), txt, font=f, fill=MUTED + (int(200 * alpha),))
        gold_rule(d, W / 2, y + 22, w / 2 + 30, 90, int(255 * alpha))

    # --- 인트로 ---
    def intro(self, t):
        c = self.cfg["intro"]
        dur = c["duration"]
        img = self.base()
        a = clamp((dur - t) / 0.3)
        # 훅 문구 (첫 프레임부터 보이도록 빠르게)
        draw_text_block(img, c["hook"], W / 2, 170, font(92, True), INK,
                        alpha=ease_out(t / 0.35) * a, dy=int(30 * (1 - ease_out(t / 0.5))))
        # 포스터 전체 – 천천히 확대
        ph = 1060
        pw = int(ph * self.poster.width / self.poster.height)
        tile = ken_burns(self.poster, (0, 0, self.poster.width, self.poster.height),
                         (pw, ph), t / dur, zoom=0.06)
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        tile_a = tile.convert("RGBA")
        tile_a.putalpha(int(255 * clamp((t - 0.2) / 0.5) * a))
        layer.paste(tile_a, ((W - pw) // 2, 470))
        img.alpha_composite(layer)
        draw_text_block(img, c["sub"], W / 2, 1585, font(44, True), GOLD,
                        alpha=ease_out((t - 1.4) / 0.5) * a, dy=int(20 * (1 - ease_out((t - 1.4) / 0.6))))
        return img

    # --- 질문 카드 ---
    def card(self, i, t):
        c = self.cfg["cards"][i]
        dur = self.cfg["card_duration"]
        img = self.base()
        a = seg_alpha(t, dur)
        d = ImageDraw.Draw(img)

        # 헤더: 브랜드 + 카드 번호 + 진행 점
        f = font(40, True)
        brand = self.cfg["brand"]
        bw = d.textlength(brand, font=f)
        d.text(((W - bw) / 2, 120), brand, font=f, fill=INK)
        gold_rule(d, W / 2, 145, bw / 2 + 24, 70)
        lab = f"질문카드  {i + 1:02d} / {self.n:02d}"
        lf = font(32)
        lw = d.textlength(lab, font=lf)
        d.text(((W - lw) / 2, 190), lab, font=lf, fill=MUTED)
        dot_gap = 30
        sx = W / 2 - (self.n - 1) * dot_gap / 2
        for k in range(self.n):
            r = 7 if k == i else 5
            col = GOLD if k <= i else (214, 206, 190)
            d.ellipse((sx + k * dot_gap - r, 262 - r, sx + k * dot_gap + r, 262 + r), fill=col)

        # 장면 패널 (켄 번즈)
        box = fit_box(c["box"], self.panel[0] / self.panel[1])
        pan = ((-1) ** i * 0.03, -0.02)
        scene = ken_burns(self.poster, box, self.panel, t / dur, zoom=0.12, pan=pan).convert("RGBA")
        frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sc_alpha = Image.eval(self.panel_mask, lambda v: int(v * a))
        frame.paste(scene, self.panel_xy, sc_alpha)
        img.alpha_composite(frame)
        d = ImageDraw.Draw(img)
        x, y = self.panel_xy
        d.rounded_rectangle((x - 2, y - 2, x + self.panel[0] + 1, y + self.panel[1] + 1), 30,
                            outline=INK + (int(160 * a),), width=3)

        # Q 라벨 + 질문 + 힌트 (순차 등장)
        p1 = ease_out((t - 0.35) / 0.5)
        qlab = f"Q{i + 1}."
        draw_text_block(img, qlab, W / 2, 1140, font(56, True), GOLD, alpha=p1 * a,
                        dy=int(24 * (1 - p1)))
        p2 = ease_out((t - 0.55) / 0.55)
        end = draw_text_block(img, c["q"], W / 2, 1225, font(74, True), INK, alpha=p2 * a,
                              dy=int(36 * (1 - p2)), spacing=1.32)
        p3 = ease_out((t - 1.4) / 0.6)
        draw_text_block(img, "— " + c["hint"] + " —", W / 2, end + 30, font(38), MUTED,
                        alpha=p3 * a, dy=int(16 * (1 - p3)))
        self.footer(img, a)
        return img

    # --- 아웃트로 ---
    def outro(self, t):
        c = self.cfg["outro"]
        dur = c["duration"]
        img = self.base()
        a = clamp(t / 0.35) * clamp((dur - t) / 0.6)
        # 포스터 타이틀 영역을 크게
        tb = c["title_box"]
        tw = 980
        th = int(tw * (tb[3] - tb[1]) / (tb[2] - tb[0]))
        title = ken_burns(self.poster, tb, (tw, th), t / dur, zoom=0.04).convert("RGBA")
        title.putalpha(int(255 * a))
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        layer.paste(title, ((W - tw) // 2, 330))
        img.alpha_composite(layer)
        # 가족 밥상 장면 작게
        fam = fit_box((710, 1140, 1065, 1380), 1.45)
        fs = (720, 497)
        fimg = ken_burns(self.poster, fam, fs, t / dur, zoom=0.05).convert("RGBA")
        m = Image.eval(rounded_mask(fs, 24), lambda v: int(v * clamp((t - 0.3) / 0.5) * a))
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        layer.paste(fimg, ((W - fs[0]) // 2, 610), m)
        img.alpha_composite(layer)
        p = ease_out((t - 0.8) / 0.6)
        end = draw_text_block(img, c["lines"], W / 2, 1180, font(70, True), INK,
                              alpha=p * a, dy=int(30 * (1 - p)))
        p2 = ease_out((t - 1.8) / 0.5)
        if p2 > 0:
            d = ImageDraw.Draw(img)
            f = font(44, True)
            tw2 = d.textlength(c["cta"], font=f)
            bx0, by0 = (W - tw2) / 2 - 44, end + 60
            ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            od = ImageDraw.Draw(ov)
            od.rounded_rectangle((bx0, by0, bx0 + tw2 + 88, by0 + 100), 50,
                                 fill=INK + (int(255 * p2 * a),))
            od.text((bx0 + 44, by0 + 24), c["cta"], font=f, fill=BG + (int(255 * p2 * a),))
            img.alpha_composite(ov)
        return img

    def timeline(self):
        cfg = self.cfg
        segs = [(cfg["intro"]["duration"], self.intro)]
        for i in range(self.n):
            segs.append((cfg["card_duration"], lambda t, i=i: self.card(i, t)))
        segs.append((cfg["outro"]["duration"], self.outro))
        return segs


def main():
    cfg_path = ROOT / (sys.argv[1] if len(sys.argv) > 1 else "config.json")
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    ensure_fonts()
    r = Renderer(cfg)
    fps = cfg["fps"]
    out = ROOT / cfg["output"]
    out.parent.mkdir(parents=True, exist_ok=True)
    segs = r.timeline()
    total = sum(s[0] for s in segs)

    cmd = ["ffmpeg", "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
           "-f", "lavfi", "-t", f"{total}", "-i", "anullsrc=r=44100:cl=stereo",
           "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", str(out)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    thumb_saved = False
    for si, (dur, fn) in enumerate(segs):
        frames = int(round(dur * fps))
        for f in range(frames):
            img = fn(f / fps).convert("RGB")
            proc.stdin.write(img.tobytes())
            # 썸네일: 첫 질문카드가 완전히 나타난 시점
            if si == 1 and f == int(2.4 * fps) and not thumb_saved:
                img.save(out.with_name(out.stem + "_thumbnail.png"))
                thumb_saved = True
        print(f"  [{si + 1}/{len(segs)}] 렌더 완료")
    proc.stdin.close()
    proc.wait()
    if proc.returncode != 0:
        sys.exit("ffmpeg 인코딩 실패")
    print(f"완료: {out}  ({total:.1f}초)")


if __name__ == "__main__":
    main()
