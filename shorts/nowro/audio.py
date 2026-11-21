"""나우로 부산 쇼츠용 오리지널 사운드 (저작권 걱정 없음): 본편 31.5초 + 엔딩 7초.
사용법: python3 audio.py out.wav
구성: 밝은 시티팝 풍 비트(112 BPM) + 장면별 효과음(불꽃놀이·파도·갈매기·환호·검색 뿅·타이핑) + 엔딩 차임
"""
import sys, wave
import numpy as np

SR = 44100
MAIN, END = 31.5, 7.0
TOTAL = MAIN + END
n = int(TOTAL * SR)
L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(21)
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
def saw(f, sec):  # 부드러운 톱니파 (배음 6개)
    x = tt(sec); return sum(np.sin(2*np.pi*f*k*x)/k for k in range(1, 7)) * .6
def epiano(f, sec):
    x = tt(sec); return (np.sin(2*np.pi*f*x) + .3*np.sin(2*np.pi*2*f*x)*np.exp(-x*4)) * np.exp(-x*1.6) * env(len(x), .004, .1)
def bell(f, sec, d=4): x = tt(sec); return (np.sin(2*np.pi*f*x) + .3*np.sin(2*np.pi*2.76*f*x)*np.exp(-x*8)) * np.exp(-x*d) * env(len(x), .002, .03)

# ---------- 시티팝 비트 ----------
BPM = 112; beat = 60 / BPM; bar = 4 * beat
prog = [[65, 69, 72, 76], [64, 67, 71, 74], [62, 65, 69, 72], [67, 71, 74, 77]]  # Fmaj7 Em7 Dm7 G7
roots = [41, 40, 38, 43]
BREAK = (10.4, 12.8)   # '근데…' 장면: 드럼 빼고 긴장감
def drums_on(at): return at < MAIN - .05 and not (BREAK[0] <= at < BREAK[1])
t0 = 0.0; b = 0
while t0 < MAIN - .05:
    ch = prog[b % 4]
    for k in range(8):                      # 16분 느낌 건반 스탭
        at = t0 + k * beat / 2
        if at >= MAIN - .05: break
        if k in (1, 3, 4, 6):
            for i, m in enumerate(ch): put(epiano(hz(m), beat * .9), at, .035, (-.3, .3, -.1, .1)[i])
    for k in range(8):                      # 옥타브 베이스
        at = t0 + k * beat / 2
        if at >= MAIN - .05: break
        m = roots[b % 4] + (12 if k % 2 else 0)
        sec = beat * .45; put(lowpass(saw(hz(m), sec), .25) * env(int(sec * SR), .005, .06), at, .16)
    for k in range(4):
        at = t0 + k * beat
        if not drums_on(at): continue
        x = tt(.3); f = 120 * np.exp(-x * 20) + 48
        put(np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-x*8), at, .38)                      # kick
        if k in (1, 3): put(lowpass(rng.uniform(-1, 1, int(.2*SR)), .5) * np.exp(-tt(.2)*16), at, .22)  # snare
        for h in range(2): put(rng.uniform(-1, 1, int(.035*SR)) * np.exp(-tt(.035)*100), at + h*beat/2, .035, .35)
    t0 += bar; b += 1
# 훅 멜로디 (브랜드 이후 밝게)
mel = [(0, 77), (.5, 76), (1, 74), (1.5, 72), (2, 74), (3, 69), (4, 72), (4.5, 74), (5, 76), (6, 79), (7, 77)]
for start in [12.8, 12.8 + 8 * beat, 12.8 + 16 * beat, 12.8 + 24 * beat]:
    for off, m in mel:
        at = start + off * beat
        if at < MAIN - .3: put(bell(hz(m + 12), .6, 5) + .5*bell(hz(m), .6, 5), at, .045, .2)

# ---------- 장면 효과음 ----------
def whoosh(at, g=.4): Ln = int(.3*SR); put(lowpass(rng.uniform(-1, 1, Ln), .15) * np.sin(np.linspace(0, np.pi, Ln))**2, at, g)
def boom(at, pan):
    x = tt(1.2); put(lowpass(rng.uniform(-1, 1, len(x)), .04) * np.exp(-x*3.5), at, .9, pan)
    cr = np.zeros(int(1.0*SR)); idx = rng.integers(0, len(cr), 160); cr[idx] = rng.uniform(-1, 1, 160)
    put(cr * np.exp(-tt(1.0)*2.5), at + .15, .5, -pan)
for t0_, x in [(.2, 330), (.9, 760), (1.5, 520), (2.1, 250), (2.6, 820), (3.0, 540), (28.4, 300), (29.1, 780), (29.8, 520), (30.5, 240), (31.0, 820)]:
    put(np.sin(2*np.pi*np.cumsum(np.linspace(900, 1800, int(.25*SR)))/SR) * env(int(.25*SR), .01, .1) * .3, t0_, .05, (x-540)/700)  # 휘익
    boom(t0_ + .27, (x - 540) / 700)
for a in [3.2, 5.6, 8.0, 10.4, 12.8]: whoosh(a - .18)
waves = lowpass(rng.uniform(-1, 1, int(2.4*SR)), .05) * (.6 + .4*np.sin(2*np.pi*.6*tt(2.4))) * env(int(2.4*SR), .2, .3)
put(waves, 3.2, .6)
for i, at in enumerate([3.6, 4.3, 5.0]):     # 갈매기
    f = np.concatenate([np.linspace(1800, 2600, int(.12*SR)), np.linspace(2600, 1500, int(.18*SR))])
    put(np.sin(2*np.pi*np.cumsum(f)/SR) * env(len(f), .01, .1), at, .04, (-.4, .3, -.1)[i])
for i in range(6): put(bell(hz(84 + (i % 3) * 2), .3, 10), 5.8 + i * .32, .04, (-.4 + i*.16))  # 골목 발걸음 같은 경쾌한 벨
crowd = lowpass(rng.uniform(-1, 1, int(2.3*SR)), .2) * env(int(2.3*SR), .3, .4)
put(crowd, 8.05, .35)                          # 공연 환호
for q in range(4): x = tt(.09); put(np.sin(2*np.pi*np.cumsum(np.linspace(600, 1200, len(x)))/SR) * np.exp(-x*28), 10.9 + q*.28, .14, (-.3, .3, -.2, .2)[q])
put(bell(hz(81), 2.4, 1.8), 12.9, .12); put(bell(hz(88), 2.4, 1.8), 12.93, .07)          # 브랜드
for a in [15.4, 18.45, 21.65, 24.85]: whoosh(a - .1, .3)
for a in [16.15, 19.35, 22.55, 25.75]: put(bell(hz(91), .35, 10), a, .05)               # 강조 테두리
for i in range(6): put(bell(2000 + i * 50, .07, 45), 29.0 + i * .15, .05)               # 타이핑

# ---------- 엔딩 ----------
E = MAIN
fe = int((MAIN - .6) * SR), int(MAIN * SR)
for ch in (L, R): ch[fe[0]:fe[1]] *= np.linspace(1, .35, fe[1] - fe[0])
put(bell(hz(72), .6, 6), E + .05, .07, -.3); put(bell(hz(76), .6, 6), E + .17, .07, .3)
for i, m in enumerate([72, 76, 79, 84]): put(bell(hz(m), 2.5, 1.4), E + 1.6 + i * .09, .12)
for i, m in enumerate([65, 69, 72, 76]): put(epiano(hz(m), 4.5), E + 1.5 + i * .02, .06)

mx = max(np.abs(L).max(), np.abs(R).max())
st = (np.stack([L, R], 1) / mx * .8 * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "audio.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print("audio", TOTAL, "s")
