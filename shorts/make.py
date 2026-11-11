#!/usr/bin/env python3
"""Bridge Node 쇼츠 렌더러: 에피소드 JSON 한 개 → 1080x1920 mp4 (음성 + 자막 포함) + srt.

사용법:  python3 make.py episodes/ep01.json        (결과: out/ep01.mp4, out/ep01.srt)
         python3 make.py episodes/*.json           (여러 편 한 번에)

Claude는 에피소드 JSON(대본)만 쓰고, 영상·음성 작업은 전부 이 스크립트가 로컬에서 처리한다.
→ 한 편당 Claude 토큰은 JSON 몇십 줄 분량뿐.
"""
import asyncio, json, math, os, shutil, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
W, H, FPS = 1080, 1920, 30
FONT_DIRS = ["/usr/share/fonts/opentype/noto", "/System/Library/Fonts", "C:/Windows/Fonts"]
FONT_CANDIDATES = {
    "bold": ["NotoSansCJK-Bold.ttc", "AppleSDGothicNeo.ttc", "malgunbd.ttf"],
    "reg": ["NotoSansCJK-Regular.ttc", "AppleSDGothicNeo.ttc", "malgun.ttf"],
}


def find_font(kind):
    for d in FONT_DIRS:
        for f in FONT_CANDIDATES[kind]:
            p = os.path.join(d, f)
            if os.path.exists(p):
                return p
    sys.exit(f"한글 폰트를 찾지 못했습니다 ({kind}). Noto Sans CJK를 설치하세요.")


_fc = {}
def font(kind, size):
    k = (kind, size)
    if k not in _fc:
        _fc[k] = ImageFont.truetype(find_font(kind), size, index=0 if kind == "reg" else 0)
    return _fc[k]


def rgb(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def ease(t):  # easeOutCubic, 0..1
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def pop(t):  # easeOutBack
    t = max(0.0, min(1.0, t)); c = 1.7
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2


# ---------------------------------------------------------------- TTS
async def _edge(text, voice, rate, path):
    import edge_tts
    await edge_tts.Communicate(text, voice, rate=rate).save(path)


def tts(text, path, brand):
    """edge-tts(무료, 키 불필요, 자연스러운 음성) → 실패 시 espeak-ng(로봇톤, 오프라인)."""
    mp3 = path + ".mp3"
    try:
        asyncio.run(_edge(text, brand.get("voice", "ko-KR-SunHiNeural"), brand.get("voice_rate", "+0%"), mp3))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-ar", "44100", "-ac", "2", path], check=True)
        return "edge-tts"
    except Exception:
        if not shutil.which("espeak-ng"):
            raise SystemExit("TTS 실패: `pip install edge-tts` (인터넷 필요) 또는 espeak-ng 설치 필요")
        raw = path + ".raw.wav"
        subprocess.run(["espeak-ng", "-v", "ko", "-s", "165", "-w", raw, text], check=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-ar", "44100", "-ac", "2", path], check=True)
        return "espeak-ng(임시)"


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True, check=True).stdout
    return float(out.strip())


# ---------------------------------------------------------------- drawing helpers
def wrap(text, f, maxw):
    lines = []
    for para in text.split("\n"):
        cur = ""
        for word in para.split(" "):
            cand = (cur + " " + word).strip()
            if f.getlength(cand.replace("[", "").replace("]", "")) <= maxw or not cur:
                cur = cand
            else:
                lines.append(cur); cur = word
        lines.append(cur)
    return lines


def shadowed(img_w, img_h, radius, fill, blur=18, off=8, alpha=40):
    pad = blur * 2
    im = Image.new("RGBA", (img_w + pad * 2, img_h + pad * 2 + off), (0, 0, 0, 0))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([pad, pad + off, pad + img_w, pad + img_h + off], radius, fill=(60, 40, 20, alpha))
    im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(blur)))
    ImageDraw.Draw(im).rounded_rectangle([pad, pad, pad + img_w, pad + img_h], radius, fill=fill)
    return im, pad


def draw_check(d, cx, cy, r, C, scale=1.0):
    r2 = r * scale
    if r2 <= 1:
        return
    d.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], fill=rgb(C["accent"]))
    s = r2 / 22
    d.line([(cx - 9 * s, cy + 1 * s), (cx - 3 * s, cy + 7 * s), (cx + 9 * s, cy - 6 * s)], fill=rgb(C["ink"]), width=max(2, int(4 * s)))


def draw_dashed_circle(d, cx, cy, r, C):
    for k in range(16):
        a0 = k * 22.5
        d.arc([cx - r, cy - r, cx + r, cy + r], a0, a0 + 12, fill=rgb(C["muted"]), width=4)


def draw_lock(d, cx, cy, C):
    d.rounded_rectangle([cx - 24, cy - 6, cx + 24, cy + 30], 8, fill=rgb(C["accent"]))
    d.arc([cx - 16, cy - 34, cx + 16, cy + 2], 180, 360, fill=rgb(C["ink"]), width=7)
    d.line([(cx - 16, cy - 16), (cx - 16, cy - 4)], fill=rgb(C["ink"]), width=7)
    d.line([(cx + 16, cy - 16), (cx + 16, cy - 4)], fill=rgb(C["ink"]), width=7)
    d.rounded_rectangle([cx - 24, cy - 6, cx + 24, cy + 30], 8, outline=rgb(C["ink"]), width=4)


def make_card(item, C, w=920, h=132):
    """카드 이미지(RGBA) 생성. item: {t, s, n?, kind: check|pending|lock}"""
    im, pad = shadowed(w, h, 30, rgb(C["card"]))
    d = ImageDraw.Draw(im)
    x0, y0 = pad, pad
    kind = item.get("kind", "check")
    tx = x0 + 120
    if kind == "lock":
        draw_lock(d, x0 + 62, y0 + h // 2, C)
        d.text((tx, y0 + 20), item.get("t", "비밀"), font=font("bold", 32), fill=rgb(C["sub"]))
        d.rounded_rectangle([tx, y0 + 64, tx + 290, y0 + 90], 13, fill=rgb(C["muted"]))
        d.rounded_rectangle([tx + 305, y0 + 64, tx + 510, y0 + 90], 13, fill=rgb(C["muted"]))
        d.text((tx, y0 + 96), item.get("s", "곧 공개해요"), font=font("bold", 28), fill=rgb(C["accent"]))
    else:
        n = str(item.get("n", ""))
        cx, cy = x0 + 62, y0 + h // 2
        d.ellipse([cx - 28, cy - 28, cx + 28, cy + 28], fill=rgb(C["ink"]))
        f = font("bold", 30 if len(n) < 2 else 24)
        d.text((cx, cy - 2), n, font=f, fill=(255, 255, 255, 255), anchor="mm")
        d.text((tx, y0 + 22), item["t"], font=font("bold", 46), fill=rgb(C["ink"]))
        if item.get("s"):
            d.text((tx, y0 + 82), item["s"], font=font("bold", 28), fill=rgb(C["sub"]))
    return im, pad, (w, h)


def draw_headline(d, text, C, y_center, t):
    """[강조] 표시된 단어에 주황 하이라이트 박스."""
    f = font("bold", 66)
    lines = wrap(text, f, 960)
    lh = 92
    y = y_center - (len(lines) * lh) // 2
    for ln in lines:
        plain = ln.replace("[", "").replace("]", "")
        x = (W - f.getlength(plain)) / 2
        segs, hl = [], False
        buf = ""
        for ch in ln:
            if ch in "[]":
                if buf: segs.append((buf, hl)); buf = ""
                hl = ch == "["
            else:
                buf += ch
        if buf: segs.append((buf, hl))
        for s, is_hl in segs:
            sw = f.getlength(s)
            if is_hl:
                k = ease((t - 0.35) / 0.4)
                if k > 0:
                    d.rectangle([x - 8, y + 4, x - 8 + (sw + 16) * k, y + 84], fill=rgb(C["accent"], 40), outline=rgb(C["accent"]), width=3)
                    if k >= 1:
                        for px, py in [(x - 8, y + 4), (x + sw + 8, y + 4), (x - 8, y + 84), (x + sw + 8, y + 84)]:
                            d.rectangle([px - 5, py - 5, px + 5, py + 5], fill=(255, 255, 255, 255), outline=rgb(C["accent"]), width=2)
            d.text((x, y), s, font=f, fill=rgb(C["ink"]))
            x += sw
        y += lh


def draw_timer(d, remain, total, C):
    cx, y = W // 2, 150
    pw, ph = 190, 76
    d.rounded_rectangle([cx - pw // 2, y - ph // 2, cx + pw // 2, y + ph // 2], ph // 2, fill=(255, 255, 255, 255))
    rx = cx - 52
    d.ellipse([rx - 20, y - 20, rx + 20, y + 20], outline=rgb(C["muted"]), width=6)
    frac = remain / total if total else 0
    if frac > 0:
        d.arc([rx - 20, y - 20, rx + 20, y + 20], -90, -90 + 360 * frac, fill=rgb(C["accent"]), width=6)
    s = max(0, int(math.ceil(remain)))
    d.text((cx + 22, y), f"0:{s:02d}", font=font("bold", 38), fill=rgb(C["ink"]), anchor="mm")


def draw_mascot(base, brand, C, t):
    """하단 브랜드 마크(노드 2개를 잇는 다리) — 살짝 떠다니는 모션."""
    d = ImageDraw.Draw(base)
    cy = 1300 + int(10 * math.sin(t * 2.2))
    cx = W // 2
    # 노드-다리 아이콘
    d.line([(cx - 150, cy), (cx + 150, cy)], fill=rgb(C["ink"]), width=10)
    d.arc([cx - 150, cy - 110, cx + 150, cy + 110], 200, 340, fill=rgb(C["accent"]), width=10)
    for k in range(-2, 3):
        x = cx + k * 50
        yy = cy - int(math.sqrt(max(0, 1 - (k * 50 / 150) ** 2)) * 110 * math.sin(math.radians(70)))
        d.line([(x, cy), (x, yy + 4)], fill=rgb(C["ink"]), width=5)
    for sx in (-1, 1):
        r = 46 + 4 * math.sin(t * 3 + sx)
        d.ellipse([cx + sx * 175 - r, cy - r, cx + sx * 175 + r, cy + r], fill=rgb(C["accent"] if sx > 0 else C["ink"]))
    d.text((cx, cy + 110), brand["name"], font=font("bold", 54), fill=rgb(C["ink"]), anchor="mm")
    d.text((cx, cy + 170), brand["tagline"], font=font("bold", 32), fill=rgb(C["sub"]), anchor="mm")


# ---------------------------------------------------------------- scene rendering
def render(ep_path):
    brand = json.load(open(os.path.join(ROOT, "brand.json"), encoding="utf-8"))
    ep = json.load(open(ep_path, encoding="utf-8"))
    C = {**brand["colors"], **ep.get("colors", {})}
    name = os.path.splitext(os.path.basename(ep_path))[0]
    outdir = os.path.join(ROOT, "out"); os.makedirs(outdir, exist_ok=True)
    out_mp4 = os.path.join(outdir, name + ".mp4")
    tmp = tempfile.mkdtemp()

    # 1) 장면별 음성 → 길이 결정
    scenes = ep["scenes"]; engine = None
    for i, sc in enumerate(scenes):
        wav = f"{tmp}/a{i}.wav"
        engine = tts(sc["say"], wav, brand)
        sc["_wav"] = wav
        sc["_dur"] = max(sc.get("min", 2.2), duration(wav) + 0.45)
    total = sum(sc["_dur"] for sc in scenes)

    # 2) 오디오 이어붙이기 (장면 길이에 맞춰 무음 패딩)
    parts = []
    for i, sc in enumerate(scenes):
        p = f"{tmp}/p{i}.wav"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", sc["_wav"], "-af",
                        f"adelay=150|150,apad", "-t", f"{sc['_dur']:.3f}", p], check=True)
        parts.append(p)
    lst = f"{tmp}/list.txt"
    open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    audio = f"{tmp}/voice.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", audio], check=True)

    # 3) 프레임 렌더 → ffmpeg 파이프
    enc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                            "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", audio,
                            "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
                            "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out_mp4],
                           stdin=subprocess.PIPE)
    srt, t0 = [], 0.0
    for i, sc in enumerate(scenes):
        cards = [make_card(it, C) for it in sc.get("cards", [])]
        n = int(round(sc["_dur"] * FPS))
        step = sc.get("stagger", min(0.45, (sc["_dur"] - 0.8) / max(1, len(cards))))
        for fi in range(n):
            t = fi / FPS
            gt = t0 + t
            im = Image.new("RGBA", (W, H), rgb(C["bg"]))
            d = ImageDraw.Draw(im)
            # 진행 바(왼쪽 세로)
            d.rounded_rectangle([56, 420, 62, 1020], 3, fill=rgb(C["muted"]))
            d.rounded_rectangle([56, 420, 62, 420 + int(600 * gt / total)], 3, fill=rgb(C["accent"]))
            draw_timer(d, total - gt, total, C)
            # 헤드라인: 장면 시작 시 살짝 올라오며 등장
            k = ease(t / 0.35)
            layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            draw_headline(ImageDraw.Draw(layer), sc["head"], C, 300 + int(24 * (1 - k)), t)
            if k < 1:
                layer.putalpha(layer.getchannel("A").point(lambda a: int(a * k)))
            im.alpha_composite(layer)
            # 카드: 순차 등장 + 체크 팝
            y = 440
            for ci, (cim, pad, (cw, ch)) in enumerate(cards):
                st = 0.25 + ci * step
                kk = ease((t - st) / 0.35)
                if kk > 0:
                    c2 = cim if kk >= 1 else cim.copy()
                    if kk < 1:
                        c2.putalpha(c2.getchannel("A").point(lambda a, kk=kk: int(a * kk)))
                    im.alpha_composite(c2, (80 - pad, y - pad + int(40 * (1 - kk))))
                    kind = sc["cards"][ci].get("kind", "check")
                    cd = ImageDraw.Draw(im)
                    cx, cy = 80 + cw - 62, y + ch // 2 + int(40 * (1 - kk))
                    if kind == "check":
                        draw_check(cd, cx, cy, 26, C, pop((t - st - 0.3) / 0.3))
                    elif kind == "pending":
                        draw_dashed_circle(cd, cx, cy, 24, C)
                y += ch + 22
            draw_mascot(im, brand, C, gt)
            # 하단 자막(내레이션)
            cap = sc.get("cap", sc["say"])
            f = font("bold", 40)
            lines = wrap(cap, f, 900)[:2]
            cy0 = 1600
            for li, ln in enumerate(lines):
                tw = f.getlength(ln)
                d.rounded_rectangle([W / 2 - tw / 2 - 18, cy0 + li * 62 - 6, W / 2 + tw / 2 + 18, cy0 + li * 62 + 54], 12, fill=rgb(C["ink"], 225))
                d.text((W / 2, cy0 + li * 62 + 24), ln, font=f, fill=(255, 255, 255, 255), anchor="mm")
            d.text((W / 2, 1830), brand["footer"], font=font("reg", 28), fill=rgb(C["sub"]), anchor="mm")
            # 마지막 페이드아웃
            if i == len(scenes) - 1 and t > sc["_dur"] - 0.5:
                a = int(255 * (t - (sc["_dur"] - 0.5)) / 0.5)
                im.alpha_composite(Image.new("RGBA", (W, H), rgb(C["bg"], a)))
            enc.stdin.write(im.convert("RGB").tobytes())
        srt.append((t0, t0 + sc["_dur"], sc.get("cap", sc["say"])))
        t0 += sc["_dur"]
    enc.stdin.close(); enc.wait()

    def ts(x):
        ms = int(round(x * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
        return f"{h:02}:{m:02}:{s:02},{ms:03}"
    with open(os.path.join(outdir, name + ".srt"), "w", encoding="utf-8") as fp:
        for k, (a, b, txt) in enumerate(srt):
            fp.write(f"{k + 1}\n{ts(a)} --> {ts(b)}\n{txt}\n\n")
    # 업로드용 메타(제목/설명/태그)
    meta = {k: ep[k] for k in ("title", "description", "tags") if k in ep}
    if meta:
        json.dump(meta, open(os.path.join(outdir, name + ".meta.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"done: {out_mp4}  ({total:.1f}s, 음성: {engine})")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for p in sys.argv[1:]:
        render(p)
