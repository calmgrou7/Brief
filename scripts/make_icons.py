"""DOIT 로고·아이콘·스토어 그래픽 생성기.  python3 scripts/make_icons.py

로고 심벌: 대문자 D 안에 체크 표시 — 항상 잉크(검정) D + 라임 체크
  - 앱 아이콘·스토어 아이콘: 라임 바탕 위에 심벌
  - 홈페이지·앱 안: 밝은 바탕 위에 심벌
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "app/assets/images"
STORE = ROOT / "store"
INK, LIME, WHITE, CLEAR = (14, 14, 16, 255), (198, 255, 61, 255), (255, 255, 255, 255), (0, 0, 0, 0)
SS = 4  # 슈퍼샘플링 배율 (가장자리 부드럽게)

# D 비율 (높이 h 기준): 직선부 0.36h + 반원(반지름 0.5h) → 폭 0.86h
STRAIGHT, CORNER = 0.36, 0.08


def d_mark(draw, cx, cy, h, d_color, check_color):
    """중심 (cx, cy), 높이 h 인 D 심벌을 그린다. check_color=CLEAR 면 체크 모양으로 투명하게 뚫는다."""
    r = h / 2
    w = h * STRAIGHT + r
    x0, y0, y1 = cx - w / 2, cy - h / 2, cy + h / 2
    xs = x0 + h * STRAIGHT  # 직선부 끝 = 반원 중심 x
    # 왼쪽(모서리 둥근 사각형) + 오른쪽(반원)
    draw.rounded_rectangle((x0, y0, xs + 1, y1), radius=h * CORNER, fill=d_color, corners=(True, False, False, True))
    draw.pieslice((xs - r, y0, xs + r, y1), start=-90, end=90, fill=d_color)
    # 체크: D 안쪽, 시각적 중심(살짝 왼쪽)에 배치
    bw, bh = w * 0.58, h * 0.40
    bx, by = x0 + w * 0.19, cy - bh * 0.52
    pts = [(bx, by + bh * 0.55), (bx + bw * 0.36, by + bh * 0.92), (bx + bw, by + bh * 0.05)]
    lw = h * 0.12
    draw.line(pts, fill=check_color, width=int(lw), joint="curve")
    for x, y in (pts[0], pts[-1]):
        draw.ellipse((x - lw / 2, y - lw / 2, x + lw / 2, y + lw / 2), fill=check_color)


def icon(size, bg, d_color, check_color, scale, rounded=False):
    """정사각 아이콘. scale = 캔버스 대비 D 높이 비율"""
    S = size * SS
    im = Image.new("RGBA", (S, S), CLEAR)
    dr = ImageDraw.Draw(im)
    if bg:
        if rounded:
            dr.rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 0.22), fill=bg)
        else:
            dr.rectangle((0, 0, S, S), fill=bg)
    d_mark(dr, S / 2, S / 2, S * scale, d_color, check_color)
    return im.resize((size, size), Image.LANCZOS)


def save(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)
    print("wrote", path.relative_to(ROOT))


# ── 앱 아이콘 ──────────────────────────────────────────────
save(icon(1024, LIME, INK, LIME, 0.58), IMG / "icon.png")
# Android 적응형 아이콘: 바깥쪽은 기기별 모양(원·물방울 등)으로 잘리므로 가운데 안전영역(약 60%) 안에
save(icon(1024, None, INK, LIME, 0.46), IMG / "android-icon-foreground.png")
save(Image.new("RGBA", (1024, 1024), LIME), IMG / "android-icon-background.png")
# 테마 아이콘(Android 13+): 단색 실루엣 — 체크는 투명하게 뚫음
save(icon(1024, None, WHITE, CLEAR, 0.46), IMG / "android-icon-monochrome.png")
# 스플래시(라임 배경 위) / 웹 파비콘
save(icon(512, None, INK, LIME, 0.9), IMG / "splash-icon.png")
save(icon(96, LIME, INK, LIME, 0.6, rounded=True), IMG / "favicon.png")
# 앱 안 로고(밝은 배경용)
save(icon(256, None, INK, LIME, 0.98), IMG / "logo-mark.png")
# Play 스토어 고해상도 아이콘 512 (Play가 모서리를 자동으로 둥글게 → 꽉 찬 사각형)
save(icon(512, LIME, INK, LIME, 0.58), STORE / "play-icon-512.png")


# ── Play 스토어 그래픽 이미지 1024x500 ─────────────────────
FONTS = Path(__file__).resolve().parent / "fonts"  # Pretendard (SIL OFL, Pretendard-LICENSE.txt)


def font(size, bold=True):
    """브랜드 글꼴 Pretendard: 제목은 Bold, 보조 문구는 Medium"""
    return ImageFont.truetype(str(FONTS / ("Pretendard-Bold.otf" if bold else "Pretendard-Medium.otf")), size)


W, H = 1024, 500
g = Image.new("RGBA", (W * SS, H * SS), INK)
d = ImageDraw.Draw(g)
tile = 132 * SS
tx, ty = 90 * SS, 180 * SS - tile / 2
d.rounded_rectangle((tx, ty, tx + tile, ty + tile), radius=int(tile * 0.24), fill=LIME)
d_mark(d, tx + tile / 2, ty + tile / 2, tile * 0.58, INK, LIME)
d.text((tx + tile + 30 * SS, 180 * SS), "DOIT", font=font(96 * SS), fill=WHITE, anchor="lm")
d.text((90 * SS, 330 * SS), "생각은 그만, 오늘 할 일부터.", font=font(46 * SS), fill=WHITE, anchor="ls")
d.text((90 * SS, 400 * SS), "목표를 AI가 쪼개고, 매일 3개만 실행하는 앱", font=font(28 * SS, bold=False), fill=(255, 255, 255, 170), anchor="ls")
save(g.resize((W, H), Image.LANCZOS).convert("RGB"), STORE / "play-feature-graphic-1024x500.png")
