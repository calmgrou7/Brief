// 04 해운대 — the beach at sundown: waves rolling in, parasols folding, people walking the
// shoreline, Dongbaek island's pines and lighthouse, the towers lighting up window by window.
// The ink flips to night in the middle of this scene.
import type { Palette } from '../../lib/daynight.ts';
import { el, f } from '../../lib/ink.ts';
import { W, SP, P, S, C, G, brect, oval, srnd, reseed, sky, win, stepWins, tintAll, lerp, easeInOut, light, stepLights, stars, type Win, type Light } from '../kit.ts';
import { layers, type Scene } from '../scene.ts';
import { Person } from '../people.ts';
import { reflection, gulls } from '../sea.ts';

const HORIZON = 560, SHORE = 700;

export function haeundae(svg: SVGSVGElement, filter: string): Scene {
  reseed(59);
  const L = layers(svg, filter);
  const paintSky = sky(svg, L.back, 'sky-hd', -60, -100, W + 60, 1100);
  const twinkle = stars(L.back, 40, -40, -80, W + 40, 380);

  // setting sun sinking into the horizon
  const sunGlow = el('ellipse', { cx: 150, cy: HORIZON - 30, rx: 160, ry: 100, fill: 'url(#glow-warm)', opacity: 0 }, L.glow);
  const sun = el('circle', { cx: 150, cy: HORIZON - 30, r: 22, fill: '#ffd6a0', stroke: 'currentColor', 'stroke-width': SP }, L.ink);

  // skyline: slim towers on the right, a stepped crowd of hotels
  const city = G(L.ink);
  const wins: Win[] = [];
  const tower = (x0: number, w: number, top: number, crown: boolean) => {
    S(city, `M${x0} ${HORIZON} L${x0} ${top + 10} Q${x0 + w / 2} ${top - (crown ? 14 : 2)} ${x0 + w} ${top + 10} L${x0 + w} ${HORIZON}Z`, SP);
    for (let y = top + 18; y < HORIZON - 10; y += 11) for (let x = x0 + 4; x < x0 + w - 5; x += 8) wins.push(win(city, brect(x, y, x + 4.5, y + 6, 0.15), srnd(0.05, 0.6), SP * 0.4));
  };
  tower(250, 40, 330, false); tower(300, 34, 300, false);
  tower(395, 44, 160, true); tower(448, 38, 220, true); tower(492, 46, 190, true);
  tower(342, 46, 360, false);
  // Dongbaek island on the left, pines and a lighthouse
  S(city, `M-30 ${HORIZON} Q10 470 70 462 Q130 470 170 ${HORIZON}Z`, SP);
  for (let i = 0; i < 7; i++) {
    const x = -10 + i * 24, y = 476 + Math.abs(i - 3) * 6;
    P(city, `M${x} ${y + 16} Q${x + 2} ${y + 6} ${x - 2} ${y}`, SP * 0.7);
    S(city, `M${x - 12} ${y + 2} Q${x - 2} ${y - 10} ${x + 10} ${y} Q${x} ${y + 4} ${x - 12} ${y + 2}Z`, SP * 0.6);
  }
  S(city, `M128 ${HORIZON - 26} L131 ${HORIZON - 64} L139 ${HORIZON - 64} L142 ${HORIZON - 26}Z`, SP * 0.8);
  S(city, `M128 ${HORIZON - 64} L142 ${HORIZON - 64} L139 ${HORIZON - 74} L131 ${HORIZON - 74}Z`, SP * 0.7);
  const lights: Light[] = [light(L.glow, 135, HORIZON - 69, 34, 0.15, 'glow-white')];
  const beam = el('path', { d: '', fill: '#fff3d8', opacity: 0 }, L.glow);

  // the sea: horizon line, swell lines; rolling surf
  S(L.ink, `M-40 ${HORIZON} L${W + 40} ${HORIZON} L${W + 40} ${SHORE} L-40 ${SHORE}Z`, SP);
  const swell = P(L.ink, '', SP * 0.5);
  const surf = [0, 1, 2].map(() => P(L.ink, '', SP * 0.8));
  // the sand
  S(L.ink, `M-40 ${SHORE} L${W + 40} ${SHORE} L${W + 40} 1100 L-40 1100Z`, SP);
  P(L.ink, Array.from({ length: 50 }, () => { const x = srnd(-20, W + 20), y = srnd(SHORE + 30, 1000); return `M${f(x)} ${f(y)} l2 0`; }).join(' '), SP * 0.5);
  // parasols that fold up as the sun goes down
  const paras = [60, 190, 330, 460].map((x, i) => ({ x, y: 820 + (i % 2) * 70, col: ['#d9534f', '#2f6fb0', '#e9b949', '#3e9a6a'][i], n: C(L.ink, '', ['#d9534f', '#2f6fb0', '#e9b949', '#3e9a6a'][i]), pole: P(L.ink, '', SP * 0.8) }));
  const footprints = P(L.ink, Array.from({ length: 16 }, (_, i) => oval(30 + i * 30, 776 + (i % 2) * 5, 1.6, 1)).join(' '), SP * 0.4);
  void footprints;

  const pg = G(L.ink);
  const people = [
    new Person(pg, 'coat', 560, 770, -1, 0.66, { shirt: '#c96f5b' }),
    new Person(pg, 'tourist', 600, 780, -1, 0.66, { shirt: '#e8d9b5' }),
    new Person(pg, 'kid', -30, 860, 1, 0.66, { speedMul: 0.8 }),
    new Person(pg, 'tourist', -60, 930, 1, 0.7, { stopAt: 300, action: 'photo', actionFor: 3, shirt: '#9fb8e8', extra: '#e9b949' }),
  ];
  const towerRefl = [270, 320, 365, 417, 467, 515].map((x) => reflection(L.glow, x, HORIZON + 6, 120, '#ffd28a', 18));
  const birds = gulls(L.ink, 5, -20, W + 20, 160, 360, 1.2);
  const phoneGlow = el('ellipse', { rx: 14, ry: 14, fill: 'url(#glow-white)', opacity: 0 }, L.glow);

  const dur = 6.0;
  return {
    root: L.root, dur, tau: [0.744, 0.79],
    title: { han: '海 雲 臺', name: '해운대' },
    caps: [
      { at: 0.5, lines: ['해가 바다로 내려앉으면'], sub: '해운대구 · 해운대해수욕장' },
      { at: 3.0, lines: ['빌딩 창마다', '하나둘 불이 켜져요'] },
    ],
    update(t, dt, Pl: Palette) {
      paintSky(Pl); twinkle(t, Pl); tintAll(L.ink, Pl); stepWins(wins, Pl, dt); stepLights(lights, Pl.lamp, dt);
      const u = easeInOut(t / dur);
      L.cam.setAttribute('transform', `translate(270 480) scale(${f(lerp(1.0, 1.1, u))}) translate(-270 ${f(-480 - lerp(0, -30, u))})`);
      const sy = HORIZON - 30 + t * 9;
      sun.setAttribute('cy', f(sy)); sunGlow.setAttribute('cy', f(sy));
      sun.setAttribute('opacity', f(sy < HORIZON + 10 ? 1 : 0));
      sunGlow.setAttribute('opacity', f(Pl.sunset * 0.9));
      sun.style.clipPath = `inset(0 0 ${f(Math.max(0, sy + 22 - HORIZON) / 44 * 100)}% 0)`;
      // swell + surf: lines that roll toward the shore and break
      swell.setAttribute('d', Array.from({ length: 9 }, (_, i) => { const y = HORIZON + 12 + i * 14, x = ((i * 97 + t * 10) % 600) - 40; return `M${f(x)} ${y} q30 -2 60 0 M${f(x - 300)} ${y + 5} q30 -2 60 0`; }).join(' '));
      surf.forEach((n, i) => {
        const k = ((t / 2.2 + i / 3) % 1), y = lerp(SHORE - 56, SHORE + 8, k);
        const amp = 2.4 * Math.sin(k * Math.PI);
        n.setAttribute('d', `M-30 ${f(y)} ` + Array.from({ length: 12 }, (_, j) => `q${25} ${f(-amp * (j % 2 ? -1 : 1))} 50 0`).join(' '));
        n.setAttribute('opacity', f(Math.sin(k * Math.PI)));
      });
      // parasols close as the light goes
      const close = Math.min(1, Pl.lamp * 1.6);
      paras.forEach((p) => {
        const w = lerp(38, 7, close), h = lerp(14, 34, close), top = p.y - 70;
        p.pole.setAttribute('d', `M${p.x} ${top} L${p.x} ${p.y}`);
        p.n.setAttribute('d', `M${f(p.x - w)} ${f(top + h)} Q${p.x} ${f(top - 10 + close * 6)} ${f(p.x + w)} ${f(top + h)} Q${p.x} ${f(top + h - 6)} ${f(p.x - w)} ${f(top + h)}Z`);
      });
      // lighthouse beam sweeps once it is on
      const a = t * 1.6, k = lights[0].k;
      beam.setAttribute('d', `M135 ${HORIZON - 69} L${f(135 + Math.cos(a) * 260)} ${f(HORIZON - 69 + Math.sin(a) * 16 - 10)} L${f(135 + Math.cos(a) * 260)} ${f(HORIZON - 69 + Math.sin(a) * 16 + 10)}Z`);
      beam.setAttribute('opacity', f(k * 0.25 * Math.abs(Math.cos(a))));
      towerRefl.forEach((r) => r(t, Pl.lamp));
      birds(t);
      people.forEach((p) => { p.draw(t, dt, Pl); });
      const ph = people[3].phoneScene();
      phoneGlow.setAttribute('opacity', f(ph ? Pl.lamp * 0.9 : 0));
      if (ph) { phoneGlow.setAttribute('cx', f(ph[0])); phoneGlow.setAttribute('cy', f(ph[1])); }
    },
  };
}
