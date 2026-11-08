"""DOIT 아이콘·스토어 그래픽 생성기.  python3 scripts/make_icons.py
브랜드: 잉크(#0E0E10) 바탕 + 라임(#C6FF3D) 체크 표시"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "app/assets/images"
STORE = ROOT / "store"
INK, LIME, WHITE = (14, 14, 16, 255), (198, 255, 61, 255), (255, 255, 255, 255)
SS = 4  # 슈퍼샘플링 배율 (가장자리 부드럽게)


def check(draw, box, color, width):
    """box=(x0,y0,x1,y1) 안에 체크 표시"""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    pts = [(x0 + w * 0.08, y0 + h * 0.55), (x0 + w * 0.38, y0 + h * 0.84), (x0 + w * 0.94, y0 + h * 0.18)]
    draw.line(pts, fill=color, width=width, joint="curve")
    r = width / 2
    for x, y in (pts[0], pts[-1]):
        draw.ellipse((x - r, y - r, x + r, y + r), fill=color)


def canvas(size, bg=(0, 0, 0, 0)):
    im = Image.new("RGBA", (size * SS, size * SS), bg)
    return im, ImageDraw.Draw(im)


def save(im, size, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.resize((size, size), Image.LANCZOS).save(path)
    print("wrote", path.relative_to(ROOT))


def mark(size, bg, fg, rounded, scale):
    """아이콘: 배경(둥근 사각형 or 꽉 참) + 가운데 체크. scale=체크가 차지하는 비율"""
    im, d = canvas(size)
    S = size * SS
    if bg:
        if rounded:
            d.rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 0.22), fill=bg)
        else:
            d.rectangle((0, 0, S, S), fill=bg)
    m = S * (1 - scale) / 2
    check(d, (m, m, S - m, S - m), fg, int(S * scale * 0.16))
    return im


# 앱 아이콘 (Play 런처 레거시·Expo 기본)
save(mark(1024, INK, LIME, False, 0.56), 1024, IMG / "icon.png")
# Android 적응형 아이콘: 바깥 1/3은 기기 모양에 따라 잘리므로 체크는 가운데 안전영역(약 60%) 안에
save(mark(1024, None, LIME, False, 0.40), 1024, IMG / "android-icon-foreground.png")
bg, _ = canvas(1024, INK)
save(bg, 1024, IMG / "android-icon-background.png")
save(mark(1024, None, WHITE, False, 0.40), 1024, IMG / "android-icon-monochrome.png")
# 스플래시(잉크 배경 위에 표시) / 웹 파비콘
save(mark(512, None, LIME, False, 0.9), 512, IMG / "splash-icon.png")
save(mark(96, INK, LIME, True, 0.56), 96, IMG / "favicon.png")
# Play 스토어 등록용 고해상도 아이콘 512x512 (Play가 모서리를 자동으로 둥글게 처리 → 꽉 찬 사각형)
save(mark(512, INK, LIME, False, 0.56), 512, STORE / "play-icon-512.png")


# Play 스토어 그래픽 이미지 1024x500
def font(size, bold=True):
    for p in [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc" if bold else "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansKR-Bold.ttf",
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


W, H = 1024, 500
fg = Image.new("RGBA", (W * SS, H * SS), INK)
d = ImageDraw.Draw(fg)
# 왼쪽 로고
lx, ly, ls = 90 * SS, 120 * SS, 120 * SS
d.rounded_rectangle((lx, ly, lx + ls, ly + ls), radius=int(ls * 0.26), fill=LIME)
pad = ls * 0.22
check(d, (lx + pad, ly + pad, lx + ls - pad, ly + ls - pad), INK, int(ls * 0.12))
d.text((lx + ls + 34 * SS, ly + ls / 2), "DOIT", font=font(96 * SS), fill=WHITE, anchor="lm")
# 카피
d.text((90 * SS, 320 * SS), "생각은 그만, 오늘 할 일부터.", font=font(46 * SS), fill=WHITE, anchor="ls")
d.text((90 * SS, 392 * SS), "목표를 AI가 쪼개고, 매일 3개만 실행하는 앱", font=font(28 * SS, bold=False), fill=(255, 255, 255, 170), anchor="ls")
fg.resize((W, H), Image.LANCZOS).convert("RGB").save(STORE / "play-feature-graphic-1024x500.png")
print("wrote store/play-feature-graphic-1024x500.png")
