// 감천 05 · 밤 — the same hillside as the morning view, now indigo: windows come on one
// by one, lamps light the stair lanes, stars and a crescent moon. The outro and the
// production credit play over this scene.
import { el, f } from '../../../lib/ink.ts';
import { W, SP, sky, stars, stepWins, tintAll, lerp, easeInOut, stepLights, reseed } from '../../kit.ts';
import { layers, type Scene } from '../../scene.ts';
import { hillVillage } from './village.ts';

export function gcNight(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  const paintSky = sky(svg, L.back, 'sky-gn', -60, -200, W + 60, 1200);
  reseed(9);
  const twinkle = stars(L.back, 80, -40, -120, W + 40, 260);
  el('path', { d: 'M110 60 a20 20 0 1 0 16 30 a15 15 0 1 1 -16 -30Z', fill: '#f6efd8', stroke: 'currentColor', 'stroke-width': SP }, L.ink);
  el('ellipse', { cx: 110, cy: 80, rx: 70, ry: 70, fill: 'url(#glow-white)', opacity: 0.25 }, L.glow);
  const v = hillVillage(L.ink, L.glow, 5);
  // each lit window gets a soft warm glow too
  const glows = v.wins.filter((_, i) => i % 3 === 0).map((w) => {
    const d = w.n.getAttribute('d')!.match(/M([\d.-]+) ([\d.-]+)/)!;
    return { w, n: el('ellipse', { cx: Number(d[1]) + 3.5, cy: Number(d[2]) + 4, rx: 9, ry: 8, fill: 'url(#glow-warm)', opacity: 0 }, L.glow) };
  });
  const dur = 7.0;
  return {
    root: L.root, dur, tau: [0.756, 0.85],
    title: { han: '夜 景', name: '감천의 밤' },
    caps: [
      { at: 0.5, lines: ['밤이 되면', '집집마다 불이 켜지고'] },
      { at: 3.4, lines: ['산비탈 전체가', '작은 별자리가 돼요'] },
    ],
    update(t, dt, Pl) {
      paintSky(Pl); twinkle(t, Pl); tintAll(L.ink, Pl); stepWins(v.wins, Pl, dt); stepLights(v.lamps, Pl.lamp, dt, 0.05);
      glows.forEach((g) => g.n.setAttribute('opacity', f(g.w.k * 0.7)));
      const u = easeInOut(t / dur);
      L.cam.setAttribute('transform', `translate(270 480) scale(${f(lerp(1.3, 1.0, u))}) translate(${f(-270 + lerp(20, 0, u))} ${f(-480 - lerp(160, -20, u))})`);
    },
  };
}
