"""숨결 쇼츠용 오리지널 사운드 (저작권 걱정 없음): 본편 32.5초 + 엔딩 7초.
사용법: python3 audio.py out.wav
흐름: 알림음이 쌓이는 소란 → '잠깐,'에서 정적 + 종소리 → 들숨·날숨에 맞춘 바람 소리와 패드 → 따뜻한 멜로디 → 엔딩 차임
"""
import sys, wave
import numpy as np

SR = 44100
MAIN, END = 32.5, 7.0
TOTAL = MAIN + END
n = int(TOTAL * SR)
L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(5)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def tt(sec): return np.arange(int(sec * SR)) / SR
def env(Ln, a=.01, r=.2):
    e = np.ones(Ln); ai = max(1, min(int(a * SR), Ln)); ri = max(1, min(int(r * SR), Ln))
    e[:ai] = np.linspace(0, 1, ai); e[-ri:] *= np.linspace(1, 0, ri); return e
def put(sig, at, g, pan=0.0):
    i = int(at * SR)
    if i >= n: return
    sig = sig[: n - i]; L[i:i + len(sig)] += sig * g * (1 - pan) ** .5; R[i:i + len(sig)] += sig * g * (1 + pan) ** .5
def bell(f, sec, decay=3.0):  # soft bell / kalimba-ish
    x = tt(sec); return (np.sin(2*np.pi*f*x) + .35*np.sin(2*np.pi*2.01*f*x)*np.exp(-x*6) + .15*np.sin(2*np.pi*3.02*f*x)*np.exp(-x*9)) * np.exp(-x*decay) * env(len(x), .004, .05)
def pad(f, sec, a=1.2, r=1.5):
    x = tt(sec); s = sum(np.sin(2*np.pi*f*d*x + k) for k, d in enumerate([1, 1.003, .997]))/3
    return s * env(len(x), a, r)
def lowpass(x, k):  # one-pole, k in (0,1): smaller = darker
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += k * (x[i] - acc); y[i] = acc
    return y

# ---------- S1 (0–3.4) : 알림 소란 ----------
pings = [(.35, 1568, -.4), (.75, 1319, .4), (1.15, 1760, -.2), (1.55, 1175, .3), (1.95, 2093, -.5),
         (2.15, 1568, .5), (2.35, 1397, -.3), (2.55, 1976, .2), (2.7, 1319, -.5), (2.85, 1760, .5), (3.0, 2349, 0), (3.12, 1568, -.2)]
for at, f, pan in pings:
    put(bell(f, .35, 9), at, .10, pan); put(bell(f*1.5, .25, 12), at, .06, pan)
hum = lowpass(rng.uniform(-1, 1, int(3.4 * SR)), .02) * np.linspace(.2, 1, int(3.4 * SR)) ** 2
put(hum * env(len(hum), .1, .05), 0, .55)
put(pad(hz(43), 3.4, .5, .05) * np.linspace(.3, 1, int(3.4 * SR)), 0, .10)

# ---------- S2 (3.4–6.4) : 정적 + 종소리 ----------
put(bell(hz(76), 3.5, 1.2), 3.62, .22); put(bell(hz(64), 3.5, 1.2), 3.62, .12)
put(pad(hz(52), 3.2, 1.5, 1.0), 4.4, .05, -.2); put(pad(hz(59), 3.2, 1.5, 1.0), 4.4, .04, .2)

# ---------- S3 (6.4–16.4) : 함께 호흡 ----------
INH, HOLD, EXH = (6.7, 10.7), (10.7, 11.6), (11.6, 16.1)
def breath(a, b, rising):
    sec = b - a; Ln = int(sec * SR); x = np.linspace(0, 1, Ln)
    shape = np.sin(np.pi * x) ** 1.5 if rising else np.sin(np.pi * x ** .8) ** 1.5
    nz = rng.uniform(-1, 1, Ln)
    k = (.03 + .10 * x) if rising else (.13 - .10 * x)  # brighter as lungs fill, darker on the way out
    y = np.empty(Ln); acc = 0.0
    for i in range(Ln): acc += k[i] * (nz[i] - acc); y[i] = acc
    return y * shape
put(breath(*INH, True), INH[0], .9); put(breath(*EXH, False), EXH[0], .9)
chord = [53, 57, 60, 64]  # Fmaj7: 따뜻하고 열린 화음
for i, m in enumerate(chord):
    put(pad(hz(m), 9.8, 2.5, 2.5), 6.5, .045, (-.3, .3, -.15, .15)[i])
for at, m in [(6.7, 72), (7.7, 69), (8.7, 72), (9.7, 76)]: put(bell(hz(m), 1.6, 2.5), at, .07)   # 숫자 4·3·2·1
put(bell(hz(79), 3.0, 1.1), 10.75, .08)                                                         # 멈춤
for i, m in enumerate([76, 74, 72, 69, 67]): put(bell(hz(m), 1.6, 2.5), 11.6 + i * .9, .06)    # 5·4·3·2·1

# ---------- S4–S8 (16.4–32.5) : 따뜻한 멜로디 ----------
prog = [[53, 57, 60, 64], [50, 57, 60, 65], [55, 59, 62, 67], [48, 55, 60, 64]]  # Fmaj7 Dm7 G Cmaj7
bar = 2.0
for b in range(8):
    at = 16.4 + b * bar
    for i, m in enumerate(prog[b % 4]):
        put(pad(hz(m), bar + 1.2, .8, 1.2), at, .035, (-.3, .3, -.15, .15)[i])
    put(pad(hz(prog[b % 4][0] - 12), bar + .6, .2, .8), at, .07)
mel = [(0, 72), (.5, 76), (1, 79), (2, 77), (3, 76), (4, 74), (4.5, 76), (5, 77), (6, 79),
       (8, 81), (9, 79), (10, 77), (10.5, 76), (11, 74), (12, 72), (12.5, 74), (13, 76), (14, 72)]
for off, m in mel:
    put(bell(hz(m), 1.8, 2.2), 16.6 + off, .075, .15)
put(bell(hz(84), 2.5, 1.6), 17.5, .06)  # 아이콘 등장
for at in [19.45, 22.6, 25.8]: put(lowpass(rng.uniform(-1, 1, int(.4 * SR)), .08) * np.sin(np.linspace(0, np.pi, int(.4 * SR))), at - .2, .35)  # 화면 넘김
for i in range(2): put(bell(hz(88), .2, 14), 29.9 + i * .25, .05)   # '숨결' 타이핑
put(bell(hz(79), 1.5, 3), 30.5, .07)                                # 버튼

# ---------- 엔딩 (32.5~) ----------
E = MAIN
fe = int((MAIN - .5) * SR), int(MAIN * SR)
L[fe[0]:fe[1]] *= np.linspace(1, .4, fe[1] - fe[0]); R[fe[0]:fe[1]] *= np.linspace(1, .4, fe[1] - fe[0])
put(bell(hz(72), .6, 6), E + .05, .06, -.3); put(bell(hz(76), .6, 6), E + .17, .06, .3)
for i, m in enumerate([72, 76, 79, 84]): put(bell(hz(m), 2.5, 1.4), E + 1.6 + i * .09, .1)
for i, m in enumerate([48, 55, 60, 64]): put(pad(hz(m), 5.0, 1.0, 2.0), E + 1.5, .04)

mx = max(np.abs(L).max(), np.abs(R).max())
st = (np.stack([L, R], 1) / mx * .8 * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "audio.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print("audio", TOTAL, "s")
