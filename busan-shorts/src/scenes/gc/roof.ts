// 감천 04 · 지붕 위 노을 — close rooftops with big blue water tanks, laundry swaying,
// the Gamcheon port and the sea below as the sun goes down; someone on the viewing
// deck takes a photo.
import { el, f } from '../../../lib/ink.ts';
import { W, SP, P, S, C, G, brect, srnd, reseed, sky, win, stepWins, tintAll, lerp, easeInOut, light, stepLights, type Win, type Light } from '../../kit.ts';
import { layers, type Scene } from '../../scene.ts';
import { Person } from '../../people.ts';
import { laundry } from '../../props.ts';
import { water, reflection, gulls } from '../../sea.ts';
import { PASTEL } from './village.ts';

const SEA = 470;

export function gcRoof(svg: SVGSVGElement, filter: string): Scene {
  reseed(131);
  const L = layers(svg, filter);
  const paintSky = sky(svg, L.back, 'sky-gr', -60, -200, W + 60, 1200);
  const sunGlow = el('ellipse', { cx: 360, cy: 380, rx: 150, ry: 100, fill: 'url(#glow-warm)', opacity: 0 }, L.glow);
  const sun = el('circle', { cx: 360, cy: 380, r: 24, fill: '#ffd6a0', stroke: 'currentColor', 'stroke-width': SP }, L.ink);
  P(L.ink, 'M40 200 L180 200 q8 0 8 -6 q0 -5 -6 -4 M80 212 L230 212 q7 0 7 6', SP * 0.8);

  // the port: far shore, cranes, the sea
  const far = G(L.ink, { opacity: 0.5 });
  P(far, `M-40 ${SEA - 30} Q80 ${SEA - 80} 160 ${SEA - 50} Q240 ${SEA - 90} 320 ${SEA - 56} L320 ${SEA}`, SP * 0.9);
  for (const x of [380, 420, 460]) P(far, `M${x} ${SEA} L${x} ${SEA - 44} L${x + 26} ${SEA - 44} M${x - 10} ${SEA - 36} L${x + 34} ${SEA - 36} M${x + 4} ${SEA} L${x + 4} ${SEA - 36}`, SP * 0.7);
  S(L.ink, `M-60 ${SEA} L${W + 60} ${SEA} L${W + 60} 620 L-60 620Z`, SP);
  const waves = water(L.ink, -20, W + 20, SEA + 6, 600, 40);
  const sunRefl = reflection(L.glow, 360, SEA + 8, 90, '#ffc27a', 40);
  const lights: Light[] = [];
  for (const x of [384, 424, 464]) lights.push(light(L.glow, x + 13, SEA - 44, 12, 0.3 + srnd(0, 0.2)));

  // a band of small houses down the slope toward the port
  const wins: Win[] = [];
  const mid = G(L.ink);
  for (let row = 0; row < 3; row++) {
    let x = -30 + row * 11;
    const base = 620 + row * 40;
    while (x < W + 30) {
      const w = srnd(26, 44), h = srnd(30, 46);
      C(mid, brect(x, base - h, x + w, base, 0.5), PASTEL[Math.floor(srnd(0, PASTEL.length))], SP * 0.8);
      wins.push(win(mid, brect(x + w / 2 - 4, base - h + 9, x + w / 2 + 4, base - h + 18, 0.2), srnd(0.15, 0.5), SP * 0.5));
      x += w + srnd(-2, 3);
    }
  }

  // the close rooftops in front: flat roofs with parapets, big tanks, an antenna, a deck
  const roofs = G(L.ink);
  const tanks: string[] = [];
  const R = [[-30, 150, 760, '#f2b8b5'], [150, 330, 800, '#f5d76e'], [330, 580, 770, '#a8d5ba']] as const;
  for (const [x0, x1, y, col] of R) {
    C(roofs, brect(x0, y, x1, 1100, 0.8), col);
    S(roofs, brect(x0 - 4, y - 10, x1 + 4, y, 0.4), SP * 0.9);
    wins.push(win(roofs, brect(x0 + 30, y + 40, x0 + 62, y + 76, 0.3), srnd(0.2, 0.45)));
    wins.push(win(roofs, brect(x1 - 70, y + 40, x1 - 38, y + 76, 0.3), srnd(0.2, 0.45)));
  }
  for (const [tx, ty, s] of [[40, 760, 1.6], [250, 800, 1.3], [470, 770, 1.8]] as const) {
    C(roofs, `M${tx} ${ty - 10} L${tx} ${ty - 10 - 34 * s} Q${tx + 18 * s} ${ty - 10 - 44 * s} ${tx + 36 * s} ${ty - 10 - 34 * s} L${tx + 36 * s} ${ty - 10}Z`, '#3f7cc0');
    tanks.push(`M${tx} ${ty - 10 - 34 * s} Q${tx + 18 * s} ${ty - 10 - 26 * s} ${tx + 36 * s} ${ty - 10 - 34 * s} M${tx} ${ty - 10 - 18 * s} Q${tx + 18 * s} ${ty - 10 - 12 * s} ${tx + 36 * s} ${ty - 10 - 18 * s}`);
    S(roofs, brect(tx - 3, ty - 12, tx + 36 * s + 3, ty - 9, 0.2), SP * 0.6);
  }
  P(roofs, tanks.join(' '), SP * 0.5);
  P(roofs, 'M120 760 L120 690 M108 700 L132 700 M112 712 L128 712', SP * 0.7);   // tv antenna
  // viewing deck railing on the middle roof
  P(roofs, `M150 772 L330 772 ` + Array.from({ length: 10 }, (_, i) => `M${150 + i * 20} 772 l0 18`).join(' '), SP * 0.6);
  const wash = laundry(L.ink, 340, 700, 520, 712, ['#ffffff', '#e85d75', '#9fb8e8', '#ffffff', '#f5d76e']);
  P(L.ink, 'M340 700 L340 770 M520 712 L520 770', SP * 0.8);

  const pg = G(L.ink);
  const people = [
    new Person(pg, 'coat', 200, 790, 1, 0.85, { stand: true, action: 'photo', shirt: '#8a6f9e' }),
    new Person(pg, 'tourist', 262, 792, 1, 0.85, { stand: true, action: 'wave', shirt: '#e8d9b5' }),
  ];
  const birds = gulls(L.ink, 6, -20, W + 20, 160, 400, 1.1);
  const phoneGlow = el('ellipse', { rx: 14, ry: 14, fill: 'url(#glow-white)', opacity: 0 }, L.glow);

  const dur = 6.0;
  return {
    root: L.root, dur, tau: [0.705, 0.758],
    title: { han: '夕 陽', name: '지붕 위 노을' },
    caps: [
      { at: 0.5, lines: ['해가 감천항으로', '내려앉을 무렵'] },
      { at: 3.0, lines: ['파란 물탱크도', '붉게 물들어요'] },
    ],
    update(t, dt, Pl) {
      paintSky(Pl); tintAll(L.ink, Pl); stepWins(wins, Pl, dt); stepLights(lights, Pl.lamp, dt);
      const u = easeInOut(t / dur);
      L.cam.setAttribute('transform', `translate(270 480) scale(${f(lerp(1.12, 1.0, u))}) translate(-270 ${f(-480 - lerp(-40, 0, u))})`);
      const sy = 380 + t * 10;
      sun.setAttribute('cy', f(sy)); sunGlow.setAttribute('cy', f(sy));
      sun.style.clipPath = `inset(0 0 ${f(Math.max(0, sy + 24 - SEA) / 48 * 100)}% 0)`;
      sunGlow.setAttribute('opacity', f(0.3 + Pl.sunset * 0.7));
      waves(t); sunRefl(t, 0.5 + Pl.sunset * 0.5);
      wash(t, dt, 0.5 + Math.sin(t * 0.9) * 0.4);
      people.forEach((p) => p.draw(t, dt, Pl));
      const ph = people[0].phoneScene();
      phoneGlow.setAttribute('opacity', f(ph ? 0.3 + Pl.lamp * 0.6 : 0));
      if (ph) { phoneGlow.setAttribute('cx', f(ph[0])); phoneGlow.setAttribute('cy', f(ph[1])); }
      birds(t);
    },
  };
}
