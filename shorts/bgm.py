"""오리지널 8비트 BGM + 슬라이드 전환 효과음 생성 (저작권 걱정 없음).
사용법: python3 shorts/bgm.py shorts/ep01  → shorts/ep01/bgm.wav
"""
import json, sys, wave
from pathlib import Path
import numpy as np

SR = 44100
ep_dir = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parent / "ep01")
slides = json.loads((ep_dir / "slides.json").read_text())["slides"]
if (ep_dir / "timing.json").exists():  # 내레이션 길이에 맞춘 슬라이드 길이
    for s, d in zip(slides, json.loads((ep_dir / "timing.json").read_text())["durs"]):
        s["dur"] = d
durs = [s["dur"] for s in slides]
TOTAL = sum(durs)
BPM = 116
beat = 60 / BPM
n = int(TOTAL * SR)
mix = np.zeros(n)

def note_hz(m):  # MIDI → Hz
    return 440 * 2 ** ((m - 69) / 12)

def env(length, a=0.005, r=0.08):
    e = np.ones(length)
    ai, ri = int(a * SR), min(int(r * SR), length)
    e[:ai] = np.linspace(0, 1, ai)
    e[-ri:] *= np.linspace(1, 0, ri)
    return e

def square(hz, sec, duty=0.25):
    t = np.arange(int(sec * SR)) / SR
    return np.where((t * hz) % 1 < duty, 1.0, -1.0)

def triangle(hz, sec):
    t = np.arange(int(sec * SR)) / SR
    return 2 * np.abs(2 * ((t * hz) % 1) - 1) - 1

def put(sig, at, gain):
    i = int(at * SR)
    if i >= n: return
    sig = sig[: n - i]
    mix[i : i + len(sig)] += sig * gain

# 코드 진행 C - Am - F - G (밝고 가벼운 느낌), 1마디 = 4박
chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]
bass = [36, 33, 29, 31]
melody = [  # (박 오프셋, MIDI, 길이(박)) — 2마디 모티프 x2 변형
    (0, 72, .5), (.5, 76, .5), (1, 79, 1), (2, 76, .5), (2.5, 74, .5), (3, 72, 1),
    (4, 69, .5), (4.5, 72, .5), (5, 76, 1), (6, 74, 1), (7, 72, 1),
    (8, 77, .5), (8.5, 76, .5), (9, 74, 1), (10, 72, .5), (10.5, 74, .5), (11, 77, 1),
    (12, 79, 1), (13, 74, .5), (13.5, 76, .5), (14, 74, 2),
]
bar = 4 * beat
loop = 4 * bar
t0 = 0.0
while t0 < TOTAL:
    for b in range(4):
        bt = t0 + b * bar
        for k in range(4):  # 베이스 4분음표
            put(triangle(note_hz(bass[b]), beat * .9) * env(int(beat * .9 * SR)), bt + k * beat, .32)
        for k in range(8):  # 아르페지오 8분음표
            m = chords[b][k % 3] + (12 if k >= 4 else 0)
            put(square(note_hz(m), beat * .45, .125) * env(int(beat * .45 * SR), r=.05), bt + k * beat / 2, .05)
        for k in range(8):  # 하이햇 노이즈
            L = int(.03 * SR)
            put(np.random.uniform(-1, 1, L) * np.linspace(1, 0, L), bt + k * beat / 2, .05 if k % 2 else .025)
    for off, m, ln in melody:
        sec = ln * beat * .92
        put(square(note_hz(m), sec, .25) * env(int(sec * SR), r=.1), t0 + off * beat, .085)
    t0 += loop

# 슬라이드 전환 '뿅' 효과음
start = 0.0
for d in durs:
    sec = .09
    t = np.arange(int(sec * SR)) / SR
    hz = np.linspace(880, 1760, len(t))
    blip = np.where((np.cumsum(hz) / SR) % 1 < .5, 1.0, -1.0) * np.linspace(1, 0, len(t))
    put(blip, start + .02, .09)
    start += d

# 마스터: 끝 1.5초 페이드아웃, 정규화
fade = int(1.5 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)
mix = mix / np.max(np.abs(mix)) * 0.7
pcm = (mix * 32767).astype(np.int16)
with wave.open(str(ep_dir / "bgm.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("bgm.wav", f"{TOTAL}s")
