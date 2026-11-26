"""한장견적 POV 밈 쇼츠용 오리지널 사운드 (저작권 걱정 없음): 본편 26초 + 엔딩 7초.
사용법: python3 audio.py out.wav
구성: 통통 튀는 밈 비트(120 BPM, 피치카토 느낌) + 컷마다 효과음(알림·키보드·계산기·레코드 긁는 소리·시계·반전 상승음·도장) + 엔딩 차임
"""
import sys, wave
import numpy as np

SR = 44100
MAIN, END = 26.4, 7.0
TOTAL = MAIN + END
n = int(TOTAL * SR)
L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(31)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def tt(sec): return np.arange(int(sec * SR)) / SR
def env(Ln, a=.01, r=.2):
    e = np.ones(Ln); ai = max(1, min(int(a * SR), Ln)); ri = max(1, min(int(r * SR), Ln))
    e[:ai] = np.linspace(0, 1, ai); e[-ri:] *= np.linspace(1, 0, ri); return e
def put(sig, at, g, pan=0.0):
    i = int(at * SR)
    if i >= n or i < 0: return
    sig = sig[: n - i]; L[i:i + len(sig)] += sig * g * (1 - pan) ** .5; R[i:i + len(sig)] += sig * g * (1 + pan) ** .5
def lowpass(x, k):
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += k * (x[i] - acc); y[i] = acc
    return y
def pluck(f, sec=.35):  # 피치카토 / 마림바 느낌
    x = tt(sec); return (np.sin(2*np.pi*f*x) + .4*np.sin(2*np.pi*2*f*x)*np.exp(-x*18) + .2*np.sin(2*np.pi*4*f*x)*np.exp(-x*30)) * np.exp(-x*9) * env(len(x), .002, .03)
def bell(f, sec, d=4): x = tt(sec); return (np.sin(2*np.pi*f*x) + .3*np.sin(2*np.pi*2.76*f*x)*np.exp(-x*8)) * np.exp(-x*d) * env(len(x), .002, .03)
def kick(at, g=.4): x = tt(.25); put(np.sin(2*np.pi*np.cumsum(130*np.exp(-x*22)+50)/SR) * np.exp(-x*10), at, g)
def clap(at, g=.2):
    for d in (0, .012, .024): put(lowpass(rng.uniform(-1, 1, int(.12*SR)), .55) * np.exp(-tt(.12)*28), at + d, g * .6)

BPM = 120; beat = 60 / BPM
# 통통 튀는 반복 리프 (C 장조 펜타)
riff = [(0, 72), (.5, 76), (1, 79), (1.5, 76), (2, 81), (2.5, 79), (3, 76), (3.5, 74)]
riff2 = [(0, 74), (.5, 77), (1, 81), (1.5, 77), (2, 79), (2.5, 77), (3, 74), (3.5, 72)]
bassl = [48, 48, 53, 55]
STOPS = [(7.5, 8.6), (10.4, 10.85)]      # 정지 화면 · 반전 직전엔 음악 멈춤
def on(at): return at < MAIN - .05 and not any(a <= at < b for a, b in STOPS)
bar = 4 * beat; t0 = 0.0; b = 0
while t0 < MAIN:
    rf = riff if b % 2 == 0 else riff2
    for off, m in rf:
        at = t0 + off * beat
        if on(at): put(pluck(hz(m)), at, .09, .2 if off % 1 else -.2)
    for k in range(4):
        at = t0 + k * beat
        if not on(at): continue
        put(pluck(hz(bassl[b % 4] - 12), .4), at, .2)
        kick(at, .34 if k in (0, 2) else .18)
        if k in (1, 3): clap(at)
        put(rng.uniform(-1, 1, int(.03*SR)) * np.exp(-tt(.03)*110), at + beat/2, .04, .3)
    t0 += bar; b += 1

# ---------- 컷 효과음 ----------
def whoosh(at, g=.3): Ln = int(.22*SR); put(lowpass(rng.uniform(-1, 1, Ln), .2) * np.sin(np.linspace(0, np.pi, Ln))**2, at, g)
def ding(at): put(bell(hz(88), .5, 6), at, .1); put(bell(hz(93), .6, 6), at + .09, .08)
for a in [2.2, 4.4, 6.6, 8.6, 12.2, 14.6, 17.0, 19.2, 21.4, 23.4]: whoosh(a - .12)
ding(.25)                                                        # 고객 메시지
for i in range(10): put(lowpass(rng.uniform(-1, 1, int(.03*SR)), .6) * np.exp(-tt(.03)*120), 2.45 + i * .11 + (i % 3) * .02, .18, (-.3 + (i % 4) * .2))  # 키보드
x = tt(.6); boing = np.sin(2*np.pi*np.cumsum(220 + 120*np.sin(2*np.pi*9*x)*np.exp(-x*4))/SR) * np.exp(-x*4)
put(boing, 4.5, .28)
for i in range(6): put(np.sin(2*np.pi*(1800 + (i % 3) * 200)*tt(.06)) * env(int(.06*SR), .002, .02), 4.9 + i * .22, .05)  # 계산기 삑
x = tt(.45); scratch = np.sin(2*np.pi*np.cumsum(900*np.sin(2*np.pi*3.5*x)**2 + 150)/SR) * env(len(x), .005, .05)
put(scratch + .4*lowpass(rng.uniform(-1, 1, len(x)), .3), 7.5, .3); put(bell(hz(60), .3, 10), 7.55, .1)
for i in range(7): put(bell(2600 if i % 2 else 2200, .05, 60), 8.7 + i * .25, .07)   # 시계 똑딱
x = tt(.9); riser = lowpass(rng.uniform(-1, 1, len(x)), .05) * np.linspace(0, 1, len(x))**2 + .3*np.sin(2*np.pi*np.cumsum(np.linspace(200, 1200, len(x)))/SR) * np.linspace(0, 1, len(x))**2
put(riser, 10.0, .35)
for m in [72, 76, 79, 84]: put(bell(hz(m), 2.0, 2.2), 10.85, .09)
kick(10.85, .5)
for a in [12.8, 15.2, 17.6, 19.8]: put(bell(hz(91), .3, 12), a, .05)   # 강조 테두리
whoosh(21.4, .4); ding(21.85)                                           # 전송 → 답장
kick(22.2, .55); put(lowpass(rng.uniform(-1, 1, int(.12*SR)), .3) * np.exp(-tt(.12)*30), 22.2, .4)
for m in [79, 84]: put(bell(hz(m), 1.0, 4), 22.25, .07)
for i in range(4): put(bell(2000 + i * 50, .07, 45), 23.9 + i * .16, .05)   # 타이핑

# ---------- 엔딩 ----------
E = MAIN
fe = int((MAIN - .5) * SR), int(MAIN * SR)
for ch in (L, R): ch[fe[0]:fe[1]] *= np.linspace(1, .35, fe[1] - fe[0])
put(bell(hz(72), .6, 6), E + .05, .07, -.3); put(bell(hz(76), .6, 6), E + .17, .07, .3)
for i, m in enumerate([72, 76, 79, 84]): put(bell(hz(m), 2.5, 1.4), E + 1.6 + i * .09, .12)

mx = max(np.abs(L).max(), np.abs(R).max())
st = (np.stack([L, R], 1) / mx * .8 * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "audio.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print("audio", TOTAL, "s")
