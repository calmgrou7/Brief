"""숨결 상세페이지 쇼츠용 오리지널 사운드 (저작권 걱정 없음): 본편 28.7초 + 엔딩 7초.
사용법: python3 audio.py out.wav
구성: 따뜻한 패드 + 잔잔한 벨 멜로디, 마음 카드 등장음, 화면 넘김, 호흡 장면의 숨소리, 버튼음, 엔딩 차임
"""
import sys, wave
import numpy as np

SR = 44100
MAIN, END = 28.7, 7.0
TOTAL = MAIN + END
n = int(TOTAL * SR)
L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(8)
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
def bell(f, sec, d=3.0):
    x = tt(sec); return (np.sin(2*np.pi*f*x) + .35*np.sin(2*np.pi*2.01*f*x)*np.exp(-x*6) + .12*np.sin(2*np.pi*3.02*f*x)*np.exp(-x*9)) * np.exp(-x*d) * env(len(x), .004, .05)
def pad(f, sec, a=1.0, r=1.4):
    x = tt(sec); return sum(np.sin(2*np.pi*f*d*x + k) for k, d in enumerate([1, 1.003, .997])) / 3 * env(len(x), a, r)

# 패드 진행: Fmaj7 – Dm7 – B♭maj7 – C (2.4초씩)
prog = [[53, 57, 60, 64], [50, 57, 60, 65], [46, 53, 57, 62], [48, 55, 60, 64]]
bar = 2.4; t0 = 0.0; b = 0
while t0 < MAIN - .2:
    for i, m in enumerate(prog[b % 4]): put(pad(hz(m), bar + 1.2), t0, .04, (-.3, .3, -.15, .15)[i])
    put(pad(hz(prog[b % 4][0] - 12), bar + .6, .3, .8), t0, .07)
    t0 += bar; b += 1
mel = [(0, 72), (.6, 74), (1.2, 77), (2.4, 76), (3.6, 72), (4.8, 74), (5.4, 76), (6.0, 79), (7.2, 77), (8.4, 76), (9.6, 74), (10.8, 72)]
for start in [6.6, 6.6 + 12.0]:
    for off, m in mel:
        if start + off < MAIN - .5: put(bell(hz(m), 1.8, 2.4), start + off, .07, .15)

for i in range(6): put(bell(hz(84 + [0, 2, 4, 7, 9, 12][i]), .5, 6), .25 + i * .18, .05, (-.4 + i * .16))   # 마음 카드 등장
for a in [3.3, 4.2, 5.1]: put(bell(hz(79), .6, 5), a, .06)                                                 # 카드 하이라이트
put(bell(hz(84), 2.5, 1.5), 6.55, .1); put(bell(hz(72), 2.5, 1.5), 6.55, .06)                            # 브랜드
for a in [9.2, 12.4, 15.6, 18.8, 22.0, 25.2]:                                                             # 화면 넘김
    Ln = int(.4 * SR); put(lowpass(rng.uniform(-1, 1, Ln), .08) * np.sin(np.linspace(0, np.pi, Ln)), a - .2, .3)
for a in [9.9, 13.1, 16.3, 19.4, 20.7, 22.7]: put(bell(hz(91), .4, 9), a, .04)                           # 강조 테두리
for a, b_, up in [(19.0, 20.6, True), (20.6, 22.0, False)]:                                              # 숨소리 (호흡 장면)
    Ln = int((b_ - a) * SR); x = np.linspace(0, 1, Ln); nz = rng.uniform(-1, 1, Ln)
    k = (.03 + .1 * x) if up else (.13 - .1 * x); y = np.empty(Ln); acc = 0.0
    for i in range(Ln): acc += k[i] * (nz[i] - acc); y[i] = acc
    put(y * np.sin(np.pi * x) ** 1.5, a, .7)
for k in range(2): put(bell(hz(79), 1.0, 4), 26.9 + k * 1.25, .05)                                       # 버튼

E = MAIN
fe = int((MAIN - .5) * SR), int(MAIN * SR)
for ch in (L, R): ch[fe[0]:fe[1]] *= np.linspace(1, .4, fe[1] - fe[0])
put(bell(hz(72), .6, 6), E + .05, .06, -.3); put(bell(hz(76), .6, 6), E + .17, .06, .3)
for i, m in enumerate([72, 76, 79, 84]): put(bell(hz(m), 2.5, 1.4), E + 1.6 + i * .09, .1)
for i, m in enumerate([48, 55, 60, 64]): put(pad(hz(m), 5.0, 1.0, 2.0), E + 1.5, .04)

mx = max(np.abs(L).max(), np.abs(R).max())
st = (np.stack([L, R], 1) / mx * .8 * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "audio.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print("audio", TOTAL, "s")
