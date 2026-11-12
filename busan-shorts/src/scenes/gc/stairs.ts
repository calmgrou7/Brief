// 감천 02 · 계단 골목 — a steep stair alley between painted walls, flower pots on the
// steps, a cat sitting halfway up, a resident sweeping at the top landing, a visitor
// stopping to photograph the cat.
import { f } from '../../../lib/ink.ts';
import { W, SP, P, S, C, G, brect, oval, srnd, reseed, sky, win, stepWins, tintAll, lerp, easeInOut, type Win } from '../../kit.ts';
import { layers, type Scene } from '../../scene.ts';
import { Person } from '../../people.ts';
import { cat, laundry } from '../../props.ts';
import { PASTEL } from './village.ts';

export function gcStairs(svg: SVGSVGElement, filter: string): Scene {
  reseed(88);
  const L = layers(svg, filter);
  const paintSky = sky(svg, L.back, 'sky-gs', -60, -200, W + 60, 1200);
  const wins: Win[] = [];

  // a sliver of sky and far roofs at the top of the stairs
  const far = G(L.ink, { opacity: 0.5 });
  for (let x = 120; x < 420; x += 34) S(far, brect(x, 250 - (x % 3) * 10, x + 30, 330, 0.4), SP * 0.7);

  // the stairs: a wide flight rising from the bottom to a landing at y 380
  const st = G(L.ink);
  const sx0 = 150, sx1 = 390, top = 380, bot = 1000;
  S(st, `M${sx0 - 40} ${bot} L${sx0} ${top} L${sx1} ${top} L${sx1 + 40} ${bot}Z`, SP);
  const steps: string[] = [];
  for (let k = 0; k <= 40; k++) {
    const u = k / 40, y = lerp(top, bot, Math.pow(u, 1.25));
    const xa = lerp(sx0, sx0 - 40, u), xb = lerp(sx1, sx1 + 40, u);
    steps.push(`M${f(xa)} ${f(y)} Q${f((xa + xb) / 2)} ${f(y + 0.6)} ${f(xb)} ${f(y)}`);
  }
  P(st, steps.join(' '), SP * 0.5);
  // handrail down the middle
  P(st, `M270 ${top - 14} L270 ${bot} M262 ${top - 14} Q270 ${top - 18} 278 ${top - 14}`, SP * 0.8);
  P(st, Array.from({ length: 12 }, (_, i) => `M270 ${top + i * 52} l0 14`).join(' '), SP * 0.5);

  // painted walls on both sides, with windows, doors and pots
  const wall = (x0: number, x1: number, y0: number, y1: number, col: string) => {
    C(L.ink, brect(x0, y0, x1, y1, 0.8), col);
    const ww = Math.abs(x1 - x0);
    for (let y = y0 + 26; y < y1 - 50; y += 74) {
      const wx = Math.min(x0, x1) + ww / 2 - 14;
      wins.push(win(L.ink, brect(wx, y, wx + 28, y + 30, 0.4), srnd(0.15, 0.5)));
      P(L.ink, `M${wx + 14} ${y} L${wx + 14} ${y + 30} M${wx} ${y + 15} L${wx + 28} ${y + 15}`, SP * 0.45);
    }
  };
  wall(-20, 110, 300, 560, PASTEL[0]); wall(-20, 116, 560, 820, PASTEL[2]); wall(-20, 112, 820, 1100, PASTEL[3]);
  wall(430, 560, 280, 540, PASTEL[1]); wall(424, 560, 540, 800, PASTEL[4]); wall(428, 560, 800, 1100, PASTEL[5]);
  // flower pots along the edges of the steps
  const pots = G(L.ink);
  for (const [x, y] of [[134, 520], [120, 700], [108, 880], [400, 600], [414, 760], [424, 940]] as const) {
    C(pots, `M${x - 7} ${y} L${x - 5} ${y + 12} L${x + 5} ${y + 12} L${x + 7} ${y}Z`, '#c9663f', SP * 0.7);
    P(pots, `M${x} ${y} q-6 -10 -2 -18 M${x} ${y} q5 -12 9 -12 M${x} ${y} q1 -8 3 -20`, SP * 0.6);
    for (const [dx, dy] of [[-2, -18], [9, -12], [3, -20]]) C(pots, oval(x + dx, y + dy, 2.2, 2.2), '#e85d75', SP * 0.4);
  }
  // laundry strung across the alley above the landing
  const wash = laundry(L.ink, 110, 300, 430, 288, ['#ffffff', '#9fb8e8', '#f2b8b5', '#f5d76e', '#ffffff']);

  const kitty = cat(L.ink, 214, 640, 2.6, '#e2a25a');
  const pg = G(L.ink);
  const people = [
    new Person(pg, 'ajumma', 330, top, -1, 0.62, { stand: true, action: 'wave', shirt: '#9fb8e8', extra: '#e9b949' }),
    new Person(pg, 'tourist', 560, 880, -1, 0.9, { stopAt: 330, action: 'photo', actionFor: 9, shirt: '#e8d9b5' }),
  ];

  const dur = 5.8;
  return {
    root: L.root, dur, tau: [0.43, 0.52],
    title: { han: '階 段 路', name: '계단 골목' },
    caps: [
      { at: 0.5, lines: ['골목은 전부 계단,', '계단마다 화분이 놓여요'] },
      { at: 3.0, lines: ['고양이도 사람도', '천천히 쉬어 가는 길'] },
    ],
    update(t, dt, Pl) {
      paintSky(Pl); tintAll(L.ink, Pl); stepWins(wins, Pl, dt);
      const u = easeInOut(t / dur);
      L.cam.setAttribute('transform', `translate(270 480) scale(${f(lerp(1.0, 1.12, u))}) translate(-270 ${f(-480 - lerp(60, -20, u))})`);
      wash(t, dt, 0.4 + Math.sin(t * 0.8) * 0.3);
      kitty.draw(t, dt);
      people.forEach((p) => p.draw(t, dt, Pl));
    },
  };
}
