// 감천 01 · 아침 전경 — the whole hillside village wakes up; the camera drifts in.
import { el, f } from '../../../lib/ink.ts';
import { W, SP, P, sky, stepWins, tintAll, lerp, easeInOut, stepLights } from '../../kit.ts';
import { layers, type Scene } from '../../scene.ts';
import { gulls } from '../../sea.ts';
import { hillVillage } from './village.ts';

export function gcView(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  const paintSky = sky(svg, L.back, 'sky-gv', -60, -200, W + 60, 1200);
  const sun = el('circle', { cx: 430, cy: 120, r: 24, fill: '#fff4dc', stroke: 'currentColor', 'stroke-width': SP }, L.ink);
  const clouds = P(L.ink, 'M40 70 L170 70 q8 0 8 -6 q0 -5 -6 -4 M70 82 L210 82 q7 0 7 6 M260 40 L360 40 q6 0 6 -5', SP * 0.8);
  const v = hillVillage(L.ink, L.glow, 5);
  const birds = gulls(L.ink, 5, -20, W + 20, 60, 220, 0.9);
  const dur = 6.0;
  return {
    root: L.root, dur, tau: [0.33, 0.43],
    title: { han: '甘 川 洞', name: '감천문화마을' },
    caps: [
      { at: 0.5, lines: ['부산 사하구 산비탈에'], sub: '부산광역시 사하구 감천동' },
      { at: 2.9, lines: ['알록달록 상자처럼', '집들이 층층이 쌓였어요'] },
    ],
    update(t, dt, Pl) {
      paintSky(Pl); tintAll(L.ink, Pl); stepWins(v.wins, Pl, dt); stepLights(v.lamps, Pl.lamp, dt);
      const u = easeInOut(t / dur);
      L.cam.setAttribute('transform', `translate(270 480) scale(${f(lerp(1.0, 1.22, u))}) translate(${f(-270 + lerp(0, 20, u))} ${f(-480 - lerp(-20, 120, u))})`);
      sun.setAttribute('cy', f(120 - t * 5));
      clouds.setAttribute('transform', `translate(${f(t * 4)} 0)`);
      birds(t);
    },
  };
}
