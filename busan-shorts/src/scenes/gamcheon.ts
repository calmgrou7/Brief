// 01 감천문화마을 — pastel boxes stacked up a hillside, stairs, water tanks on the roofs,
// the port far below. Early afternoon; windows start to warm near the end.
import type { Palette } from '../../lib/daynight.ts';
import { el, f } from '../../lib/ink.ts';
import { W, SP, FS, P, S, B, C, G, brect, oval, line, srnd, reseed, mrnd, sky, win, stepWins, tintAll, lerp, easeInOut, type Win } from '../kit.ts';
import { layers, type Scene } from '../scene.ts';
import { Person } from '../people.ts';

const PASTEL = ['#8fc1d4', '#f2b8b5', '#f5d76e', '#a8d5ba', '#c9b3e0', '#f4b183', '#9fb8e8', '#f7e3a1'];

export function gamcheon(svg: SVGSVGElement, filter: string): Scene {
  reseed(21);
  const L = layers(svg, filter);
  const paintSky = sky(svg, L.back, 'sky-gc', -40, -200, W + 40, 1200);

  // sun
  const sun = el('circle', { cx: 400, cy: 150, r: 26, fill: '#fff8e6', stroke: 'currentColor', 'stroke-width': SP }, L.ink);
  // clouds: long hand-drawn strokes with curls (they drift)
  const clouds = G(L.ink);
  P(clouds, 'M60 120 L190 120 q8 0 8 -6 q0 -6 -6 -5 M90 132 L230 132 q7 0 7 6 q0 5 -6 4 M120 108 L170 108', SP * 0.8);
  P(clouds, 'M300 210 L420 210 q7 0 7 -5 q0 -5 -5 -4 M330 222 L470 222 q6 0 6 5', SP * 0.8);

  // far port: water line, cranes, a container ship, the far hills — diluted ink
  const far = G(L.ink, { opacity: 0.45 });
  P(far, 'M-20 300 Q60 252 130 276 Q200 240 280 268 Q360 236 450 262 Q510 250 560 270', SP * 0.9);
  P(far, 'M-20 318 L560 318', SP * 0.8);
  for (const x of [70, 120, 170]) P(far, `M${x} 318 L${x} 282 L${x + 22} 282 M${x - 8} 288 L${x + 30} 288 M${x} 300 L${x + 6} 288 M${x + 4} 318 L${x + 4} 288`, SP * 0.7);
  S(far, 'M300 318 L304 306 L390 306 L398 296 L408 296 L410 318Z', SP * 0.7);
  for (let x = 312; x < 392; x += 9) P(far, `M${x} 306 l0 -6 l8 0 l0 6`, SP * 0.5);
  const farWater = P(far, '', SP * 0.5);

  // terraces of houses, back (high) to front (low)
  const wins: Win[] = [];
  const rows = [380, 470, 560, 650, 740, 830, 920, 1010];
  const stairX = 318;
  rows.forEach((base, r) => {
    const g = G(L.ink);
    let x = -14 + srnd(-10, 10);
    while (x < W + 10) {
      const w = srnd(38, 66), h = srnd(46, 74) + (r % 2) * 6;
      if (x + w > stairX - 14 && x < stairX + 26) { x = stairX + 26; continue; }
      const col = PASTEL[Math.floor(srnd(0, PASTEL.length))];
      const top = base - h;
      C(g, brect(x, top, x + w, base, 0.8), col);
      // parapet
      P(g, line(x - 1.5, top + 3, x + w + 1.5, top + 3, -0.3), SP * 0.7);
      // windows / door
      const nw = w > 52 ? 2 : 1;
      for (let k = 0; k < nw; k++) {
        const wx = x + (w / (nw + 1)) * (k + 1) - 6;
        const wy = top + srnd(10, 16);
        wins.push(win(g, brect(wx, wy, wx + 12, wy + 13, 0.4), srnd(0.18, 0.55)));
        P(g, `M${f(wx + 6)} ${f(wy)} L${f(wx + 6)} ${f(wy + 13)} M${f(wx)} ${f(wy + 6.5)} L${f(wx + 12)} ${f(wy + 6.5)}`, SP * 0.45);
      }
      if (srnd() < 0.55) { const dx = x + srnd(6, w - 18); S(g, brect(dx, base - 22, dx + 11, base, 0.3), SP * 0.7); B(g, oval(dx + 9, base - 11, 0.8, 0.8)); }
      // rooftop: blue water tank, or a pot of plants, or a little stair hut
      const roll = srnd();
      if (roll < 0.42) {
        const tx = x + srnd(6, w - 18);
        C(g, `M${f(tx)} ${f(top - 1)} L${f(tx)} ${f(top - 13)} Q${f(tx + 6)} ${f(top - 16)} ${f(tx + 12)} ${f(top - 13)} L${f(tx + 12)} ${f(top - 1)}Z`, '#3f7cc0', SP * 0.75);
        P(g, `M${f(tx)} ${f(top - 13)} Q${f(tx + 6)} ${f(top - 10)} ${f(tx + 12)} ${f(top - 13)} M${f(tx + 0.5)} ${f(top - 7)} Q${f(tx + 6)} ${f(top - 5)} ${f(tx + 11.5)} ${f(top - 7)}`, SP * 0.5);
      } else if (roll < 0.62) {
        const px = x + srnd(6, w - 12);
        S(g, `M${f(px)} ${f(top - 1)} L${f(px - 1)} ${f(top - 7)} L${f(px + 8)} ${f(top - 7)} L${f(px + 7)} ${f(top - 1)}Z`, SP * 0.6);
        P(g, `M${f(px + 3.5)} ${f(top - 7)} q-4 -6 -2 -10 M${f(px + 3.5)} ${f(top - 7)} q3 -7 6 -8 M${f(px + 3.5)} ${f(top - 7)} q0 -5 1 -12`, SP * 0.55);
      } else if (roll < 0.75) {
        const hx = x + srnd(4, w - 20);
        C(g, brect(hx, top - 14, hx + 16, top, 0.3), PASTEL[Math.floor(srnd(0, PASTEL.length))], SP * 0.7);
      }
      x += w + srnd(-2, 3);
    }
    // terrace walkway + railing in front of the row
    S(g, `M-20 ${base} L${W + 20} ${base} L${W + 20} ${base + 8} L-20 ${base + 8}Z`, SP * 0.8);
    const rail: string[] = [`M-20 ${base - 9} Q${W / 2} ${base - 10} ${W + 20} ${base - 9}`];
    for (let rx = -10; rx < W + 20; rx += 14) if (rx < stairX - 6 || rx > stairX + 24) rail.push(`M${rx} ${base - 9} L${rx} ${base}`);
    P(g, rail.join(' '), SP * 0.5);
  });

  // the long stair running up the hill
  const st = G(L.ink);
  S(st, `M${stairX - 8} ${rows[0]} L${stairX + 20} ${rows[0]} L${stairX + 20} 1100 L${stairX - 8} 1100Z`, SP * 0.9);
  const steps: string[] = [];
  for (let y = rows[0] + 6; y < 1100; y += 7) steps.push(`M${stairX - 8} ${y} L${stairX + 20} ${y + 0.4}`);
  P(st, steps.join(' '), SP * 0.45);
  P(st, `M${stairX - 12} ${rows[0] - 10} L${stairX - 12} 1100 M${stairX + 24} ${rows[0] - 10} L${stairX + 24} 1100`, SP * 0.7);

  // fish-shaped wayfinding art along one wall (a little school swimming up the stairs)
  const fish = G(L.ink);
  for (let k = 0; k < 5; k++) {
    const fx = stairX + 34 + k * 9, fy = 780 - k * 12;
    C(fish, `M${fx} ${fy} q5 -4 10 0 q-5 4 -10 0Z M${fx} ${fy} l-4 -3 l0 6Z`, k % 2 ? '#e76f51' : '#2a9d8f', SP * 0.55);
  }

  // birds circling over the roofs
  const birds = Array.from({ length: 5 }, (_, i) => ({ n: P(L.ink, '', SP * 0.8), x: 60 + i * 90, y: 200 + (i % 3) * 30, ph: i * 1.3 }));

  // people on the terraces
  const pg = G(L.ink);
  const people: Person[] = [];
  const add = (row: number, kind: any, x: number, dir: 1 | -1, o = {}) => people.push(new Person(pg, kind, x, rows[row] + 4, dir, FS, o));
  add(6, 'tourist', 40, 1, { stopAt: 190, action: 'photo', actionFor: 2.4 });
  add(4, 'coat', 470, -1, { shirt: '#c96f5b' });
  add(7, 'kid', -10, 1);
  add(2, 'tourist', 520, -1, { shirt: '#a8d5ba', extra: '#c44d3a' });

  const dur = 6.4;
  return {
    root: L.root, dur, tau: [0.585, 0.672],
    title: { han: '甘 川', name: '감천문화마을' },
    caps: [
      { at: 0.5, lines: ['부산의 하루를', '선 하나로 걸어볼게요'] },
      { at: 3.2, lines: ['산비탈 계단마다', '색이 층층이 쌓인 마을'], sub: '사하구 · 감천동' },
    ],
    update(t, dt, Pl: Palette) {
      paintSky(Pl);
      tintAll(L.ink, Pl);
      stepWins(wins, Pl, dt);
      const u = easeInOut(t / dur);
      const z = lerp(1.16, 1.0, u), pan = lerp(150, 60, u);
      L.cam.setAttribute("transform", `translate(270 480) scale(${f(z)}) translate(-270 ${f(-(480 + pan))})`);
      sun.setAttribute('cy', f(150 + t * 4));
      clouds.setAttribute('transform', `translate(${f(t * 3.2)} 0)`);
      farWater.setAttribute('d', [0, 1, 2].map((k) => `M${f(((t * 6 + k * 170) % 560) - 20)} ${326 + k * 4} l26 0`).join(' '));
      birds.forEach((b) => {
        const x = (b.x + t * 18) % 600 - 30, y = b.y + Math.sin(t * 0.8 + b.ph) * 8, fl = Math.sin(t * 9 + b.ph) * 3;
        b.n.setAttribute('d', `M${f(x - 6)} ${f(y - fl)} Q${f(x - 3)} ${f(y - 2)} ${f(x)} ${f(y)} Q${f(x + 3)} ${f(y - 2)} ${f(x + 6)} ${f(y - fl)}`);
      });
      for (const p of people) {
        p.draw(t, dt, Pl);
        if (p.offscreen(0, W)) { p.x = p.dir > 0 ? -30 : W + 30; }
      }
      void mrnd;
    },
  };
}
