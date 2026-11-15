#!/usr/bin/env python3
"""Build a 1080x1920 vertical Shorts mp4 from a folder of images/clips + a prompt/script file.

Folder layout (what ChatGPT/Codex drops into Google Drive each day):
    <input_dir>/
        01.png, 02.jpg, ...      scene images (sorted by name)
        *.mp4 / *.mov            optional ready-made clips (used as scenes too)
        script.json | *.txt | *.md   shorts prompt / script
        bgm.mp3 (optional)       background music

Script formats:
  - JSON: {"title": "...", "scenes": [{"image": "01.png", "text": "...", "duration": 3}]}
  - Text/Markdown: first "# heading" (or "제목:" line) = title,
    every other non-empty line = one scene caption, matched to media in order.

Usage: python3 make_short.py <input_dir> <output.mp4> [--sec 3.0]
"""
import argparse, json, re, subprocess, sys, tempfile, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
IMG_EXT = {".png", ".jpg", ".jpeg", ".webp"}
VID_EXT = {".mp4", ".mov", ".m4v", ".webm"}
def _font(*names):
    for n in names:
        for p in Path("/usr/share/fonts").rglob(n):
            return str(p)
    sys.exit("Korean font not found: run `apt-get install -y fonts-nanum`")


FONT_B = _font("NanumSquareRoundB.ttf", "NanumGothicBold.ttf", "NotoSansCJK-Bold.ttc")
FONT_EB = _font("NanumSquareB.ttf", "NanumSquareRoundB.ttf", "NanumGothicBold.ttf")


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"ffmpeg failed:\n{' '.join(cmd)}\n{r.stderr[-2000:]}")


def load_script(d: Path, media):
    js = next(iter(sorted(d.glob("*.json"))), None)
    if js:
        data = json.loads(js.read_text(encoding="utf-8"))
        scenes = data.get("scenes", [])
        for i, s in enumerate(scenes):
            s.setdefault("image", media[i].name if i < len(media) else media[-1].name)
        return data.get("title", ""), scenes
    txt = next(iter(sorted(list(d.glob("*.txt")) + list(d.glob("*.md")))), None)
    title, lines = "", []
    if txt:
        for raw in txt.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line:
                continue
            m = re.match(r"^(#\s+|제목\s*[:：]\s*)(.+)", line)
            if m and not title:
                title = m.group(2).strip()
                continue
            line = re.sub(r"^(\d+[.)]\s*|[-*]\s+|씬\s*\d+\s*[:：]\s*|scene\s*\d+\s*[:：]\s*)", "", line, flags=re.I)
            if line:
                lines.append(line)
    n = max(len(media), 1)
    scenes = [{"image": media[i].name, "text": lines[i] if i < len(lines) else ""} for i in range(len(media))]
    if len(lines) > n and scenes:  # extra lines -> append to last scene
        scenes[-1]["text"] = " ".join([scenes[-1]["text"]] + lines[n:]).strip()
    return title, scenes


def text_png(text, path, size, font, y_anchor, box=True):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if text:
        f = ImageFont.truetype(font, size)
        wrapped = []
        for para in text.split("\n"):
            wrapped += textwrap.wrap(para, width=max(8, int(940 / (size * 0.85)))) or [""]
        dr = ImageDraw.Draw(img)
        lh = int(size * 1.35)
        total = lh * len(wrapped)
        y = y_anchor - total // 2
        if box:
            dr.rounded_rectangle([60, y - 30, W - 60, y + total + 20], 28, fill=(0, 0, 0, 150))
        for ln in wrapped:
            tw = dr.textlength(ln, font=f)
            dr.text(((W - tw) / 2, y), ln, font=f, fill="white", stroke_width=4, stroke_fill="black")
            y += lh
    img.save(path)


def render_scene(i, scene, d, tmp, title, sec):
    src = d / scene["image"]
    dur = float(scene.get("duration", sec))
    cap = tmp / f"cap{i}.png"
    text_png(scene.get("text", ""), cap, 64, FONT_B, int(H * 0.74))
    top = tmp / f"title{i}.png"
    text_png(title, top, 78, FONT_EB, int(H * 0.12), box=False)
    out = tmp / f"seg{i:03d}.mp4"
    fade = f"fade=t=in:st=0:d=0.3,fade=t=out:st={dur-0.3:.2f}:d=0.3"
    if src.suffix.lower() in VID_EXT:
        vin = ["-i", str(src)]
        base = f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},trim=0:{dur},setpts=PTS-STARTPTS[b]"
    else:
        frames = int(dur * FPS)
        zin = i % 2 == 0  # alternate zoom in / zoom out
        z = f"'min(1+0.0012*on,1.15)'" if zin else f"'max(1.15-0.0012*on,1.0)'"
        vin = ["-loop", "1", "-t", str(dur), "-i", str(src)]
        base = (f"[0:v]scale={W*2}:{H*2}:force_original_aspect_ratio=increase,crop={W*2}:{H*2},"
                f"zoompan=z={z}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS}[b]")
    fc = f"{base};[b][1:v]overlay[c];[c][2:v]overlay,{fade},format=yuv420p[v]"
    run(["ffmpeg", "-y", *vin, "-i", str(cap), "-i", str(top), "-filter_complex", fc,
         "-map", "[v]", "-t", str(dur), "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast",
         "-crf", "20", "-an", str(out)])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input_dir")
    ap.add_argument("output")
    ap.add_argument("--sec", type=float, default=3.0, help="seconds per image scene")
    a = ap.parse_args()
    d = Path(a.input_dir)
    media = sorted(p for p in d.iterdir() if p.suffix.lower() in IMG_EXT | VID_EXT and not p.name.startswith("."))
    if not media:
        sys.exit(f"No images/clips found in {d}")
    title, scenes = load_script(d, media)
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        segs = [render_scene(i, s, d, tmp, title, a.sec) for i, s in enumerate(scenes)]
        lst = tmp / "list.txt"
        lst.write_text("".join(f"file '{s}'\n" for s in segs))
        joined = tmp / "joined.mp4"
        run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(joined)])
        bgm = next(iter(sorted(list(d.glob("*.mp3")) + list(d.glob("*.m4a")) + list(d.glob("*.wav")))), None)
        if bgm:
            run(["ffmpeg", "-y", "-i", str(joined), "-stream_loop", "-1", "-i", str(bgm), "-map", "0:v", "-map", "1:a",
                 "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-af", "volume=0.8", "-shortest", a.output])
        else:  # silent track keeps upload platforms happy
            run(["ffmpeg", "-y", "-i", str(joined), "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                 "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-shortest", a.output])
    print(f"OK {a.output}  scenes={len(scenes)}  title={title!r}")


if __name__ == "__main__":
    main()
