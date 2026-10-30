#!/usr/bin/env python3
"""채널 공용 세로 영상(1080x1920) 제작기.

사용법:  python3 studio/make_video.py studio/examples/nowro.json

scene 종류
  card : 정사각 카드뉴스 이미지를 가운데에 놓고 줌/패닝 (나우로)
  talk : 캐릭터 + 말풍선 설명 (벤처의 기준, 보험지기)
  cta  : 마지막 상담/저장 유도 화면 (캐릭터 + 연락처)

edge-tts가 설치돼 있고 인터넷이 되면 장면별 한국어 내레이션을 자동으로 넣는다.
안 되면 무음 영상 + SRT 자막을 만든다.
"""
import json, math, os, shutil, subprocess, sys, tempfile, textwrap
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = {w: os.path.join(HERE, "fonts", f"Pretendard-{w}.otf") for w in ("Regular", "Bold", "Black")}
W, H, FPS, XF = 1080, 1920, 30, 0.6


def font(weight, size):
    return ImageFont.truetype(FONT[weight], size)


def rgb(hexstr):
    h = hexstr.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def wrap(text, width):
    """\n은 그대로 두고, 긴 줄만 글자 수 기준으로 접는다."""
    out = []
    for line in text.split("\n"):
        out += textwrap.wrap(line, width, break_long_words=True) or [""]
    return out


def draw_lines(d, lines, f, fill, cx, y, gap=18):
    for ln in lines:
        w = d.textlength(ln, font=f)
        d.text((cx - w / 2, y), ln, font=f, fill=fill)
        y += f.size + gap
    return y


# ---------- 정적 레이어 (Pillow) ----------

def background(ch, last):
    img = Image.new("RGB", (W, H), rgb(ch["bg"]))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 14], fill=rgb(ch["accent"]))
    d.text((50, 50), ch["badge"], font=font("Black", 40), fill=rgb(ch["accent"]))
    if not last:
        f = font("Bold", 32)
        tw = d.textlength(ch["footer"], font=f)
        d.text(((W - tw) / 2, H - 90), ch["footer"], font=f, fill=rgb(ch["main"]))
    return img


def text_layer(ch, sc, kind, last, cfg):
    """장면 위에 페이드인으로 올라가는 투명 텍스트 레이어."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    main, accent = rgb(ch["main"]), rgb(ch["accent"])
    top = wrap(sc.get("top", ""), 14)
    ft = font("Black", 76 if len(top) == 1 else 66)
    y = 260 - len(top) * (ft.size + 18) // 2
    draw_lines(d, top, ft, main, W / 2, y)

    if kind == "card":
        if sc.get("sub"):
            draw_lines(d, wrap(sc["sub"], 22), font("Bold", 44), accent, W / 2, 1530)
    else:
        # 말풍선 → 강조 박스 → 캐릭터(가운데 아래) 순서로 위에서부터 쌓는다
        say = wrap(sc.get("say", ""), 18)
        fs = font("Bold", 54)
        bh = len(say) * (fs.size + 20) + 90
        box = [70, 440, W - 70, 440 + bh]
        d.rounded_rectangle(box, radius=48, fill=(255, 255, 255, 250), outline=accent, width=6)
        d.polygon([(480, box[3] - 3), (580, box[3] - 3), (520, box[3] + 70)], fill=(255, 255, 255, 250))
        d.line([(480, box[3]), (520, box[3] + 70), (580, box[3])], fill=accent, width=6)
        draw_lines(d, say, fs, rgb("#1A1A1A"), W / 2, box[1] + 45, gap=20)
        if sc.get("point"):
            fp = font("Black", 46)
            lines = wrap(sc["point"], 14)
            ph = len(lines) * (fp.size + 14) + 40
            pw = max(d.textlength(ln, font=fp) for ln in lines) + 80
            pb = [W - 70 - pw, box[3] + 30, W - 70, box[3] + 30 + ph]
            d.rounded_rectangle(pb, radius=28, fill=accent)
            draw_lines(d, lines, fp, (255, 255, 255), (pb[0] + pb[2]) / 2, pb[1] + 20, gap=14)

    if last:
        cta = cfg.get("cta") or ch.get("cta") or []
        fc = font("Black", 52)
        y = 1630 if kind == "card" else 1640
        for ln in cta:
            tw = d.textlength(ln, font=fc)
            d.rounded_rectangle([(W - tw) / 2 - 40, y - 14, (W + tw) / 2 + 40, y + fc.size + 22],
                                radius=40, fill=accent)
            d.text(((W - tw) / 2, y), ln, font=fc, fill=(255, 255, 255))
            y += fc.size + 60
    return img


def placeholder_card(path, label, ch):
    img = Image.new("RGB", (1080, 1080), rgb(ch["accent"]))
    d = ImageDraw.Draw(img)
    draw_lines(d, wrap(label, 10), font("Black", 90), (255, 255, 255), 540, 420)
    img.save(path)


def placeholder_character(path, ch):
    """캐릭터 이미지가 없을 때 쓰는 임시 캐릭터 (투명 PNG)."""
    img = Image.new("RGBA", (520, 640), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    body, main = rgb(ch["accent"]), rgb(ch["main"])
    d.rounded_rectangle([90, 380, 430, 640], radius=120, fill=body)
    d.ellipse([60, 20, 460, 420], fill=(255, 226, 196), outline=main, width=8)
    for x in (170, 310):
        d.ellipse([x, 170, x + 44, 214], fill=main)
    d.arc([190, 230, 330, 330], 20, 160, fill=main, width=10)
    d.ellipse([110, 250, 160, 285], fill=(255, 170, 170))
    d.ellipse([360, 250, 410, 285], fill=(255, 170, 170))
    d.text((260 - d.textlength(ch["character"], font=font("Black", 44)) / 2, 470),
           ch["character"], font=font("Black", 44), fill=(255, 255, 255))
    img.save(path)


# ---------- 음성 ----------

def tts(text, voice, out):
    if not shutil.which("edge-tts") or not text:
        return None
    r = subprocess.run(["edge-tts", "--voice", voice, "--rate", "+8%", "--text", text.replace("\n", " "),
                        "--write-media", out], capture_output=True)
    if r.returncode or not os.path.getsize(out):
        return None
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out],
                       capture_output=True, text=True)
    return float(p.stdout.strip())


# ---------- 렌더 ----------

def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


def render_scene(i, sc, ch, cfg, tmp, base, last):
    kind = sc.get("type", "card")
    dur = sc["dur"]
    n = int(round(dur * FPS))
    bg = f"{tmp}/bg{i}.png"; background(ch, last).save(bg)
    tx = f"{tmp}/tx{i}.png"; text_layer(ch, sc, kind, last, cfg).save(tx)
    out = f"{tmp}/seg{i}.mp4"

    def asset(key, fallback):
        p = sc.get(key) or (cfg.get("character") if key == "char" else None)
        if p:
            return p if os.path.isabs(p) else os.path.join(base, p)
        path = f"{tmp}/ph_{key}{i}.png"
        fallback(path)
        return path

    if kind == "card":
        img = asset("img", lambda p: placeholder_card(p, sc.get("top", f"카드 {i + 1}"), ch))
        mv = sc.get("move", "in")
        cx, cy = "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"
        z, x, y = {"out": (f"1.05-0.05*on/{n}", cx, cy),
                   "up": ("1.05", cx, f"(ih-ih/zoom)*(1-on/{n})"),
                   "pan": ("1.05", f"(iw-iw/zoom)*on/{n}", cy)}.get(mv, (f"1+0.045*on/{n}", cx, cy))
        fc = (f"[1:v]scale=3240:3240:flags=lanczos,zoompan=z='{z}':x='{x}':y='{y}':d={n}:s=1080x1080:fps={FPS}[c];"
              f"[0:v][c]overlay=0:420[b];")
    else:
        img = asset("char", lambda p: placeholder_character(p, ch))
        # 캐릭터가 살짝 통통 튀며 말하는 느낌
        ch_h = sc.get("char_h", 700)
        fc = (f"[1:v]scale=-1:{ch_h}[c];"
              f"[0:v][c]overlay=x=(W-w)/2:y='{1630 - ch_h}+12*sin(2*PI*t*1.6)'[b];")
    fc += f"[2:v]format=rgba,fade=in:st=0.2:d=0.35:alpha=1[t];[b][t]overlay=0:0,format=yuv420p[v]"
    ff("-loop", "1", "-i", bg, "-loop", "1", "-i", img, "-loop", "1", "-i", tx,
       "-filter_complex", fc, "-map", "[v]", "-frames:v", str(n), "-r", str(FPS),
       "-c:v", "libx264", "-crf", "18", out)
    return out


def srt_time(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def main(cfg_path):
    cfg = json.load(open(cfg_path, encoding="utf-8"))
    channels = json.load(open(os.path.join(HERE, "channels.json"), encoding="utf-8"))
    ch = {**channels[cfg["channel"]], **cfg.get("overrides", {})}
    base = os.path.dirname(os.path.abspath(cfg_path))
    out = cfg["out"] if os.path.isabs(cfg["out"]) else os.path.join(base, cfg["out"])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    tmp = tempfile.mkdtemp()
    scenes = cfg["scenes"]

    # 1) 내레이션 먼저 만들어서 장면 길이를 음성에 맞춘다
    voices = []
    for i, sc in enumerate(scenes):
        a = tts(sc.get("narration", ""), ch["voice"], f"{tmp}/n{i}.mp3") if cfg.get("tts", True) else None
        voices.append(a and f"{tmp}/n{i}.mp3")
        sc["dur"] = max(sc.get("dur", 3.5), (a or 0) + 0.9)
    if scenes:
        scenes[-1]["dur"] = max(scenes[-1]["dur"], 4.0)

    # 2) 장면 렌더 → 크로스페이드로 잇기
    segs = [render_scene(i, sc, ch, cfg, tmp, base, i == len(scenes) - 1) for i, sc in enumerate(scenes)]
    starts, acc, fc, prev = [0.0], scenes[0]["dur"], [], "[0:v]"
    for i in range(1, len(segs)):
        fc.append(f"{prev}[{i}:v]xfade=transition=fade:duration={XF}:offset={acc - XF:.3f}[v{i}]")
        prev = f"[v{i}]"; starts.append(acc - XF); acc += scenes[i]["dur"] - XF
    fc.append(f"{prev}fade=t=out:st={acc - 0.6:.3f}:d=0.6,format=yuv420p[vout]")

    inputs = sum((["-i", s] for s in segs), [])
    k = len(segs)
    mix = []
    for i, v in enumerate(voices):
        if v:
            inputs += ["-i", v]
            d = int((starts[i] + 0.3) * 1000)
            mix.append(f"[{k}:a]adelay={d}|{d}[a{k}]"); k += 1
    bgm = cfg.get("bgm") or ch.get("bgm")
    if bgm and os.path.exists(os.path.join(base, bgm)):
        inputs += ["-stream_loop", "-1", "-i", os.path.join(base, bgm)]
        mix.append(f"[{k}:a]volume=0.12[a{k}]"); k += 1
    labels = [m.rsplit("[", 1)[1][:-1] for m in mix]
    if labels:
        fc += mix + ["".join(f"[{l}]" for l in labels) +
                     f"amix=inputs={len(labels)}:normalize=0,atrim=0:{acc:.3f},afade=t=out:st={acc - 0.8:.3f}:d=0.8[aout]"]
        amap = "[aout]"
    else:
        inputs += ["-f", "lavfi", "-t", f"{acc:.3f}", "-i", "anullsrc=r=44100:cl=stereo"]
        amap = f"{k}:a"
    ff(*inputs, "-filter_complex", ";".join(fc), "-map", "[vout]", "-map", amap,
       "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-t", f"{acc:.3f}", "-movflags", "+faststart", out)

    # 3) 자막 + 업로드용 문구
    stem = os.path.splitext(out)[0]
    ends = starts[1:] + [acc]
    srt = [f"{i + 1}\n{srt_time(starts[i])} --> {srt_time(ends[i])}\n{sc['narration']}\n"
           for i, sc in enumerate(scenes) if sc.get("narration")]
    open(stem + ".srt", "w", encoding="utf-8").write("\n".join(srt))
    meta = cfg.get("post", {})
    tags = " ".join(meta.get("hashtags", []) + ch.get("hashtags", []))
    open(stem + "_post.txt", "w", encoding="utf-8").write(
        f"[제목]\n{meta.get('title', '')}\n\n[설명]\n{meta.get('description', '')}\n\n{ch.get('contact', '')}\n\n{tags}\n")
    shutil.rmtree(tmp)
    print(f"done: {out} ({acc:.1f}s, 음성 {'있음' if any(voices) else '없음 - SRT 사용'})")


if __name__ == "__main__":
    for p in sys.argv[1:]:
        main(p)
