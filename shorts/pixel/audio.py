"""한장견적 픽셀 쇼츠용 오리지널 8bit BGM + 효과음 (저작권 걱정 없음).
사용법: python3 audio.py out.wav   → 본편 28초 + 엔딩 7초 = 35초
타이밍은 pixel.html / ../ending/ending.html 타임라인과 맞춰져 있음.
"""
import sys, wave
import numpy as np

SR = 44100
MAIN, END = 28.0, 7.0
TOTAL = MAIN + END
n = int(TOTAL * SR)
mix = np.zeros(n)
rng = np.random.default_rng(3)

hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def tt(sec): return np.arange(int(sec * SR)) / SR
def env(L, a=.004, r=.06):
    e = np.ones(L); ai = max(1, int(a * SR)); ri = min(int(r * SR), L)
    e[:ai] = np.linspace(0, 1, ai); e[-ri:] *= np.linspace(1, 0, ri); return e
def sq(f, sec, duty=.25): return np.where((tt(sec) * f) % 1 < duty, 1., -1.)
def tri(f, sec): x = tt(sec); return 2 * np.abs(2 * ((x * f) % 1) - 1) - 1
def sweep(f0, f1, sec, duty=.5):
    f = np.linspace(f0, f1, int(sec * SR)); return np.where((np.cumsum(f) / SR) % 1 < duty, 1., -1.)
def noise(sec): return rng.uniform(-1, 1, int(sec * SR))
def put(sig, at, g):
    i = int(at * SR)
    if i >= n or i < 0: return
    sig = sig[: n - i]; mix[i:i + len(sig)] += sig * g

# ---------- BGM (C - Am - F - G, 128 BPM) ----------
BPM = 128; beat = 60 / BPM; bar = 4 * beat
chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]
bass = [36, 33, 29, 31]
melody = [(0, 72, .5), (.5, 76, .5), (1, 79, .5), (1.5, 76, .5), (2, 77, 1), (3, 76, 1),
          (4, 74, .5), (4.5, 72, .5), (5, 69, 1), (6, 72, .5), (6.5, 74, .5), (7, 76, 1),
          (8, 77, .5), (8.5, 76, .5), (9, 74, .5), (9.5, 72, .5), (10, 74, 1), (11, 77, 1),
          (12, 79, 1), (13, 76, .5), (13.5, 74, .5), (14, 72, 2)]
PAUSE = (7.4, 8.7)          # 아이템 획득 징글 동안 음악 멈춤
SAD = (3.6, 7.4)            # 공감 장면: 멜로디 빼고 베이스만
def active(at): return at < MAIN - .05 and not (PAUSE[0] <= at < PAUSE[1])
t0 = 0.0
while t0 < MAIN:
    for b in range(4):
        bt = t0 + b * bar
        for k in range(4):
            at = bt + k * beat
            if active(at): put(tri(hz(bass[b]), beat * .85) * env(int(beat * .85 * SR)), at, .30)
        for k in range(8):
            at = bt + k * beat / 2
            if active(at) and not (SAD[0] <= at < SAD[1]):
                m = chords[b][k % 3] + (12 if k >= 4 else 0)
                put(sq(hz(m), beat * .4, .125) * env(int(beat * .4 * SR), r=.04), at, .045)
            if active(at):
                L = .025; put(noise(L) * np.linspace(1, 0, int(L * SR)), at, .05 if k % 2 else .028)
    for off, m, ln in melody:
        at = t0 + off * beat; sec = ln * beat * .9
        if active(at) and not (SAD[0] <= at < SAD[1]):
            put(sq(hz(m), sec, .25) * env(int(sec * SR), r=.08), at, .075)
    t0 += 4 * bar
# 공감 장면: 낮고 느린 단조 멜로디
for i, m in enumerate([69, 67, 65, 64, 65, 64, 62, 64]):
    at = SAD[0] + .25 + i * beat; sec = beat * .9
    put(sq(hz(m), sec, .5) * env(int(sec * SR), r=.1), at, .05)

# ---------- 효과음 ----------
def blip(at, f=1200, g=.05): put(sq(f, .028, .5) * env(int(.028 * SR), r=.012), at, g)
def typing(at, chars, cps):
    for i in range(0, chars, 2): blip(at + i / cps, 1100 + (i % 4) * 60)
def ding(at): put(sq(1568, .09) * env(int(.09 * SR)), at, .08); put(sq(2093, .16) * env(int(.16 * SR), r=.12), at + .09, .08)
def whoosh(at): L = .22; put(noise(L) * np.sin(np.linspace(0, np.pi, int(L * SR))) * .9, at, .06)
def hit(at): put(noise(.12) * np.linspace(1, 0, int(.12 * SR)), at, .12); put(sweep(400, 90, .18) * env(int(.18 * SR)), at, .09)
def jump(at): put(sweep(300, 900, .14, .25) * env(int(.14 * SR)), at, .07)
def coin(at): put(sq(hz(83), .07) * env(int(.07 * SR)), at, .07); put(sq(hz(88), .22) * env(int(.22 * SR), r=.18), at + .07, .07)
def pop(at): put(sweep(500, 1300, .07, .5) * env(int(.07 * SR)), at, .06)
def jingle(at):  # ITEM GET!
    seq = [(72, .09), (76, .09), (79, .09), (84, .09), (79, .09), (84, .5)]
    x = at
    for m, d in seq:
        put(sq(hz(m), d, .25) * env(int(d * SR), r=.05), x, .1); put(tri(hz(m - 12), d) * env(int(d * SR)), x, .12); x += d
    put(sq(hz(88), .5, .125) * env(int(.5 * SR), r=.4), x - .5, .05)

# S1
ding(.45); typing(.95, 22, 18); put(sweep(600, 1500, .12) * env(int(.12 * SR)), 1.6, .08)
# 장면 전환
for a in [3.6, 7.4, 10.6, 21.0, 24.6]: whoosh(a - .2)
# S2 피격
for i in range(4): pop(3.6 + .2 + i * .55); hit(3.6 + .45 + i * .55)
# S3
jingle(7.6); jump(8.3); jump(8.9)
# S4–S6
for a, chars in [(10.6, 18), (14.2, 18), (17.6, 12)]:
    pop(a + .35); typing(a + .5, chars, 16)
for a in [14.2, 17.6]: whoosh(a - .05)
for i in range(3): coin(18.4 + i * .15)
# S7
jump(21.5); ding(22.4); typing(22.65, 10, 14); pop(23.2); pop(23.5)
# S8
pop(25.2); [blip(25.55 + i * .16, 900, .07) for i in range(4)]; pop(26.3)
for k in range(3): blip(27.0 + k * .4, 600, .05)

# ---------- 엔딩 (28초~) : 점 → 기둥 → 다리 연결 → 차임 ----------
E = MAIN
blip(E + .05, 880, .06); blip(E + .17, 1175, .06)
put(sweep(220, 660, .6, .5) * env(int(.6 * SR), a=.05, r=.1), E + .45, .035)
put(sweep(440, 1320, .6, .5) * env(int(.6 * SR), a=.05, r=.1), E + 1.0, .03)
for i, m in enumerate([72, 76, 79, 84]):  # 브릿지 연결 차임
    sec = 1.8 - i * .2
    put(tri(hz(m), sec) * np.exp(-tt(sec) * 2.5), E + 1.6 + i * .09, .16)
for i in range(10): blip(E + 1.5 + i * .07, 1500, .02)
pop(E + 3.9)
for i, m in enumerate([60, 64, 67, 72]):  # 잔잔한 마무리 화음
    put(tri(hz(m), 3.0) * env(int(3.0 * SR), a=.4, r=1.5), E + 3.6, .06)

# 마스터: 본편 끝에서 음악 짧게 페이드, 전체 정규화
f0, f1 = int((MAIN - .4) * SR), int(MAIN * SR)
mix[f0:f1] *= np.linspace(1, .35, f1 - f0)
mix = mix / np.max(np.abs(mix)) * .8
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "audio.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("audio", TOTAL, "s")
