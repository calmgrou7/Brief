// Shared harbour things: drifting water strokes, light reflections, gulls, little boats.
import { el, f } from '../lib/ink.ts';
import type { Palette } from '../lib/daynight.ts';
import { P, S, C, G, SP, srnd, mrnd, clamp } from './kit.ts';

/** Short horizontal strokes that drift and breathe on the water. */
export function water(g: Element, x0: number, x1: number, y0: number, y1: number, n = 40) {
  const node = P(g, '', SP * 0.55);
  const s = Array.from({ length: n }, () => ({ x: srnd(x0, x1), y: srnd(y0, y1), l: srnd(8, 26), sp: srnd(2, 7), ph: srnd(0, 6) }));
  return (t: number, wind = 0.3) => {
    node.setAttribute('d', s.map((q) => {
      const k = (q.y - y0) / (y1 - y0);                         // nearer = longer, faster
      let x = q.x + t * q.sp * (0.6 + wind) * (0.5 + k);
      x = x0 + ((((x - x0) % (x1 - x0)) + (x1 - x0)) % (x1 - x0));
      const l = q.l * (0.7 + 0.3 * Math.sin(t * 1.3 + q.ph)) * (0.6 + k * 0.8);
      return `M${f(x)} ${f(q.y)} q${f(l / 2)} ${f(-0.6)} ${f(l)} 0`;
    }).join(' '));
  };
}

/** Warm (or coloured) jittered strokes on the water under a light. */
export function reflection(glow: Element, x: number, y0: number, len: number, colour = '#ffcf7e', width = 10) {
  const n = el('path', { fill: 'none', stroke: colour, 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0 }, glow);
  const rows = Math.max(3, Math.round(len / 7));
  return (t: number, k: number) => {
    const d: string[] = [];
    for (let i = 0; i < rows; i++) {
      const y = y0 + i * (len / rows), w = width * (1 - i / rows * 0.5) * (0.6 + 0.4 * Math.sin(t * 3 + i * 1.7 + x));
      const dx = Math.sin(t * 2.2 + i * 2.1) * 2;
      d.push(`M${f(x - w / 2 + dx)} ${f(y)} L${f(x + w / 2 + dx)} ${f(y)}`);
    }
    n.setAttribute('d', d.join(' '));
    n.setAttribute('opacity', f(clamp(k, 0, 1) * 0.9));
  };
}

/** A gull: body, flapping wings on a gliding path. */
export function gulls(g: Element, n: number, x0: number, x1: number, y0: number, y1: number, size = 1) {
  const birds = Array.from({ length: n }, () => ({
    node: P(g, '', SP * 0.8), x: srnd(x0, x1), y: srnd(y0, y1), sp: srnd(14, 26) * (srnd() < 0.5 ? -1 : 1), ph: srnd(0, 6), fr: srnd(5, 7.5), s: srnd(0.8, 1.25) * size,
  }));
  return (t: number) => birds.forEach((b) => {
    const span = x1 - x0 + 80;
    const x = x0 - 40 + ((((b.x - x0 + t * b.sp) % span) + span) % span);
    const y = b.y + Math.sin(t * 0.7 + b.ph) * 10;
    // flap a few beats, then glide
    const beat = Math.sin(t * b.fr + b.ph), glide = Math.sin(t * 0.9 + b.ph) > 0.3;
    const w = (glide ? 1.2 : beat * 4.5) * b.s, s = b.s;
    b.node.setAttribute('d', `M${f(x - 9 * s)} ${f(y - w)} Q${f(x - 4.5 * s)} ${f(y - 3 * s - w * 0.4)} ${f(x)} ${f(y)} Q${f(x + 4.5 * s)} ${f(y - 3 * s - w * 0.4)} ${f(x + 9 * s)} ${f(y - w)}`);
  });
}

/** A small fishing boat that bobs; returns a draw fn and the lantern position. */
export function boat(g: Element, x: number, y: number, s: number, hull: string, flag = '#d23b2f') {
  const b = G(g);
  C(b, `M-30 0 Q-28 9 -20 12 L24 12 Q32 6 36 -4 L-30 0Z`, hull, SP);
  P(b, 'M-28 4 L34 1', SP * 0.5);
  S(b, 'M-14 0 L-14 -14 L6 -14 L8 0Z', SP * 0.9);
  P(b, 'M-10 -10 l5 0 l0 5 l-5 0Z M0 -10 l4 0 l0 5 l-4 0Z', SP * 0.5);
  P(b, 'M-2 -14 L-2 -32 M-2 -32 L20 0 M-2 -32 L-24 -2', SP * 0.7);
  const fl = C(b, '', flag, SP * 0.6);
  const ph = mrnd(0, 6);
  return {
    g: b,
    draw(t: number, wind = 0.3) {
      const bob = Math.sin(t * 1.6 + ph) * 1.6, roll = Math.sin(t * 1.1 + ph) * 2.4;
      b.setAttribute('transform', `translate(${f(x)} ${f(y + bob)}) rotate(${f(roll)}) scale(${s})`);
      const fw = Math.sin(t * 6 + ph) * 1.5;
      fl.setAttribute('d', `M-2 -32 Q${f(4 + wind * 2)} ${f(-31 + fw)} ${f(9 + wind * 3)} ${f(-29 + fw)} L-2 -25Z`);
    },
  };
}

export type { Palette };
