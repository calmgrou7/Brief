// 05 광안대교 — night: the double-deck suspension bridge strung with lights that ripple in
// colour, headlights crossing, fireworks over the water, people on Gwangalli beach.
import type { Palette } from '../../lib/daynight.ts';
import { el, f } from '../../lib/ink.ts';
import { W, SP, P, S, G, brect, srnd, mrnd, reseed, sky, win, stepWins, tintAll, lerp, easeInOut, stars, smooth, type Win } from '../kit.ts';
import { layers, type Scene } from '../scene.ts';
import { Person } from '../people.ts';
import { water, reflection } from '../sea.ts';

const DECK = 500, TOP = 330, T1 = 150, T2 = 390, WATER = 560, SAND = 840;
const hsl = (h: number, s = 85, l = 66) => `hsl(${h.toFixed(0)} ${s}% ${l}%)`;

export function gwangan(svg: SVGSVGElement, filter: string): Scene {
  reseed(71);
  const L = layers(svg, filter);
  const paintSky = sky(svg, L.back, 'sky-ga', -60, -100, W + 60, 1100);
  const twinkle = stars(L.back, 70, -40, -80, W + 40, 420);
  // crescent moon
  const moon = G(L.ink);
  el('path', { d: 'M440 140 a22 22 0 1 0 18 34 a17 17 0 1 1 -18 -34Z', fill: '#f6efd8', stroke: 'currentColor', 'stroke-width': SP }, moon);
  el('ellipse', { cx: 440, cy: 160, rx: 70, ry: 70, fill: 'url(#glow-white)', opacity: 0.25 }, L.glow);

  // far skyline (Marine City) behind the bridge
  const far = G(L.ink, { opacity: 0.55 });
  const wins: Win[] = [];
  let x = -20;
  while (x < W + 20) {
    const w = srnd(18, 34), h = srnd(40, 150);
    S(far, `M${x} ${DECK + 40} L${x} ${DECK + 40 - h} Q${x + w / 2} ${DECK + 40 - h - 6} ${x + w} ${DECK + 40 - h} L${x + w} ${DECK + 40}Z`, SP * 0.7);
    for (let y = DECK + 46 - h; y < DECK + 30; y += 10) for (let xx = x + 3; xx < x + w - 4; xx += 7) if (srnd() < 0.6) wins.push(win(far, brect(xx, y, xx + 3.6, y + 5, 0.1), srnd(0.0, 0.3), SP * 0.3));
    x += w + srnd(2, 8);
  }

  // the bridge: towers, main cable, hangers, double deck
  const br = G(L.ink);
  const cable = (x: number) => {
    if (x < T1) return lerp(DECK - 6, TOP, Math.pow(Math.max(0, x + 60) / (T1 + 60), 1.6));
    if (x > T2) return lerp(TOP, DECK - 6, Math.pow((x - T2) / (W + 60 - T2), 0.62));
    const u = (x - T1) / (T2 - T1); return TOP + (DECK - 50 - TOP) * 4 * u * (1 - u);
  };
  const cpath: string[] = [];
  for (let xx = -60; xx <= W + 60; xx += 6) cpath.push(`${xx === -60 ? 'M' : 'L'}${xx} ${f(cable(xx))}`);
  P(br, cpath.join(' '), SP);
  const hang: string[] = [];
  for (let xx = -50; xx < W + 60; xx += 10) if (Math.abs(xx - T1) > 6 && Math.abs(xx - T2) > 6) hang.push(`M${xx} ${f(cable(xx))} L${xx} ${DECK}`);
  P(br, hang.join(' '), SP * 0.4);
  for (const tx of [T1, T2]) {
    S(br, `M${tx - 9} ${WATER + 6} L${tx - 7} ${TOP - 12} L${tx + 7} ${TOP - 12} L${tx + 9} ${WATER + 6}Z`, SP);
    P(br, `M${tx - 7} ${TOP + 30} L${tx + 7} ${TOP + 30} M${tx - 8} ${TOP + 90} L${tx + 8} ${TOP + 90} M${tx - 4} ${TOP - 4} l0 20 M${tx + 4} ${TOP - 4} l0 20`, SP * 0.6);
  }
  S(br, `M-60 ${DECK} L${W + 60} ${DECK} L${W + 60} ${DECK + 9} L-60 ${DECK + 9}Z`, SP);
  S(br, `M-60 ${DECK + 16} L${W + 60} ${DECK + 16} L${W + 60} ${DECK + 24} L-60 ${DECK + 24}Z`, SP);
  P(br, Array.from({ length: 40 }, (_, i) => `M${i * 16 - 50} ${DECK + 9} l0 7`).join(' '), SP * 0.45);
  for (const px of [30, 270, 510]) S(br, brect(px - 5, DECK + 24, px + 5, WATER + 6, 0.3), SP * 0.8);

  // LED lights along the cable and the deck: colour ripples across the span
  const leds: Array<{ n: SVGCircleElement; h: SVGCircleElement; x: number }> = [];
  for (let xx = -50; xx < W + 60; xx += 8) {
    const y = cable(xx);
    leds.push({ x: xx, h: el('circle', { cx: xx, cy: y, r: 7, opacity: 0 }, L.glow), n: el('circle', { cx: xx, cy: y, r: 1.4, opacity: 0 }, L.glow) });
  }
  const deckLeds: Array<{ n: SVGCircleElement; x: number }> = [];
  for (let xx = -50; xx < W + 60; xx += 12) deckLeds.push({ x: xx, n: el('circle', { cx: xx, cy: DECK + 12, r: 2.4, opacity: 0 }, L.glow) });
  // headlights and tail lights crossing
  const carsG = G(L.glow);
  const cars = Array.from({ length: 12 }, (_, i) => ({ x: srnd(-60, W + 60), dir: i % 2 ? 1 : -1, lane: i % 2 ? DECK + 4 : DECK + 20, sp: srnd(40, 70), n: el('ellipse', { rx: 4, ry: 2, fill: i % 2 ? '#fff3d8' : '#ff6b5a', opacity: 0.9 }, carsG) }));

  // water + reflections of the bridge
  S(L.ink, `M-60 ${WATER} L${W + 60} ${WATER} L${W + 60} ${SAND} L-60 ${SAND}Z`, SP);
  const waves = water(L.ink, -20, W + 20, WATER + 6, SAND - 6, 80);
  const refl = Array.from({ length: 14 }, (_, i) => { const xx = -20 + i * 42; return { x: xx, r: reflection(L.glow, xx, WATER + 10 + (i % 3) * 8, 150 + (i % 4) * 25, '#ffffff', 12) }; });
  const reflNodes = Array.from(L.glow.querySelectorAll('path')).slice(-14);

  // fireworks: radial strokes that burst, droop and fade
  const fwG = G(L.glow);
  const fireworks = [
    { at: 1.4, x: 270, y: 210, hue: 330, r: 90 },
    { at: 2.4, x: 130, y: 250, hue: 45, r: 70 },
    { at: 3.2, x: 420, y: 230, hue: 190, r: 80 },
    { at: 4.6, x: 280, y: 170, hue: 280, r: 110 },
    { at: 5.4, x: 180, y: 220, hue: 20, r: 75 },
  ].map((fw) => ({ ...fw, n: el('path', { fill: 'none', stroke: hsl(fw.hue, 90, 72), 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0 }, fwG), core: el('circle', { cx: fw.x, cy: fw.y, r: 40, fill: 'url(#glow-white)', opacity: 0 }, fwG), trail: el('path', { fill: 'none', stroke: hsl(fw.hue, 60, 85), 'stroke-width': 1.2, opacity: 0 }, fwG), rays: Array.from({ length: 22 }, (_, k) => (k / 22) * Math.PI * 2 + mrnd(-0.08, 0.08)) }));

  // Gwangalli beach in front
  S(L.ink, `M-60 ${SAND} L${W + 60} ${SAND} L${W + 60} 1100 L-60 1100Z`, SP);
  const surf = P(L.ink, '', SP * 0.7);
  const pg = G(L.ink);
  const people = [
    new Person(pg, 'tourist', 200, 930, 1, 0.72, { stand: true, action: 'photo' }),
    new Person(pg, 'coat', 236, 934, 1, 0.72, { stand: true, action: 'wave', shirt: '#7c6aa6' }),
    new Person(pg, 'kid', -40, 990, 1, 0.72, { speedMul: 0.8 }),
    new Person(pg, 'tourist', 600, 900, -1, 0.68, { shirt: '#c96f5b', extra: '#2f6fb0' }),
  ];
  const phoneGlow = el('ellipse', { rx: 16, ry: 16, fill: 'url(#glow-white)', opacity: 0 }, L.glow);

  const dur = 6.6;
  return {
    root: L.root, dur, tau: [0.79, 0.86],
    title: { han: '廣 安 大 橋', name: '광안대교' },
    caps: [
      { at: 0.5, lines: ['밤이 되면 바다 위에', '빛으로 된 다리가 떠요'], sub: '수영구 · 광안리해수욕장' },
      { at: 3.4, lines: ['불꽃이 터지는 밤,', '부산의 하루가 끝나요'] },
    ],
    update(t, dt, Pl: Palette) {
      paintSky(Pl); twinkle(t, Pl); tintAll(L.ink, Pl); stepWins(wins, Pl, dt);
      const u = easeInOut(t / dur);
      L.cam.setAttribute('transform', `translate(270 480) scale(${f(lerp(1.14, 1.0, u))}) translate(-270 ${f(-480 - lerp(-30, 10, u))})`);
      const on = Pl.lamp;
      leds.forEach((l) => {
        const hue = (l.x * 0.9 - t * 120) % 360;
        const c = hsl(hue < 0 ? hue + 360 : hue);
        const k = on * (0.65 + 0.35 * Math.sin(t * 4 - l.x * 0.05));
        l.n.setAttribute('fill', '#fff'); l.n.setAttribute('opacity', f(k));
        l.h.setAttribute('fill', c); l.h.setAttribute('opacity', f(k * 0.4));
      });
      deckLeds.forEach((l) => { const hue = (l.x * 0.9 - t * 120 + 180) % 360; l.n.setAttribute('fill', hsl(hue < 0 ? hue + 360 : hue, 80, 70)); l.n.setAttribute('opacity', f(on * 0.75)); });
      cars.forEach((c) => {
        c.x += c.dir * c.sp * dt; if (c.x > W + 70) c.x = -70; if (c.x < -70) c.x = W + 70;
        c.n.setAttribute('cx', f(c.x)); c.n.setAttribute('cy', f(c.lane));
      });
      waves(t, 0.2);
      refl.forEach((r, i) => { const hue = (r.x * 0.9 - t * 120) % 360; reflNodes[i].setAttribute('stroke', hsl(hue < 0 ? hue + 360 : hue, 80, 70)); r.r(t, on * 0.55); });
      surf.setAttribute('d', `M-60 ${f(SAND + 6 + Math.sin(t * 1.4) * 3)} ` + Array.from({ length: 14 }, (_, j) => `q25 ${j % 2 ? 2 : -2} 50 0`).join(' '));
      fireworks.forEach((fw) => {
        const s = t - fw.at;
        if (s < -0.7 || s > 2.2) { fw.n.setAttribute('opacity', 0); fw.core.setAttribute('opacity', 0); fw.trail.setAttribute('opacity', 0); return; }
        if (s < 0) {   // rising trail
          const y = lerp(WATER, fw.y, smooth(-0.7, 0, s));
          fw.trail.setAttribute('d', `M${fw.x} ${f(y + 30)} L${fw.x} ${f(y)}`); fw.trail.setAttribute('opacity', 0.8);
          return;
        }
        fw.trail.setAttribute('opacity', 0);
        const k = 1 - Math.pow(1 - Math.min(1, s / 0.6), 3), r = fw.r * k, droop = s * s * 10;
        fw.n.setAttribute('d', fw.rays.map((a) => {
          const x1 = fw.x + Math.cos(a) * r, y1 = fw.y + Math.sin(a) * r + droop;
          const x0 = fw.x + Math.cos(a) * r * 0.55, y0 = fw.y + Math.sin(a) * r * 0.55 + droop * 0.5;
          return `M${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)}`;
        }).join(' '));
        fw.n.setAttribute('opacity', f(1 - smooth(0.6, 2.2, s)));
        fw.core.setAttribute('opacity', f((1 - smooth(0, 0.5, s)) * 0.9));
      });
      people.forEach((p) => p.draw(t, dt, Pl));
      const ph = people[0].phoneScene();
      phoneGlow.setAttribute('opacity', f(ph ? 0.9 : 0));
      if (ph) { phoneGlow.setAttribute('cx', f(ph[0])); phoneGlow.setAttribute('cy', f(ph[1])); }
    },
  };
}
