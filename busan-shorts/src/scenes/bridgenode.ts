// BridgeNode ending card: two nodes pop in, a suspension-bridge line draws itself between
// them, a third node lights at the crown, then the wordmark. Reusable at the end of any episode.
import { el, f } from '../../lib/ink.ts';
import { W, G, lerp, ease, clamp } from '../kit.ts';
import { layers, type Scene } from '../scene.ts';
import { solidBg, pop } from './nowro/kit.ts';

export const BN = { bg: '#0e1117', ink: '#f4f6fb', accent: '#7c9cff', soft: '#9aa3b5' };

export function bridgeNodeEnding(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  solidBg(L.back, BN.bg);
  const cx = 270, y = 470, half = 150;          // nodes at (120, 470) and (420, 470)
  const crown = y - 92;
  const g = G(L.back);
  // the deck and the cable (drawn progressively with dash offsets)
  const deck = el('path', { d: `M${cx - half} ${y} L${cx + half} ${y}`, fill: 'none', stroke: BN.ink, 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
  const cableD = `M${cx - half} ${y} Q${cx} ${crown - 92} ${cx + half} ${y}`;
  const cable = el('path', { d: cableD, fill: 'none', stroke: BN.accent, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
  const hangers = Array.from({ length: 9 }, (_, i) => {
    const u = (i + 1) / 10, x = lerp(cx - half, cx + half, u);
    const cy = (1 - u) * (1 - u) * y + 2 * (1 - u) * u * (crown - 92) + u * u * y;   // point on the quadratic
    return { n: el('path', { d: `M${f(x)} ${f(cy)} L${f(x)} ${y}`, fill: 'none', stroke: BN.soft, 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0 }, g), u };
  });
  const glow = el('ellipse', { cx, cy: crown, rx: 60, ry: 60, fill: 'url(#glow-cool)', opacity: 0 }, L.glow);
  const nodes = [[cx - half, y], [cx + half, y], [cx, crown]].map(([x, yy]) => {
    const n = G(g);
    el('circle', { cx: 0, cy: 0, r: 15, fill: BN.bg, stroke: BN.ink, 'stroke-width': 3.5 }, n);
    el('circle', { cx: 0, cy: 0, r: 6, fill: BN.accent }, n);
    return { n, x, y: yy };
  });
  const word = el('text', { x: cx, y: 600, 'font-size': 64, 'font-weight': 900, 'font-family': 'Noto Sans KR', 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: BN.ink, 'letter-spacing': -1 }, g);
  const tB = el('tspan', {}, word); tB.textContent = 'Bridge';
  const tN = el('tspan', { fill: BN.accent }, word); tN.textContent = 'Node';
  const kr = el('text', { x: cx, y: 660, 'font-size': 24, 'font-weight': 700, 'font-family': 'Noto Sans KR', 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: BN.soft, 'letter-spacing': 10 }, g);
  kr.textContent = '브릿지노드';
  const len = 420, dlen = 2 * half;
  void W;
  return {
    root: L.root, dur: 3.4, tau: [0.92, 0.92], title: { han: '', name: '' }, caps: [], noChip: true,
    update(t) {
      L.root.style.color = BN.ink; L.root.style.setProperty('--paper', BN.bg);
      [0, 1].forEach((i) => { const k = Math.max(0, pop((t - 0.15 - i * 0.2) / 0.35)); nodes[i].n.setAttribute('transform', `translate(${nodes[i].x} ${nodes[i].y}) scale(${f(k)})`); });
      const d = ease(clamp((t - 0.5) / 0.8, 0, 1));
      deck.setAttribute('stroke-dasharray', `${f(dlen * d)} ${dlen}`);
      cable.setAttribute('stroke-dasharray', `${f(len * d)} ${len}`);
      hangers.forEach((h) => h.n.setAttribute('opacity', f(clamp((d - h.u) * 6, 0, 1))));
      const ck = Math.max(0, pop((t - 1.3) / 0.35));
      nodes[2].n.setAttribute('transform', `translate(${nodes[2].x} ${nodes[2].y}) scale(${f(ck)})`);
      glow.setAttribute('opacity', f(ease((t - 1.3) / 0.3) * (0.7 + 0.3 * Math.sin(t * 3))));
      const wk = ease((t - 1.55) / 0.45);
      word.setAttribute('opacity', f(wk)); word.setAttribute('transform', `translate(0 ${f((1 - wk) * 18)})`);
      kr.setAttribute('opacity', f(ease((t - 1.85) / 0.45)));
    },
  };
}
