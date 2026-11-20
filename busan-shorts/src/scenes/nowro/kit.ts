// Shared parts for the 나우로 부산 ad: a line-art phone that shows real app screenshots,
// tap ripples, the brand background, a Gwangan bridge backdrop and pop easing.
import { el, f, PAPER } from '../../../lib/ink.ts';
import { W, SP, P, S, G, brect, clamp, lerp } from '../../kit.ts';

export const LIME = '#d4f53c', BLACK = '#0b0f14';
export const SHOT_RATIO = 2096 / 1272;

/** back-out easing for pops (overshoots then settles) */
export const pop = (t: number) => { t = clamp(t, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

let clipN = 0;
/** A line-art phone. The screen holds stacked screenshots you can fade, zoom and pan. */
export function phone(ink: Element, crisp: Element, cx: number, cy: number, sw = 270) {
  const sh = sw * SHOT_RATIO, bw = sw + 18, bh = sh + 40;
  const body = G(ink);
  const rr = (x0: number, y0: number, x1: number, y1: number, r: number) => `M${x0 + r} ${y0} L${x1 - r} ${y0} Q${x1} ${y0} ${x1} ${y0 + r} L${x1} ${y1 - r} Q${x1} ${y1} ${x1 - r} ${y1} L${x0 + r} ${y1} Q${x0} ${y1} ${x0} ${y1 - r} L${x0} ${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0}Z`;
  S(body, rr(-bw / 2, -bh / 2, bw / 2, bh / 2, 34), SP * 1.4);
  P(body, `M${-bw / 2 - 1.5} ${-bh / 2 + 110} l0 40 M${bw / 2 + 1.5} ${-bh / 2 + 90} l0 26 M${bw / 2 + 1.5} ${-bh / 2 + 126} l0 26`, SP * 1.6);
  const id = `scr${clipN++}`;
  const defs = ink.closest('svg')!.querySelector('defs')!;
  const cp = el('clipPath', { id }, defs);
  el('path', { d: rr(-sw / 2, -sh / 2, sw / 2, sh / 2, 22) }, cp);
  const screenG = G(crisp, { 'clip-path': `url(#${id})` });
  el('rect', { x: -sw / 2, y: -sh / 2, width: sw, height: sh, fill: '#ffffff' }, screenG);
  const content = G(screenG);
  const overlay = G(crisp);                       // taps etc. drawn above the screen, unclipped
  const notch = el('path', { d: rr(-34, -sh / 2 + 6, 34, -sh / 2 + 18, 6), fill: '#111' }, crisp);
  const imgs: Record<string, SVGImageElement> = {};
  const add = (key: string, href: string) => {
    imgs[key] = el('image', { href, x: -sw / 2, y: -sh / 2, width: sw, height: sh, preserveAspectRatio: 'xMidYMid slice', opacity: 0 }, content);
    return imgs[key];
  };
  return {
    sw, sh, body, content, overlay, imgs, add,
    /** place the whole phone; s scales it */
    at(x: number, y: number, s = 1, rot = 0) {
      const tr = `translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})`;
      body.setAttribute('transform', tr); screenG.setAttribute('transform', tr); overlay.setAttribute('transform', tr); notch.setAttribute('transform', tr);
    },
    /** zoom the screen content around a point given in 0..1 screen coords */
    zoom(z: number, ux = 0.5, uy = 0.5) {
      const px = -sw / 2 + ux * sw, py = -sh / 2 + uy * sh;
      // keep (ux,uy) under the same spot while scaling, but clamp so no white shows
      const tx = clamp(px - px * z, sw / 2 - z * sw / 2 - 0, -sw / 2 + z * sw / 2) , ty = clamp(py - py * z, sh / 2 - z * sh / 2, -sh / 2 + z * sh / 2);
      content.setAttribute('transform', `translate(${f(z === 1 ? 0 : tx)} ${f(z === 1 ? 0 : ty)}) scale(${f(z)})`);
    },
    /** screen-local point for a 0..1 coordinate under the current zoom */
    pt(ux: number, uy: number, z = 1, zx = 0.5, zy = 0.5): [number, number] {
      const px = -sw / 2 + zx * sw, py = -sh / 2 + zy * sh;
      const tx = z === 1 ? 0 : clamp(px - px * z, sw / 2 - z * sw / 2, -sw / 2 + z * sw / 2);
      const ty = z === 1 ? 0 : clamp(py - py * z, sh / 2 - z * sh / 2, -sh / 2 + z * sh / 2);
      return [tx + z * (-sw / 2 + ux * sw), ty + z * (-sh / 2 + uy * sh)];
    },
    cx, cy,
  };
}

/** A tap: a filled dot that presses, then a ring that spreads out. */
export function tap(parent: Element, colour = LIME) {
  const ring = el('circle', { r: 0, fill: 'none', stroke: colour, 'stroke-width': 3, opacity: 0 }, parent);
  const dot = el('circle', { r: 0, fill: colour, opacity: 0, stroke: BLACK, 'stroke-width': 1.2 }, parent);
  return (x: number, y: number, s: number) => {   // s = seconds since the tap (negative = not yet)
    if (s < -0.25 || s > 0.9) { ring.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); return; }
    const k = clamp((s + 0.25) / 0.25, 0, 1);
    dot.setAttribute('cx', f(x)); dot.setAttribute('cy', f(y)); ring.setAttribute('cx', f(x)); ring.setAttribute('cy', f(y));
    dot.setAttribute('r', f(s < 0 ? 12 * k : lerp(12, 9, Math.min(1, s / 0.1)))); dot.setAttribute('opacity', f(s < 0.5 ? 0.85 : 0.85 * (1 - (s - 0.5) / 0.4)));
    ring.setAttribute('r', f(s < 0 ? 0 : 10 + s * 60)); ring.setAttribute('opacity', f(s < 0 ? 0 : Math.max(0, 1 - s / 0.8)));
  };
}

/** Gwangan bridge in line art, spanning the stage at deck height `deck`. Returns cable LED positions. */
export function bridge(g: Element, deck: number, top: number, t1 = 150, t2 = 390) {
  const cable = (x: number) => {
    if (x < t1) return lerp(deck - 4, top, Math.pow(Math.max(0, x + 60) / (t1 + 60), 1.6));
    if (x > t2) return lerp(top, deck - 4, Math.pow((x - t2) / (W + 60 - t2), 0.62));
    const u = (x - t1) / (t2 - t1); return top + (deck - 30 - top) * 4 * u * (1 - u);
  };
  const c: string[] = [];
  for (let x = -60; x <= W + 60; x += 6) c.push(`${x === -60 ? 'M' : 'L'}${x} ${f(cable(x))}`);
  P(g, c.join(' '), SP);
  const h: string[] = [];
  for (let x = -50; x < W + 60; x += 12) if (Math.abs(x - t1) > 6 && Math.abs(x - t2) > 6) h.push(`M${x} ${f(cable(x))} L${x} ${deck}`);
  P(g, h.join(' '), SP * 0.4);
  const th = deck - top;
  for (const tx of [t1, t2]) {
    S(g, `M${tx - 7} ${deck + th * 0.35} L${tx - 5} ${top - 10} L${tx + 5} ${top - 10} L${tx + 7} ${deck + th * 0.35}Z`, SP);
    P(g, `M${tx - 5} ${top + th * 0.25} L${tx + 5} ${top + th * 0.25} M${tx - 6} ${top + th * 0.7} L${tx + 6} ${top + th * 0.7}`, SP * 0.6);
  }
  S(g, `M-60 ${deck} L${W + 60} ${deck} L${W + 60} ${deck + 7} L-60 ${deck + 7}Z`, SP);
  S(g, `M-60 ${deck + 12} L${W + 60} ${deck + 12} L${W + 60} ${deck + 18} L-60 ${deck + 18}Z`, SP);
  const leds: Array<[number, number]> = [];
  for (let x = -50; x < W + 60; x += 9) leds.push([x, cable(x)]);
  return leds;
}

/** A full-bleed solid background rect (paper-independent). */
export const solidBg = (g: Element, colour: string) => el('rect', { x: -100, y: -200, width: W + 200, height: 1400, fill: colour }, g);

/** A note card with a word on it (paper fill, ink outline, tilted). */
export function note(g: Element, text: string, w: number) {
  const n = G(g);
  S(n, brect(-w / 2, -17, w / 2, 17, 0.8), SP * 1.1);
  el('text', { x: 0, y: 1, 'font-size': 19, 'font-weight': 900, 'font-family': 'Noto Sans KR', 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: 'currentColor' }, n).textContent = text;
  return n;
}
export { PAPER };
