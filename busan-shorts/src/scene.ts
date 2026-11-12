import type { Palette } from '../lib/daynight.ts';
import { el } from '../lib/ink.ts';

export interface Scene {
  root: SVGGElement;
  dur: number;
  /** time of day at the scene's start and end (lib/daynight τ) */
  tau: [number, number];
  title: { han: string; name: string };
  caps: Array<{ at: number; lines: string[]; sub?: string }>;
  update(t: number, dt: number, P: Palette, tau: number): void;
}

/** Root group with a camera group (world), and inside it ink + glow layers. */
export function layers(svg: SVGSVGElement, filter: string) {
  const root = el('g', {}, svg);
  const cam = el('g', {}, root);
  const back = el('g', {}, cam);              // sky — no ink filter
  const ink = el('g', { filter }, cam);        // the drawing
  const glow = el('g', { style: 'mix-blend-mode:screen;pointer-events:none' }, cam);
  const front = el('g', { filter }, cam);      // things drawn over the glow (rare)
  return { root, cam, back, ink, glow, front };
}
