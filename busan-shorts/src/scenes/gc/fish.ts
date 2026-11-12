// 감천 03 · 물고기 골목 — a long painted alley wall. Fish-shaped direction signs mark the
// way; a little school of fish swims along the wall and a kid runs after them.
import { el, f } from '../../../lib/ink.ts';
import { W, SP, P, S, C, G, brect, srnd, reseed, sky, win, stepWins, tintAll, lerp, easeInOut, type Win } from '../../kit.ts';
import { layers, type Scene } from '../../scene.ts';
import { Person } from '../../people.ts';
import { fishShape } from '../../props.ts';
import { gulls } from '../../sea.ts';
import { PASTEL } from './village.ts';

const GROUND = 720;

export function gcFish(svg: SVGSVGElement, filter: string): Scene {
  reseed(104);
  const L = layers(svg, filter);
  const paintSky = sky(svg, L.back, 'sky-gf', -100, -200, W + 100, 1200);
  const wins: Win[] = [];
  const clouds = P(L.ink, 'M60 150 L200 150 q8 0 8 -6 q0 -5 -6 -4 M300 200 L430 200 q7 0 7 6', SP * 0.8);

  // rooftops peeking over the wall
  const back = G(L.ink);
  let x = -60;
  while (x < W + 60) {
    const w = srnd(50, 90), h = srnd(90, 170);
    C(back, brect(x, 460 - h, x + w, 470, 0.6), PASTEL[Math.floor(srnd(0, PASTEL.length))]);
    for (let k = 0; k < 2; k++) { const wx = x + 10 + k * (w / 2); wins.push(win(back, brect(wx, 460 - h + 20, wx + 16, 460 - h + 38, 0.3), srnd(0.2, 0.6))); }
    if (srnd() < 0.5) C(back, `M${f(x + 10)} ${f(460 - h)} l0 -14 q8 -4 16 0 l0 14Z`, '#3f7cc0', SP * 0.7);
    x += w + srnd(-4, 6);
  }

  // the long wall, painted with waves
  S(L.ink, brect(-60, 470, W + 60, GROUND, 0.8), SP);
  C(L.ink, `M-60 620 Q-20 600 20 620 T100 620 T180 620 T260 620 T340 620 T420 620 T500 620 T580 620 L580 ${GROUND} L-60 ${GROUND}Z`, '#bfe0ea', SP * 0.8);
  P(L.ink, `M-60 650 Q-20 636 20 650 T100 650 T180 650 T260 650 T340 650 T420 650 T500 650 T580 650`, SP * 0.5);
  P(L.ink, Array.from({ length: 14 }, (_, i) => `M${i * 44 - 40} 470 l0 ${150 - (i % 2) * 20}`).join(' '), SP * 0.3);
  // fixed fish signs pointing up the lane, with little arrows of text
  const signs = G(L.ink);
  for (const [sx, sy, c] of [[60, 530, '#e76f51'], [250, 545, '#2a9d8f'], [440, 525, '#e9b949']] as const) {
    C(signs, `M${sx - 20} ${sy} Q${sx} ${sy - 14} ${sx + 22} ${sy} Q${sx} ${sy + 14} ${sx - 20} ${sy}Z M${sx - 20} ${sy} L${sx - 32} ${sy - 10} L${sx - 30} ${sy + 10}Z`, c, SP * 0.9);
    el('circle', { cx: sx + 12, cy: sy - 2, r: 1.6, fill: 'currentColor' }, signs);
    P(signs, `M${sx - 8} ${sy + 4} q4 -6 8 0 q4 6 8 0`, SP * 0.5);
  }
  // the lane in front
  S(L.ink, brect(-60, GROUND, W + 60, 1100, 0.6), SP);
  P(L.ink, Array.from({ length: 30 }, (_, i) => `M${(i * 37) % 560} ${GROUND + 30 + (i * 53) % 300} l12 0`).join(' '), SP * 0.4);

  // the swimming school: follows a gentle wave path left to right along the wall
  const school = G(L.ink);
  const COL = ['#e76f51', '#2a9d8f', '#e9b949', '#3f7cc0', '#e85d75', '#2a9d8f', '#e76f51'];
  const fish = COL.map((c, i) => ({ draw: fishShape(school, c, 1.5), lag: i * 0.32, dy: (i % 3) * 14 - 14 }));

  const pg = G(L.ink);
  const kid = new Person(pg, 'kid', -40, GROUND + 70, 1, 0.9, { speedMul: 0.85 });
  const people = [
    kid,
    new Person(pg, 'coat', 600, GROUND + 120, -1, 0.95, { shirt: '#c96f5b' }),
    new Person(pg, 'tourist', 130, GROUND + 160, 1, 1.0, { stopAt: 260, action: 'photo', actionFor: 2.4, shirt: '#a8d5ba' }),
  ];
  const birds = gulls(L.ink, 3, -20, W + 20, 80, 220, 1);

  const dur = 6.0;
  return {
    root: L.root, dur, tau: [0.52, 0.64],
    title: { han: '魚 路', name: '물고기 골목' },
    caps: [
      { at: 0.5, lines: ['벽에 그려진 물고기를', '따라 걸어 보세요'] },
      { at: 3.1, lines: ['물고기가 향하는 쪽이', '마을의 다음 골목이에요'] },
    ],
    update(t, dt, Pl) {
      paintSky(Pl); tintAll(L.ink, Pl); stepWins(wins, Pl, dt);
      const u = easeInOut(t / dur);
      L.cam.setAttribute('transform', `translate(270 480) scale(${f(lerp(1.08, 1.0, u))}) translate(${f(-270 - lerp(-30, 30, u))} -480)`);
      clouds.setAttribute('transform', `translate(${f(t * 4)} 0)`);
      fish.forEach((fi) => {
        const s = t - fi.lag, fx = -40 + s * 95;
        const fy = 580 + fi.dy + Math.sin(s * 2.4) * 10;
        fi.draw(fx, fy, Math.cos(s * 2.4) * -18, t + fi.lag);
      });
      people.forEach((p) => p.draw(t, dt, Pl));
      birds(t);
    },
  };
}
