"""브루노트커피 쇼츠용 오리지널 로파이 카페 사운드 (저작권 걱정 없음): 본편 29초 + 엔딩 7초.
사용법: python3 audio.py out.wav
구성: 따뜻한 건반 코드 + 부드러운 비트 + LP 잡음, 얼음 소리·메모 뿅·붓는 소리·도장·타이핑, 엔딩 차임
"""
import sys, wave
import numpy as np

SR = 44100
MAIN, END = 29.0, 7.0
TOTAL = MAIN + END
n = int(TOTAL * SR)
L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(11)
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
def keys(f, sec):  # 로즈 피아노 느낌: 사인 + 약한 배음, 트레몰로, 감쇠
    x = tt(sec)
    s = np.sin(2*np.pi*f*x) + .25*np.sin(2*np.pi*2*f*x)*np.exp(-x*3) + .1*np.sin(2*np.pi*3*f*x)*np.exp(-x*5)
    return s * np.exp(-x*1.1) * (1 + .12*np.sin(2*np.pi*4.5*x)) * env(len(x), .006, .25)
def bell(f, sec, d=5): x = tt(sec); return (np.sin(2*np.pi*f*x) + .3*np.sin(2*np.pi*2.76*f*x)*np.exp(-x*8)) * np.exp(-x*d) * env(len(x), .002, .03)

# ---------- 로파이 비트 (84 BPM) : 본편 내내 ----------
BPM = 84; beat = 60 / BPM; bar = 4 * beat
prog = [[62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71], [57, 60, 64, 67]]  # Dm9 G7 Cmaj7 Am7
roots = [38, 43, 36, 45]
QUIET = (6.5, 7.0)   # 브랜드 등장 직전 잠깐 비움
t0 = 0.0; b = 0
while t0 < MAIN - .1:
    for i, m in enumerate(prog[b % 4]):
        put(keys(hz(m), bar * 1.1), t0 + i * .012, .055, (-.25, .25, -.1, .1)[i])
    put(keys(hz(roots[b % 4]), bar), t0, .11)
    for k in range(4):
        at = t0 + k * beat
        if QUIET[0] <= at < QUIET[1] or at >= MAIN - .1: continue
        if k in (0, 2) or (k == 3 and b % 2):                      # kick
            x = tt(.28); f = 110 * np.exp(-x * 18) + 45
            put(np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-x*9), at + (beat*.5 if k == 3 else 0), .32)
        if k in (1, 3):                                             # soft snare
            put(lowpass(rng.uniform(-1, 1, int(.18*SR)), .35) * np.exp(-tt(.18)*20), at, .16)
        for h in range(2):                                          # swung hats
            sw = h * beat * .58
            put(rng.uniform(-1, 1, int(.04*SR)) * np.exp(-tt(.04)*90), at + sw, .03 if h else .045, .3)
    t0 += bar; b += 1
crackle = np.zeros(n)
pos = rng.integers(0, int(MAIN*SR), 900); crackle[pos] = rng.uniform(-1, 1, 900)
crackle = lowpass(crackle, .5)[:n] * 1.0
L += crackle * .08; R += np.roll(crackle, 300) * .08
hiss = lowpass(rng.uniform(-1, 1, n), .3) * .006; hiss[int(MAIN*SR):] = 0; L += hiss; R += hiss

# ---------- 효과음 ----------
def clink(at, pan=0):    # 얼음 소리
    for f, d in [(2350, .0), (3120, .03), (2780, .06)]: put(bell(f, .5, 14), at + d, .06, pan)
def pop(at, pan=0): x = tt(.09); put(np.sin(2*np.pi*np.cumsum(np.linspace(500, 1100, len(x)))/SR) * np.exp(-x*30), at, .1, pan)
def whoosh(at): Ln = int(.35*SR); put(lowpass(rng.uniform(-1, 1, Ln), .12) * np.sin(np.linspace(0, np.pi, Ln)), at, .35)
clink(.15, -.2); clink(.55, .2)
pop(.5, -.4); pop(1.0, .4); pop(1.5, -.3)
for i in range(3): clink(3.85 + i * .22, (-.5, 0, .5)[i])            # 잔 3개 등장
put(bell(hz(79), 2.5, 1.6), 6.65, .1); put(bell(hz(86), 2.5, 1.6), 6.68, .06)  # 브랜드
for a in [9.5, 12.55, 15.75, 18.95]: whoosh(a - .15)                  # 화면 넘김
for a in [10.3, 13.5, 16.7, 19.9]: put(bell(hz(84), .4, 9), a, .05)   # 강조 테두리
# 붓는 소리 (22.6~24.1)
Ln = int(1.5*SR); pour = lowpass(rng.uniform(-1, 1, Ln), .06) * (1 + .3*np.sin(2*np.pi*7*tt(1.5))) * env(Ln, .08, .25)
put(pour, 22.6, .6)
clink(23.1, .1)
put(lowpass(rng.uniform(-1, 1, int(.12*SR)), .25) * np.exp(-tt(.12)*30), 24.4, .5)  # 도장 쿵
put(bell(hz(88), 1.2, 4), 24.45, .07)
for i in range(6): put(bell(1900 + i * 40, .08, 40), 26.3 + i * .14, .05)   # 타이핑
pop(27.2)

# ---------- 엔딩 ----------
E = MAIN
fe = int((MAIN - .6) * SR), int(MAIN * SR)
for ch in (L, R): ch[fe[0]:fe[1]] *= np.linspace(1, .35, fe[1] - fe[0])
put(bell(hz(72), .6, 6), E + .05, .07, -.3); put(bell(hz(76), .6, 6), E + .17, .07, .3)
for i, m in enumerate([72, 76, 79, 84]): put(bell(hz(m), 2.5, 1.4), E + 1.6 + i * .09, .12)
for i, m in enumerate([60, 64, 67, 71]): put(keys(hz(m), 4.5), E + 1.5 + i * .02, .06)

mx = max(np.abs(L).max(), np.abs(R).max())
st = (np.stack([L, R], 1) / mx * .8 * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "audio.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print("audio", TOTAL, "s")
