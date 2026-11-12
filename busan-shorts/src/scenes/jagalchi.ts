// 02 자갈치시장 — the market hall with its gull-wing roof, parasol stalls with basins of
// fish, ajummas calling out, bulbs on a wire, fishing boats and gulls on the harbour.
import type { Palette } from '../../lib/daynight.ts';
import { el, f } from '../../lib/ink.ts';
import { W, SP, P, S, B, C, G, brect, oval, srnd, reseed, sky, win, stepWins, tintAll, lerp, easeInOut, light, stepLights, type Win, type Light } from '../kit.ts';
import { layers, type Scene } from '../scene.ts';
import { Person } from '../people.ts';
import { water, reflection, gulls, boat } from '../sea.ts';

const GROUND = 640, QUAY = 700, WATER = 712;

export function jagalchi(svg: SVGSVGElement, filter: string): Scene {
  reseed(33);
  const L = layers(svg, filter);
  const paintSky = sky(svg, L.back, 'sky-jg', -60, -100, W + 60, 1100);

  // far shore: Yeongdo's hills across the water, diluted
  const far = G(L.ink, { opacity: 0.42 });
  P(far, 'M-40 330 Q40 268 120 300 Q190 250 270 288 Q340 262 400 290', SP);
  for (let x = 130; x < 390; x += 22) P(far, `M${x} 300 l0 -${10 + (x % 3) * 6} l14 0 l0 ${10 + (x % 3) * 6}`, SP * 0.6);

  // the market hall: glass front under three white gull-wing shells
  const hall = G(L.ink);
  const hx0 = 230, hx1 = 600, hy = 420;
  S(hall, brect(hx0, hy, hx1, GROUND, 0.6), SP);
  const wins: Win[] = [];
  for (let y = hy + 14; y < GROUND - 40; y += 30) for (let x = hx0 + 10; x < hx1 - 10; x += 26) wins.push(win(hall, brect(x, y, x + 20, y + 22, 0.3), srnd(0.2, 0.6)));
  const wing = (x0: number, x1: number, lift: number) => {
    const m = (x0 + x1) / 2;
    S(hall, `M${x0} ${hy + 4} Q${m - 30} ${hy - lift - 10} ${m} ${hy - lift} Q${m + 30} ${hy - lift - 12} ${x1} ${hy + 2} Q${m} ${hy - lift * 0.45} ${x0} ${hy + 4}Z`, SP);
    P(hall, `M${x0 + 14} ${hy} Q${m} ${hy - lift * 0.85} ${x1 - 12} ${hy - 1}`, SP * 0.45);
  };
  wing(214, 350, 46); wing(330, 470, 58); wing(450, 600, 44);
  // sign board with real lettering
  S(hall, brect(262, GROUND - 34, 420, GROUND - 10, 0.4), SP * 0.9);
  el('text', { x: 341, y: GROUND - 16, 'font-size': 15, 'font-weight': 900, 'font-family': 'Noto Sans KR', 'text-anchor': 'middle', fill: 'currentColor', 'letter-spacing': 3 }, hall).textContent = '자갈치시장';

  // older market roofs on the left
  const old = G(L.ink);
  for (const [x0, x1, y] of [[-20, 90, 520], [80, 236, 548]] as const) {
    S(old, `M${x0} ${GROUND} L${x0} ${y} L${x1} ${y - 4} L${x1} ${GROUND}Z`, SP);
    const d: string[] = [];
    for (let x = x0 + 6; x < x1; x += 7) d.push(`M${x} ${y - 1} l0 8`);
    P(old, d.join(' '), SP * 0.45);
    wins.push(win(old, brect(x0 + 18, y + 26, x0 + 40, y + 46, 0.3), srnd(0.25, 0.5)));
  }

  // the street + stalls
  S(L.ink, `M-30 ${GROUND} L${W + 30} ${GROUND} L${W + 30} ${QUAY} L-30 ${QUAY}Z`, SP);
  P(L.ink, Array.from({ length: 20 }, (_, i) => `M${i * 30 - 10} ${GROUND + 26} l14 0`).join(' '), SP * 0.4);

  // bulbs on a sagging wire across the stalls
  const lights: Light[] = [];
  const wire: string[] = [];
  const bulbs: string[] = [];
  for (let k = 0; k < 3; k++) {
    const x0 = -10 + k * 190, x1 = x0 + 190, y = 560;
    wire.push(`M${x0} ${y} Q${(x0 + x1) / 2} ${y + 22} ${x1} ${y}`);
    for (let i = 1; i < 6; i++) {
      const u = i / 6, x = lerp(x0, x1, u), yy = y + 22 * 4 * u * (1 - u) * 0.5 * 2 / 2 * 1.0;
      bulbs.push(`M${f(x)} ${f(yy)} l0 6`); bulbs.push(oval(x, yy + 8, 2, 2.4));
      lights.push(light(L.glow, x, yy + 8, 20, 0.15 + srnd(0, 0.25)));
    }
  }
  P(L.ink, wire.join(' '), SP * 0.6);
  S(L.ink, bulbs.join(' '), SP * 0.55);

  const stalls = G(L.ink);
  const PARA = ['#d9534f', '#2f6fb0', '#e9b949', '#3e9a6a'];
  for (let i = 0; i < 4; i++) {
    const x = 20 + i * 132, top = 572;
    // parasol (folded panels) on a pole
    P(stalls, `M${x + 50} ${top} L${x + 50} ${GROUND + 6}`, SP * 0.8);
    C(stalls, `M${x} ${top + 14} Q${x + 50} ${top - 26} ${x + 100} ${top + 14} Q${x + 75} ${top + 8} ${x + 50} ${top + 12} Q${x + 25} ${top + 8} ${x} ${top + 14}Z`, PARA[i]);
    P(stalls, `M${x + 50} ${top - 6} L${x + 25} ${top + 10} M${x + 50} ${top - 6} L${x + 75} ${top + 10}`, SP * 0.5);
    // table with red rubber basins and styrofoam boxes
    S(stalls, brect(x + 4, GROUND - 4, x + 96, GROUND + 22, 0.4), SP * 0.9);
    for (let k = 0; k < 3; k++) {
      const bx = x + 10 + k * 29;
      C(stalls, `M${bx} ${GROUND - 4} L${bx + 3} ${GROUND - 15} L${bx + 23} ${GROUND - 15} L${bx + 26} ${GROUND - 4}Z`, k === 1 ? '#f3f1ea' : '#cf3f33', SP * 0.75);
      // fish: little paper ovals with tails poking out
      for (let m = 0; m < 2; m++) S(stalls, `M${bx + 6 + m * 7} ${GROUND - 16} q4 -4 9 0 q-5 3 -9 0Z`, SP * 0.5);
    }
  }
  // the ajummas behind the tables
  const pg = G(L.ink);
  const sellers = [
    new Person(pg, 'ajumma', 100, GROUND - 14, 1, 0.58, { stand: true, action: 'call' }),
    new Person(pg, 'ajumma', 360, GROUND - 14, -1, 0.58, { stand: true, action: 'wave', extra: '#7a2d3b', shirt: '#e4a35b' }),
  ];
  stalls.parentNode!.insertBefore(pg, stalls);   // behind the tables

  // walkers on the street in front
  const wg = G(L.ink);
  const walkers = [
    new Person(wg, 'tourist', -20, GROUND + 40, 1, 0.62, { stopAt: 230, action: 'photo', actionFor: 2.2 }),
    new Person(wg, 'coat', 560, GROUND + 50, -1, 0.62, { shirt: '#5b7f95' }),
    new Person(wg, 'kid', 120, GROUND + 56, 1, 0.62, { speedMul: 0.7 }),
  ];

  // quay + harbour
  S(L.ink, `M-30 ${QUAY} L${W + 30} ${QUAY} L${W + 30} ${WATER} L-30 ${WATER}Z`, SP);
  P(L.ink, Array.from({ length: 12 }, (_, i) => `M${i * 50} ${QUAY} l0 12`).join(' '), SP * 0.5);
  for (const x of [70, 300, 470]) S(L.ink, `M${x} ${QUAY} l0 -10 q6 -4 12 0 l0 10Z`, SP * 0.7);   // bollards
  const waves = water(L.ink, -20, W + 20, WATER + 8, 960, 60);
  const boats = [boat(L.ink, 110, 790, 1.5, '#2f6fb0'), boat(L.ink, 330, 860, 1.9, '#f3f1ea', '#2f6fb0'), boat(L.ink, 500, 770, 1.2, '#3e9a6a')];
  const refl = lights.filter((_, i) => i % 2 === 0).map((l) => reflection(L.glow, Number(l.n.getAttribute('cx')), WATER + 8, 60));
  const sea = gulls(L.ink, 6, -20, W + 20, 140, 380, 1.3);

  const dur = 5.8;
  return {
    root: L.root, dur, tau: [0.672, 0.722],
    title: { han: '南 浦', name: '자갈치시장' },
    caps: [
      { at: 0.5, lines: ['“오이소, 보이소,', '사이소!”'], sub: '중구 · 남포동' },
      { at: 3.1, lines: ['바다 냄새 따라', '아지매 목소리가 들려요'] },
    ],
    update(t, dt, Pl: Palette) {
      paintSky(Pl); tintAll(L.ink, Pl); stepWins(wins, Pl, dt); stepLights(lights, Pl.lamp, dt);
      const u = easeInOut(t / dur);
      L.cam.setAttribute('transform', `translate(270 480) scale(${f(lerp(1.06, 1.14, u))}) translate(${f(-270 - lerp(-14, 22, u))} ${f(-480 - lerp(10, 40, u))})`);
      waves(t); sea(t);
      boats.forEach((b) => b.draw(t));
      refl.forEach((r, i) => r(t, lights[i * 2].k));
      sellers.forEach((p) => p.draw(t, dt, Pl));
      walkers.forEach((p) => { p.draw(t, dt, Pl); if (p.offscreen(-40, W + 40)) p.x = p.dir > 0 ? -60 : W + 60; });
      void B;
    },
  };
}
