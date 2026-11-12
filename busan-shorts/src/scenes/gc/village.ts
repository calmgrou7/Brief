// The Gamcheon hillside seen from across the valley: small pastel boxes stepping up the
// slope, each sitting a little higher or lower than its neighbour, stair lanes zigzagging
// between them, blue water tanks, street lamps on the stairs. Shared by the morning view
// and the night scene so the village is the same place at both ends of the day.
import { el, f } from '../../../lib/ink.ts';
import { W, SP, P, S, B, C, G, brect, oval, srnd, reseed, win, light, type Win, type Light } from '../../kit.ts';

export const PASTEL = ['#8fc1d4', '#f2b8b5', '#f5d76e', '#a8d5ba', '#c9b3e0', '#f4b183', '#9fb8e8', '#f7e3a1', '#e8a0b8', '#b5d99c'];

/** Top edge of the hill (y) at x. */
export const hillTop = (x: number) => 300 + 70 * Math.cos((x - 190) / 170) * -1 + (x > 380 ? (x - 380) * 0.5 : 0);

export function hillVillage(ink: Element, glow: Element, seed = 5) {
  reseed(seed);
  const wins: Win[] = [];
  const lamps: Light[] = [];
  // hill and the mountain behind
  S(ink, `M-40 260 Q60 150 170 170 Q230 120 300 150 Q380 110 470 170 Q520 200 580 190 L580 1200 L-40 1200Z`, SP * 0.9);
  P(ink, 'M300 150 L300 112 M294 122 L306 122 M296 132 L304 132', SP * 0.6);           // a radio mast on the ridge
  const trees: string[] = [];
  for (let x = -20; x < 560; x += 16) { const y = hillTop(x) - 18 + srnd(-4, 4); trees.push(`M${f(x - 7)} ${f(y + 6)} Q${f(x)} ${f(y - 6)} ${f(x + 7)} ${f(y + 6)}`); }
  P(ink, trees.join(' '), SP * 0.55);
  S(ink, `M-40 ${f(hillTop(-40))} ` + Array.from({ length: 33 }, (_, i) => { const x = -40 + i * 20; return `L${x} ${f(hillTop(x))}`; }).join(' ') + ' L580 1200 L-40 1200Z', SP);

  // stair lanes: zigzags from the bottom of the hill to the top
  const lanes = [118, 318, 470];
  const laneD: string[] = [], stepD: string[] = [];
  lanes.forEach((lx) => {
    let x = lx, y = 1100;
    while (y > hillTop(x) + 30) {
      const nx = x + srnd(-26, 26), ny = y - 60;
      laneD.push(`M${f(x - 6)} ${f(y)} L${f(nx - 6)} ${f(ny)} M${f(x + 6)} ${f(y)} L${f(nx + 6)} ${f(ny)}`);
      for (let k = 1; k < 10; k++) { const u = k / 10, sx = x + (nx - x) * u, sy = y + (ny - y) * u; stepD.push(`M${f(sx - 6)} ${f(sy)} l12 0`); }
      if (srnd() < 0.7) {
        P(ink, `M${f(nx + 9)} ${f(ny)} l0 -18 q0 -3 3 -3`, SP * 0.6);
        S(ink, oval(nx + 13, ny - 20, 1.8, 1.5), SP * 0.5);
        lamps.push(light(glow, nx + 13, ny - 20, 14, 0.2 + srnd(0, 0.35)));
      }
      x = nx; y = ny;
    }
  });

  // houses, back to front: rows every 34 units, each house jittered up/down
  for (let base = 330; base < 1130; base += 39) {
    const g = G(ink);
    let x = -20 + srnd(-14, 0);
    while (x < W + 20) {
      const w = srnd(22, 40), h = srnd(26, 42);
      const b = base + srnd(-7, 7);
      if (lanes.some((lx) => Math.abs(x + w / 2 - lx) < w / 2 + 6) && srnd() < 0.8) { x += 14; continue; }
      if (b - h < hillTop(x + w / 2) + 6) { x += w; continue; }
      if (srnd() < 0.18) { x += w * 0.8; continue; }   // gaps: a bit of hillside shows between houses
      const col = PASTEL[Math.floor(srnd(0, PASTEL.length))];
      C(g, brect(x, b - h, x + w, b, 0.5), col, SP * 0.85);
      P(g, `M${f(x - 1)} ${f(b - h + 2.4)} L${f(x + w + 1)} ${f(b - h + 2.4)}`, SP * 0.5);
      const nw = w > 30 ? 2 : 1;
      for (let k = 0; k < nw; k++) {
        const wx = x + (w / (nw + 1)) * (k + 1) - 3.5, wy = b - h + srnd(7, 11);
        wins.push(win(g, brect(wx, wy, wx + 7, wy + 7.5, 0.2), srnd(0.15, 0.62), SP * 0.55));
      }
      if (srnd() < 0.4) {
        const tx = x + srnd(3, w - 11);
        C(g, `M${f(tx)} ${f(b - h)} L${f(tx)} ${f(b - h - 8)} Q${f(tx + 4)} ${f(b - h - 10)} ${f(tx + 8)} ${f(b - h - 8)} L${f(tx + 8)} ${f(b - h)}Z`, '#3f7cc0', SP * 0.6);
      } else if (srnd() < 0.25) {
        const hx = x + srnd(2, w - 12);
        C(g, brect(hx, b - h - 9, hx + 10, b - h, 0.2), PASTEL[Math.floor(srnd(0, PASTEL.length))], SP * 0.6);
      }
      if (srnd() < 0.3) { const dx = x + srnd(3, w - 9); S(g, brect(dx, b - 13, dx + 6.5, b, 0.2), SP * 0.55); B(g, oval(dx + 5, b - 6.5, 0.6, 0.6)); }
      x += w + srnd(-3, 2);
    }
  }
  // the stair lanes over the houses, so the paths read
  P(ink, laneD.join(' '), SP * 0.75);
  P(ink, stepD.join(' '), SP * 0.4);
  void el;
  return { wins, lamps };
}
