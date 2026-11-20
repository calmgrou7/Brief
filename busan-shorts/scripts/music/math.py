#!/usr/bin/env python3
"""Original music + SFX for the 미니 수학의신 ad, synthesized from scratch (no samples, no licences).

    python3 scripts/music/math.py <timeline.json> <out.wav>

timeline.json = {"total": seconds, "starts": [scene start seconds...]} written by render.mjs.
Scenes: 0 sleepy hook · 1 VS countdown · 2 reveal (drop) · 3 duel · 4 level up · 5 CTA.
"""
import json, sys, wave
import numpy as np

SR = 44100
tl = json.load(open(sys.argv[1]))
TOTAL, S = float(tl['total']), [float(x) for x in tl['starts']]
N = int(TOTAL * SR) + SR
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)

def note(n):  # MIDI -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)

def put(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * (1 - max(0, pan))
    R[i:i + len(sig)] += sig * gain * (1 + min(0, pan))

def env(n, a=0.005, d=0.2, s=0.0, r=0.05, hold=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    e = e * (s + (1 - s) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4)))
    if hold is not None:
        e = e * np.clip(1 - (t - hold) / r, 0, 1)
    return e

def tone(f, dur, kind='sine', **kw):
    n = int(dur * SR); t = np.arange(n) / SR
    if kind == 'sine': w = np.sin(2 * np.pi * f * t)
    elif kind == 'tri': w = 2 / np.pi * np.arcsin(np.sin(2 * np.pi * f * t))
    elif kind == 'pulse': w = sum(np.sin(2 * np.pi * f * k * t) / k for k in (1, 3, 5, 7)) * 0.8
    elif kind == 'saw': w = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 7)) * 0.6
    elif kind == 'bell': w = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * f * 2.01 * t) + 0.2 * np.sin(2 * np.pi * f * 3.98 * t)
    return w * env(n, **kw)

def kick(dur=0.32):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 50 + 110 * np.exp(-t / 0.035)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12)

def noise(dur, decay, hp=True):
    n = int(dur * SR); x = rng.standard_normal(n)
    if hp: x = np.diff(x, prepend=0)
    return x * np.exp(-np.arange(n) / SR / decay)

# --------------------------------------------------------------- 0: sleepy hook
s0, s1 = S[0], S[1]
pad = [note(n) for n in (57, 60, 64, 67)]                # Am7, soft
for f in pad:
    put(tone(f, s1 - s0 + 0.4, 'tri', a=0.6, d=9, s=0.8, r=0.5, hold=s1 - s0 - 0.1), s0, 0.06)
t = 0.0
while t < s1 - 0.1:                                       # clock tick-tock
    put(tone(2200 if int(t * 2) % 2 == 0 else 1700, 0.05, 'sine', a=0.001, d=0.012), s0 + t, 0.18, 0.3)
    t += 0.5
for k, n in enumerate((76, 72, 69, 67, 64)):              # drowsy music-box line, falling
    put(tone(note(n), 0.9, 'bell', a=0.002, d=0.5), s0 + 0.3 + k * 0.5, 0.09, -0.2)

# --------------------------------------------------------------- 1: VS, riser, 3-2-1-GO
n = int(2.3 * SR); tt = np.arange(n) / SR
sweep = np.sin(2 * np.pi * np.cumsum(180 + 900 * (tt / 2.3) ** 2) / SR) * (tt / 2.3) ** 2
put(sweep, s1 + 0.3, 0.10)
put(noise(2.3, 9) * (tt / 2.3) ** 3, s1 + 0.3, 0.05)
put(kick(0.5), s1 + 0.35, 0.6)                            # VS slam
put(noise(0.4, 0.12), s1 + 0.35, 0.18)
for k, m in enumerate((0.9, 1.5, 2.1)):
    put(tone(880, 0.13, 'pulse', a=0.002, d=0.08), s1 + m, 0.16)
put(tone(1318.5, 0.32, 'pulse', a=0.002, d=0.2), s1 + 2.6, 0.18)

# --------------------------------------------------------------- 2..5: the groove
BPM = 124; B = 60 / BPM
g0, g1 = S[2], S[5] + 3.0                                 # groove runs into the CTA
put(kick(0.6), g0, 0.9); put(noise(0.6, 0.25), g0, 0.22)  # drop impact
put(tone(55, 1.2, 'sine', a=0.003, d=0.5), g0, 0.5)
prog = [(57, (69, 72, 76)), (53, (65, 69, 72)), (60, (67, 72, 76)), (55, (67, 71, 74))]   # Am F C G
beat = 0
t = g0
while t < g1:
    bar = (beat // 4) % 4
    root, chord = prog[bar]
    put(kick(), t, 0.75)
    if beat % 4 in (1, 3):
        put(noise(0.12, 0.045), t, 0.22, 0.1)            # clap
    put(noise(0.04, 0.012), t + B / 2, 0.08, 0.4)         # off-beat hat
    put(noise(0.03, 0.01), t, 0.04, -0.4)
    for h in (0, 1):                                      # bass 8ths, octave bounce
        put(tone(note(root - 24 + (12 if h else 0)), B / 2 * 0.95, 'saw', a=0.004, d=0.18, s=0.4, r=0.03, hold=B / 2 * 0.8), t + h * B / 2, 0.14)
    arp = chord + (chord[0] + 12,)
    for k in range(2):                                    # 8th-note arpeggio lead
        put(tone(note(arp[(beat * 2 + k) % 4]), B / 2, 'pulse', a=0.003, d=0.14), t + k * B / 2, 0.05, 0.25 if k else -0.25)
    if beat % 4 == 0:
        for fn in chord:                                  # soft chord stab
            put(tone(note(fn - 12), B * 3.6, 'tri', a=0.02, d=1.2, s=0.3, r=0.2, hold=B * 3.3), t, 0.03)
    beat += 1; t += B

# final chord (C major add9) ringing out over the CTA
for fn in (60, 64, 67, 72, 74):
    put(tone(note(fn), TOTAL - g1 + 0.5, 'bell', a=0.005, d=1.6), g1, 0.07)
    put(tone(note(fn - 12), TOTAL - g1 + 0.5, 'tri', a=0.05, d=2.5), g1, 0.04)

# --------------------------------------------------------------- SFX aligned to the picture
ding = lambda t0, f=1568: put(tone(f, 0.6, 'bell', a=0.001, d=0.25), t0, 0.16, 0.1)
click = lambda t0: (put(noise(0.025, 0.006), t0, 0.25), put(tone(1200, 0.04, 'sine', a=0.001, d=0.01), t0, 0.12))
ding(S[2] + 0.6, 1318.5); ding(S[2] + 0.75, 1975.5)      # icon pops
click(S[2] + 2.85)                                         # Find opponent
click(S[3] + 0.9); click(S[3] + 1.8)                       # answer, Submit
ding(S[3] + 2.6, 2093)                                     # +118
for k, fn in enumerate((72, 76, 79, 84)):                  # level up!
    put(tone(note(fn), 0.25, 'pulse', a=0.002, d=0.12), S[4] + 0.6 + k * 0.07, 0.10)
for k in range(3):                                         # chips
    put(tone(note(79 + k * 2), 0.15, 'sine', a=0.002, d=0.06), S[4] + 1.9 + k * 0.22, 0.09)
ding(S[5] + 0.2, 1046.5); ding(S[5] + 0.9, 1568)          # CTA icon, button

# --------------------------------------------------------------- master
mix = np.stack([L, R], 1)[: int(TOTAL * SR)]
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
fade = int(0.8 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]
mix = mix / (np.abs(mix).max() + 1e-9) * 0.89
pcm = (mix * 32767).astype('<i2')
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'music: {sys.argv[2]} ({TOTAL:.2f}s)')
