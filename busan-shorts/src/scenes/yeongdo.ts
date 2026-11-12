// 03 영도대교 — the bascule leaf lifts toward the sunset sky while traffic waits,
// people on the walkway take photos, a boat slips through. Busan Tower on its hill behind.
import type { Palette } from '../../lib/daynight.ts';
import { el, f } from '../../lib/ink.ts';
import { W, SP, P, S, C, G, brect, oval, srnd, reseed, sky, win, stepWins, tintAll, lerp, easeInOut, smooth, light, stepLights, type Win, type Light } from '../kit.ts';
import { layers, type Scene } from '../scene.ts';
import { Person } from '../people.ts';
import { water, reflection, gulls, boat } from '../sea.ts';

const DECK = 560, WATER = 640, HINGE = 196, LEAF = 190;

export function yeongdo(svg: SVGSVGElement, filter: string): Scene {
  reseed(47);
  const L = layers(svg, filter);
  const paintSky = sky(svg, L.back, 'sky-yd', -60, -100, W + 60, 1100);

  // low sun and its glow
  const sunG = L.glow;
  const sunGlow = el('ellipse', { cx: 420, cy: 400, rx: 120, ry: 90, fill: 'url(#glow-warm)', opacity: 0.0 }, sunG);
  const sun = el('circle', { cx: 420, cy: 400, r: 24, fill: '#ffe2b8', stroke: 'currentColor', 'stroke-width': SP }, L.ink);
  P(L.ink, 'M40 180 L170 180 q8 0 8 -6 q0 -5 -6 -4 M70 192 L210 192 q7 0 7 6', SP * 0.8);

  // Yongdusan hill with Busan Tower, city blocks
  const city = G(L.ink);
  S(city, 'M-30 520 Q40 380 120 360 Q200 350 260 420 Q300 470 340 520Z', SP);
  // umbrella pines along the hill
  for (const [x, y, s] of [[20, 455, 1], [62, 410, 1.2], [205, 392, 1.1], [246, 430, 0.9], [100, 384, 0.8], [292, 478, 0.8]] as const) {
    P(city, `M${x} ${y + 24 * s} Q${x + 2} ${y + 10 * s} ${x - 1} ${y}`, SP * 0.7);
    S(city, `M${x - 16 * s} ${y + 2} Q${x} ${y - 14 * s} ${x + 16 * s} ${y + 2} Q${x} ${y - 3 * s} ${x - 16 * s} ${y + 2}Z`, SP * 0.7);
    P(city, Array.from({ length: 5 }, (_, k) => `M${f(x - 12 * s + k * 6 * s)} ${f(y - 1)} l0 2.5`).join(' '), SP * 0.4);
  }
  // the tower: slim shaft, a lotus-like observation ring, an antenna
  const tx = 150;
  S(city, `M${tx - 5} 368 L${tx - 3} 210 L${tx + 3} 210 L${tx + 5} 368Z`, SP);
  S(city, `M${tx - 16} 214 Q${tx} 200 ${tx + 16} 214 L${tx + 12} 228 Q${tx} 234 ${tx - 12} 228Z`, SP);
  P(city, `M${tx - 12} 221 Q${tx} 226 ${tx + 12} 221 M${tx} 200 L${tx} 160`, SP * 0.6);
  const lights: Light[] = [light(L.glow, tx, 220, 26, 0.2, 'glow-cool'), light(L.glow, tx, 162, 8, 0.1, 'glow-white')];
  const wins: Win[] = [];
  for (let i = 0; i < 6; i++) {
    const x0 = 250 + i * 50, h = srnd(60, 120);
    S(city, brect(x0, DECK - 6 - h, x0 + 44, DECK - 6, 0.5), SP * 0.9);
    for (let y = DECK - h + 4; y < DECK - 18; y += 16) for (let x = x0 + 6; x < x0 + 38; x += 12) wins.push(win(city, brect(x, y, x + 7, y + 9, 0.2), srnd(0.08, 0.5)));
  }

  // fixed spans and piers
  const br = G(L.ink);
  S(br, `M-30 ${DECK} L${HINGE} ${DECK} L${HINGE} ${DECK + 16} L-30 ${DECK + 16}Z`, SP);
  S(br, `M${HINGE + LEAF + 4} ${DECK} L${W + 30} ${DECK} L${W + 30} ${DECK + 16} L${HINGE + LEAF + 4} ${DECK + 16}Z`, SP);
  for (const x of [40, HINGE - 26, HINGE + LEAF + 4, 500]) S(br, brect(x, DECK + 16, x + 22, WATER + 10, 0.5), SP);
  // railings with arched panels on the fixed spans
  const rail = (x0: number, x1: number) => {
    const d = [`M${x0} ${DECK - 10} L${x1} ${DECK - 10}`];
    for (let x = x0; x < x1; x += 12) d.push(`M${x} ${DECK - 10} L${x} ${DECK} M${x} ${DECK} Q${x + 6} ${DECK - 8} ${x + 12} ${DECK}`);
    return d.join(' ');
  };
  P(br, rail(-30, HINGE), SP * 0.5); P(br, rail(HINGE + LEAF + 4, W + 30), SP * 0.5);
  // lamp posts on the fixed spans
  for (const x of [30, 120, 420, 510]) {
    P(br, `M${x} ${DECK} L${x} ${DECK - 40} q0 -6 6 -6`, SP * 0.7);
    S(br, oval(x + 8, DECK - 44, 3, 2.4), SP * 0.6);
    lights.push(light(L.glow, x + 8, DECK - 44, 22, 0.12 + srnd(0, 0.2)));
  }

  // the bascule leaf, hinged at HINGE
  const leaf = G(L.ink);
  S(leaf, `M0 0 L${LEAF} 0 L${LEAF} 16 L0 16Z`, SP);
  const truss: string[] = [`M0 8 L${LEAF} 8`];
  for (let x = 0; x < LEAF; x += 19) truss.push(`M${x} 0 L${x + 9.5} 16 L${x + 19} 0`);
  P(leaf, truss.join(' '), SP * 0.45);
  P(leaf, rail(0, LEAF).replace(/DECK/g, ''), SP * 0.5);
  leaf.querySelector('path:last-child')!.setAttribute('transform', `translate(0 ${-DECK})`);
  P(leaf, `M60 0 L60 -40 q0 -6 6 -6 M140 0 L140 -40 q0 -6 6 -6`, SP * 0.7);
  S(leaf, oval(68, -44, 3, 2.4) + oval(148, -44, 3, 2.4), SP * 0.6);
  // the counterweight pit / machine house
  S(br, brect(HINGE - 30, DECK - 34, HINGE + 2, DECK, 0.4), SP);
  P(br, `M${HINGE - 24} ${DECK - 26} l20 0 M${HINGE - 24} ${DECK - 18} l20 0`, SP * 0.5);

  // waiting cars and a bus at the barrier
  const cars = G(L.ink, { transform: 'translate(-36 0)' });
  C(cars, `M60 ${DECK} L60 ${DECK - 18} Q62 ${DECK - 24} 70 ${DECK - 24} L112 ${DECK - 24} Q118 ${DECK - 22} 118 ${DECK - 14} L118 ${DECK}Z`, '#3e8a5c');
  P(cars, Array.from({ length: 4 }, (_, i) => `M${66 + i * 12} ${DECK - 20} l9 0 l0 7 l-9 0Z`).join(' '), SP * 0.5);
  C(cars, `M128 ${DECK} L130 ${DECK - 10} Q136 ${DECK - 18} 146 ${DECK - 18} L156 ${DECK - 18} Q162 ${DECK - 12} 166 ${DECK - 10} L168 ${DECK}Z`, '#e9b949');
  S(cars, oval(68, DECK, 3.4, 3.4) + oval(108, DECK, 3.4, 3.4) + oval(136, DECK, 3, 3) + oval(160, DECK, 3, 3), SP * 0.6);
  const barrier = P(br, '', SP * 0.9);

  // people on the walkway watching
  const pg = G(L.ink);
  const people = [
    new Person(pg, 'tourist', 420, DECK, -1, 0.5, { stopAt: 400, action: 'photo', actionFor: 9 }),
    new Person(pg, 'coat', 520, DECK, -1, 0.5, { stopAt: 470, action: 'wave', actionFor: 3, shirt: '#8a6f9e' }),
    new Person(pg, 'kid', 470, DECK, 1, 0.5, { stopAt: 480, action: 'wave', actionFor: 9 }),
  ];

  // water, a boat passing through when the leaf is up
  const waves = water(L.ink, -20, W + 20, WATER + 6, 960, 70);
  const ferry = boat(L.ink, 0, 0, 2.2, '#f3f1ea', '#2f6fb0');
  const sunRefl = reflection(L.glow, 420, WATER + 10, 120, '#ffc27a', 46);
  const refl = lights.slice(2).map((l) => reflection(L.glow, Number(l.n.getAttribute('cx')), WATER + 14, 50));
  const birds = gulls(L.ink, 4, -20, W + 20, 120, 300, 1.1);

  const dur = 6.2;
  return {
    root: L.root, dur, tau: [0.722, 0.752],
    title: { han: '影 島 大 橋', name: '영도대교' },
    caps: [
      { at: 0.5, lines: ['노을이 질 무렵', '다리가 하늘로 들려요'], sub: '중구 ↔ 영도구' },
      { at: 3.3, lines: ['멈춰 선 사람들 사이로', '배 한 척이 지나가요'] },
    ],
    update(t, dt, Pl: Palette) {
      paintSky(Pl); tintAll(L.ink, Pl); stepWins(wins, Pl, dt); stepLights(lights, Pl.lamp, dt);
      const u = easeInOut(t / dur);
      L.cam.setAttribute('transform', `translate(270 480) scale(${f(lerp(1.12, 1.0, u))}) translate(-270 ${f(-480 - lerp(40, 0, u))})`);
      sunGlow.setAttribute('opacity', f(0.35 + Pl.sunset * 0.6));
      sun.setAttribute('cy', f(400 + t * 6)); sunGlow.setAttribute('cy', f(400 + t * 6));
      // leaf lifts between 0.8 s and 3.6 s, to about 68°
      const lift = smooth(0.8, 3.6, t) * 68;
      leaf.setAttribute('transform', `translate(${HINGE + 4} ${DECK}) rotate(${f(-lift)})`);
      const arm = smooth(0.2, 0.8, t) * 1.45, bx = HINGE - 46;
      barrier.setAttribute('d', `M${bx} ${DECK - 14} L${bx} ${DECK} M${bx} ${DECK - 13} L${f(bx - 26 * Math.cos(arm))} ${f(DECK - 13 - 26 * Math.sin(arm))}`);
      // ferry passes under once the leaf is high
      const fx = lerp(620, -80, smooth(2.6, 6.2, t));
      ferry.g.setAttribute('data-x', f(fx));
      ferry.draw(t);
      ferry.g.setAttribute('transform', ferry.g.getAttribute('transform')!.replace(/translate\([^)]*\)/, `translate(${f(fx)} ${f(WATER + 26 + Math.sin(t * 1.6) * 1.4)})`));
      waves(t); birds(t);
      sunRefl(t, 0.4 + Pl.sunset * 0.6);
      refl.forEach((r, i) => r(t, lights[i + 2].k));
      people.forEach((p) => p.draw(t, dt, Pl));
    },
  };
}
