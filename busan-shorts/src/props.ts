// Small living props: a cat on the stairs, laundry on a line, fish that swim along a wall.
import { el, f, PAPER } from '../lib/ink.ts';
import { spring, pendulum } from '../lib/motion.ts';
import { P, S, C, G, SP, mrnd, smooth } from './kit.ts';

/** A sitting cat (faceless, open strokes): breathes, flicks its tail, twitches an ear, sometimes looks round. */
export function cat(parent: Element, x: number, y: number, s = 1, coat = '#e2a25a') {
  const g = G(parent);
  const tail = P(g, '', SP * 1.1);
  const body = el('path', { d: 'M-9 0 Q-12 -10 -7 -17 Q-4 -21 1 -20 Q7 -18 8 -9 Q9 -2 7 0Z', fill: PAPER, stroke: 'currentColor', 'stroke-width': SP, 'stroke-linejoin': 'round' }, g);
  body.classList.add('pp');
  const patch = C(g, 'M-7 -15 Q-3 -19 1 -18 Q-1 -12 -6 -10Z', coat, SP * 0.5);
  const head = G(g);
  el('path', { d: 'M-6 -26 Q-6 -32 0 -32 Q6 -32 6 -26 Q6 -21 0 -21 Q-6 -21 -6 -26Z', fill: PAPER, stroke: 'currentColor', 'stroke-width': SP, class: 'pp' }, head);
  const earL = S(head, 'M-5 -29 L-5.5 -35 L-1.5 -31.5Z', SP * 0.8);
  S(head, 'M5 -29 L5.5 -35 L1.5 -31.5Z', SP * 0.8);
  C(head, 'M1.5 -31.5 L5.5 -35 L5 -29Z', coat, SP * 0.6);
  P(g, 'M-3 0 L-3 -6 M3 0 L3 -6', SP * 0.6);
  const tailS = spring(14, 3);
  let nextFlick = mrnd(1, 3), look = 0, lookT = mrnd(2, 4);
  return {
    g,
    draw(t: number, dt: number) {
      nextFlick -= dt; if (nextFlick < 0) { tailS.kick(mrnd(14, 26)); nextFlick = mrnd(1.5, 4); }
      lookT -= dt; if (lookT < 0) { look = look ? 0 : (mrnd() < 0.5 ? -1 : 1); lookT = mrnd(1.8, 3.6); }
      const a = tailS.step(Math.sin(t * 0.7) * 3, dt);
      const tx = 8 + a * 0.3;
      tail.setAttribute('d', `M6 -2 Q16 -1 ${f(16 + a * 0.15)} -8 Q${f(tx + 10)} -16 ${f(tx + 6 + a * 0.2)} -20`);
      const br = 1 + Math.sin(t * 2.2) * 0.012;
      body.setAttribute('transform', `scale(1 ${f(br)})`); patch.setAttribute('transform', `scale(1 ${f(br)})`);
      head.setAttribute('transform', `translate(0 ${f((br - 1) * -20)}) rotate(${f(look * 10 * smooth(0, 1, 1))} 0 -26)`);
      const tw = Math.max(0, Math.sin(t * 5.3) - 0.94) * 40;
      earL.setAttribute('transform', `rotate(${f(-tw)} -5 -29)`);
      g.setAttribute('transform', `translate(${f(x)} ${f(y)}) scale(${s})`);
    },
  };
}

/** A washing line between two points; each item swings on its own pendulum. */
export function laundry(parent: Element, x0: number, y0: number, x1: number, y1: number, cols: string[]) {
  const g = G(parent);
  const rope = P(g, '', SP * 0.6);
  const items = cols.map((c, i) => {
    const u = (i + 1) / (cols.length + 1);
    const n = C(g, '', c, SP * 0.7);
    return { u, n, p: pendulum(9 + i, 1.2), w: 9 + (i % 3) * 3, h: 12 + (i % 2) * 6, shirt: i % 2 === 0 };
  });
  return (t: number, dt: number, wind: number) => {
    const sag = 10;
    rope.setAttribute('d', `M${x0} ${y0} Q${(x0 + x1) / 2} ${(y0 + y1) / 2 + sag * 2} ${x1} ${y1}`);
    items.forEach((it, i) => {
      const x = x0 + (x1 - x0) * it.u, y = y0 + (y1 - y0) * it.u + sag * 4 * it.u * (1 - it.u);
      const a = it.p.step(wind * 1.6 + Math.sin(t * 2.1 + i) * 0.6, dt);
      const w = it.w, h = it.h;
      const d = it.shirt
        ? `M${-w / 2} 0 L${w / 2} 0 L${w / 2 + 3} 4 L${w / 2 - 1} 6 L${w / 2 - 1} ${h} L${-w / 2 + 1} ${h} L${-w / 2 + 1} 6 L${-w / 2 - 3} 4Z`
        : `M${-w / 2} 0 L${w / 2} 0 L${w / 2} ${h} Q0 ${h + 1.5} ${-w / 2} ${h}Z`;
      it.n.setAttribute('d', d);
      it.n.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f(a * 30)})`);
    });
  };
}

/** A small fish (closed paper/colour shape) whose tail wags; place with draw(x, y, angle). */
export function fishShape(parent: Element, colour: string, s = 1) {
  const n = C(parent, '', colour, SP * 0.7);
  const eye = el('circle', { r: 0.9, fill: 'currentColor' }, parent);
  return (x: number, y: number, ang: number, t: number) => {
    const w = Math.sin(t * 10) * 2.4;
    n.setAttribute('d', `M8 0 Q2 -5 -6 -1 L-11 ${f(-4 + w)} L-10 ${f(w * 0.3)} L-11 ${f(4 + w)} L-6 1 Q2 5 8 0Z`);
    n.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f(ang)}) scale(${s})`);
    eye.setAttribute('cx', f(x + Math.cos(ang * Math.PI / 180) * 4.2 * s)); eye.setAttribute('cy', f(y + Math.sin(ang * Math.PI / 180) * 4.2 * s - 0.6 * s));
  };
}
