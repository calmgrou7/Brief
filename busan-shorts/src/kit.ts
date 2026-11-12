// Shared drawing helpers for the Busan scenes (built on lib/ink.ts).
import { el, pen, shape, blot, paint, f, PAPER } from '../lib/ink.ts';
import { toRGB, rgb, mix, type Palette } from '../lib/daynight.ts';

declare global { interface Element { setAttribute(qualifiedName: string, value: string | number): void } }

/** Stage is 540 x 960 units (rendered at 1080 x 1920). */
export const W = 540, H = 960;
export const SP = 0.85;      // scene pen
export const FS = 0.5;       // figure scale

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (e0: number, e1: number, x: number) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
export const ease = (t: number) => smooth(0, 1, t);
export const easeInOut = (t: number) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

let seed = 7;
export const reseed = (s: number) => { seed = s; };
export const srnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + ((seed - 1) / 2147483646) * (b - a); };
/** Deterministic per-run randomness for motion (keeps renders reproducible). */
let mseed = 3;
export const mrnd = (a = 0, b = 1) => { mseed = (mseed * 48271) % 2147483647; return a + ((mseed - 1) / 2147483646) * (b - a); };

export const P = (g: Element, d: string, w = SP) => { const n = pen(g, w); n.setAttribute('d', d); return n; };
export const S = (g: Element, d: string, w = SP) => { const n = shape(g, w); n.setAttribute('d', d); return n; };
export const B = (g: Element, d: string) => { const n = blot(g); n.setAttribute('d', d); return n; };
export const C = (g: Element, d: string, colour: string, w = SP) => { const n = paint(g, colour, w); n.setAttribute('d', d); n.dataset.base = colour; return n; };
export const G = (parent: Element, attrs: Record<string, string | number> = {}) => el('g', attrs, parent);
export const rect = (x0: number, y0: number, x1: number, y1: number) => `M${f(x0)} ${f(y0)} L${f(x1)} ${f(y0)} L${f(x1)} ${f(y1)} L${f(x0)} ${f(y1)}Z`;
/** Slightly bowed rectangle: nothing in this style is ruler-straight. */
export const brect = (x0: number, y0: number, x1: number, y1: number, b = 0.6) =>
  `M${f(x0)} ${f(y0)} Q${f((x0 + x1) / 2)} ${f(y0 - b)} ${f(x1)} ${f(y0)} Q${f(x1 + b * 0.5)} ${f((y0 + y1) / 2)} ${f(x1)} ${f(y1)} Q${f((x0 + x1) / 2)} ${f(y1 + b * 0.4)} ${f(x0)} ${f(y1)} Q${f(x0 - b * 0.5)} ${f((y0 + y1) / 2)} ${f(x0)} ${f(y0)}Z`;
export const oval = (cx: number, cy: number, rx: number, ry: number) => `M${f(cx - rx)} ${f(cy)} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
/** A hand-drawn line: a gentle bow between two points. */
export const line = (x0: number, y0: number, x1: number, y1: number, bow = 0.5) =>
  `M${f(x0)} ${f(y0)} Q${f((x0 + x1) / 2 + bow * 0.3)} ${f((y0 + y1) / 2 + bow)} ${f(x1)} ${f(y1)}`;

export const WARM = toRGB('#ffcf7e'), WARM_DEEP = toRGB('#f3a54d');
export { rgb, mix, toRGB, PAPER, el, f };

/** Re-tint every flat-colour fill in a group toward night. */
export function tintAll(g: Element, Pl: Palette, amount = 0.55) {
  g.querySelectorAll<SVGPathElement>('[data-base]').forEach((n) => {
    const c = toRGB(n.dataset.base!);
    n.setAttribute('fill', rgb(mix(c, mix(c, [14, 18, 34], 0.62), Pl.inkT * amount)));
  });
}

/** Radial glow gradient (for the screen-blended light layer). */
export function glowDefs(svg: SVGSVGElement) {
  const defs = svg.querySelector('defs')!;
  const mk = (id: string, stops: Array<[number, string, number]>) => {
    const r = el('radialGradient', { id }, defs);
    for (const [o, c, a] of stops) el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, r);
  };
  mk('glow-warm', [[0, '#ffd28a', 0.95], [0.35, '#f6a04a', 0.38], [1, '#f6a04a', 0]]);
  mk('glow-cool', [[0, '#cfe4ff', 0.9], [0.4, '#7fb0ff', 0.3], [1, '#7fb0ff', 0]]);
  mk('glow-white', [[0, '#ffffff', 0.9], [0.4, '#fff3d8', 0.3], [1, '#fff3d8', 0]]);
}

export interface Light { n: SVGEllipseElement; on: number; off: number; k: number }
/** A glow blob that switches on at its own lamp threshold. */
export function light(glow: Element, cx: number, cy: number, r: number, on: number, grad = 'glow-warm', ry = r): Light {
  const n = el('ellipse', { cx, cy, rx: r, ry, fill: `url(#${grad})`, opacity: 0 }, glow);
  return { n, on, off: 2, k: 0 };
}
export function stepLights(ls: Light[], lamp: number, dt: number, flicker = 0) {
  for (const L of ls) {
    const want = lamp > L.on && lamp < L.off ? 1 : 0;
    L.k += (want - L.k) * Math.min(1, dt * 3.2);
    L.n.setAttribute('opacity', f(L.k * (1 - flicker * mrnd())));
  }
}

/** Windows: a pane whose paper fill warms when it lights up. */
export interface Win { n: SVGPathElement; on: number; k: number; warm: number[] }
export function win(g: Element, d: string, on: number, w = SP * 0.8): Win {
  const n = el('path', { d, fill: PAPER, stroke: 'currentColor', 'stroke-width': w, 'stroke-linejoin': 'round' }, g);
  return { n, on, k: 0, warm: srnd() < 0.5 ? WARM : WARM_DEEP };
}
export function stepWins(ws: Win[], Pl: Palette, dt: number) {
  for (const w of ws) {
    w.k += ((Pl.lamp > w.on ? 1 : 0) - w.k) * Math.min(1, dt * 2.5);
    w.n.setAttribute('fill', rgb(mix(Pl.paper, w.warm as any, w.k * 0.92)));
  }
}

/** Sky rect with its own gradient, recoloured per frame. */
export function sky(svg: SVGSVGElement, g: Element, id: string, x0: number, y0: number, x1: number, y1: number) {
  const defs = svg.querySelector('defs')!;
  const lg = el('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  const a = el('stop', { offset: 0 }, lg), b = el('stop', { offset: 1 }, lg);
  el('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, fill: `url(#${id})` }, g);
  return (Pl: Palette) => { a.setAttribute('stop-color', rgb(Pl.top)); b.setAttribute('stop-color', rgb(Pl.bottom)); };
}

/** Twinkling stars, visible with P.night. */
export function stars(g: Element, n: number, x0: number, y0: number, x1: number, y1: number) {
  const s: Array<{ n: SVGCircleElement; ph: number; sp: number }> = [];
  for (let i = 0; i < n; i++) s.push({ n: el('circle', { cx: srnd(x0, x1), cy: srnd(y0, y1), r: srnd(0.5, 1.2), fill: '#fff6dc', opacity: 0 }, g), ph: srnd(0, 6), sp: srnd(1, 3) });
  return (t: number, Pl: Palette) => s.forEach((q) => q.n.setAttribute('opacity', f(Pl.night * (0.55 + 0.45 * Math.sin(t * q.sp + q.ph)))));
}
