"""Whisper(faster-whisper): 음성 → 단어 단위 타임스탬프 JSON + SRT 자막

사용: .venv/bin/python scripts/transcribe.py rec.mp4 [--model small] [--lang ko]
"""
import argparse
import json
from pathlib import Path

from faster_whisper import WhisperModel


def ts(sec: float) -> str:
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("media")
    p.add_argument("--model", default="small", help="tiny / base / small / medium / large-v3")
    p.add_argument("--lang", default="ko")
    p.add_argument("--out", default="out")
    a = p.parse_args()

    model = WhisperModel(a.model, device="auto", compute_type="int8")
    segments, _ = model.transcribe(a.media, language=a.lang, word_timestamps=True, vad_filter=True)

    words, srt = [], []
    for i, seg in enumerate(segments, 1):
        srt.append(f"{i}\n{ts(seg.start)} --> {ts(seg.end)}\n{seg.text.strip()}\n")
        words += [{"word": w.word.strip(), "start": round(w.start, 2), "end": round(w.end, 2)} for w in seg.words]

    out = Path(a.out)
    out.mkdir(exist_ok=True)
    stem = Path(a.media).stem
    (out / f"{stem}.words.json").write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
    (out / f"{stem}.srt").write_text("\n".join(srt), encoding="utf-8")
    print(f"✓ {out / stem}.words.json ({len(words)} words), {out / stem}.srt")


if __name__ == "__main__":
    main()
