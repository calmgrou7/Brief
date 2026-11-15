"""저작권 걱정 없는 배경음을 코드로 합성한다.
사용법: python3 music.py out.wav <총길이초> '<장면 큐 JSON>'
- 잔잔한 패드 + 가벼운 비트 + 장면 전환 '휙' 효과음 + 엔딩 로고 '띵' 차임
"""
import json, sys, wave
import numpy as np

SR = 44100
out, total, cues = sys.argv[1], float(sys.argv[2]), json.loads(sys.argv[3])
n = int(SR * total)
t = np.arange(n) / SR
mix = np.zeros(n)

def note(f):  # MIDI -> Hz
    return 440 * 2 ** ((f - 69) / 12)

BPM = 104
beat = 60 / BPM
# I - V - vi - IV (C장조), 마디마다 코드 변경
chords = [[48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 60, 65, 69]]
bar = beat * 4
for i in range(int(total / bar) + 1):
    s, e = int(i * bar * SR), min(n, int((i + 1) * bar * SR))
    if s >= n: break
    tt = t[s:e] - i * bar
    env = np.minimum(1, tt / 0.25) * np.minimum(1, (bar - tt) / 0.3)
    for k, m in enumerate(chords[i % 4]):
        f = note(m)
        amp = 0.09 if k == 0 else 0.045
        mix[s:e] += amp * env * (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt + 0.3) + 0.15 * np.sin(2 * np.pi * f * 1.003 * tt))
    # 아르페지오 플럭
    arp = chords[i % 4][1:] + [chords[i % 4][1] + 12]
    for j in range(8):
        ps = int((i * bar + j * beat / 2) * SR)
        if ps >= n: break
        L = min(int(0.4 * SR), n - ps)
        ta = np.arange(L) / SR
        f = note(arp[j % 4] + 12)
        mix[ps:ps + L] += 0.05 * np.exp(-ta * 9) * np.sin(2 * np.pi * f * ta)

# 킥 + 하이햇 (첫 0.8초는 비워 훅 강조)
rng = np.random.default_rng(7)
for b in range(int(total / beat) + 1):
    bt = b * beat
    if bt < 0.8: continue
    ps = int(bt * SR)
    if ps >= n: break
    L = min(int(0.25 * SR), n - ps); ta = np.arange(L) / SR
    if b % 2 == 0:
        mix[ps:ps + L] += 0.35 * np.exp(-ta * 18) * np.sin(2 * np.pi * (110 * np.exp(-ta * 25) + 45) * ta)
    hs = int((bt + beat / 2) * SR)
    if hs < n:
        H = min(int(0.05 * SR), n - hs)
        mix[hs:hs + H] += 0.05 * np.exp(-np.arange(H) / SR * 80) * rng.standard_normal(H)

# 장면 전환 효과음
for c in cues:
    ps = int(max(0, c['t'] - 0.12) * SR)
    if c['type'] == 'ending':
        # 엔딩 직전 음악을 줄이고 차임
        fade = np.ones(n); s0 = int(c['t'] * SR)
        fade[s0:] = 0.35
        mix *= fade
        for d, m in [(0.3, 84), (0.42, 88), (0.54, 91)]:
            cs = int((c['t'] + d) * SR); L = min(int(1.8 * SR), n - cs)
            if L <= 0: continue
            ta = np.arange(L) / SR
            mix[cs:cs + L] += 0.12 * np.exp(-ta * 2.5) * (np.sin(2 * np.pi * note(m) * ta) + 0.4 * np.sin(2 * np.pi * note(m) * 2.01 * ta))
        continue
    if c['t'] == 0: continue
    L = min(int(0.35 * SR), n - ps)
    if L <= 0: continue
    ta = np.arange(L) / SR
    noise = rng.standard_normal(L)
    noise = np.convolve(noise, np.ones(12) / 12, mode='same')
    env = np.sin(np.pi * ta / (L / SR)) ** 2
    mix[ps:ps + L] += 0.22 * env * noise

# 마스터: 페이드 인/아웃 + 노멀라이즈
mix *= np.minimum(1, t / 0.05) * np.minimum(1, (total - t) / 0.8)
mix = np.tanh(mix * 1.2)
mix = mix / np.max(np.abs(mix)) * 0.85
pcm = (mix * 32767).astype(np.int16)
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'  audio: {total:.1f}s → {out}')
