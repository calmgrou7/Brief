// 미니 수학의신 ad: sleepy study → VS countdown → reveal → duel (90s rounds) → level up → CTA.
import { el, f } from '../../../lib/ink.ts';
import { W, SP, P, S, G, brect, oval, srnd, reseed, lerp, ease, easeInOut, clamp } from '../../kit.ts';
import { layers, type Scene } from '../../scene.ts';
import { Person } from '../../people.ts';
import { phone, tap, solidBg, pop } from '../nowro/kit.ts';
import { deskPerson, clock } from '../soom/ad.ts';

export const DGREEN = '#154438', LIMEM = '#d8f57a', INKM = '#173a30', PAPERM = '#f3f6ee';
const lightRoot = (L: ReturnType<typeof layers>) => { L.root.style.color = INKM; L.root.style.setProperty('--paper', PAPERM); };
const darkRoot = (L: ReturnType<typeof layers>) => { L.root.style.color = '#e9f7c9'; L.root.style.setProperty('--paper', DGREEN); };
const crispLayer = (L: ReturnType<typeof layers>) => el('g', {}, L.cam);
const TXT = { 'font-family': 'Noto Sans KR', 'text-anchor': 'middle', 'dominant-baseline': 'central' };

// ------------------------------------------------------------------ 1 hook: sleepy study
export function mtHook(svg: SVGSVGElement, filter: string): Scene {
  reseed(501);
  const L = layers(svg, filter);
  solidBg(L.back, PAPERM);
  const wall = G(L.ink);
  P(wall, `M-40 900 L${W + 40} 900`, SP * 1.1);
  const tick = clock(wall, 420, 380, 40, '#2f7a5c');
  // faint formulas drifting behind
  const formulas = ['x² − 6x + 11', 'a² + b² = c²', '∫ f(x) dx', '√2', 'π r²', 'P(A∩B)', 'lim n→∞', 'f′(x) = 0'].map((s, i) => ({
    n: el('text', { ...TXT, x: 0, y: 0, 'font-size': 22 + (i % 3) * 6, 'font-weight': 700, fill: 'currentColor', opacity: 0.22, 'font-style': 'italic' }, L.ink), x: srnd(40, 500), y: srnd(420, 700), sp: srnd(6, 14), ph: srnd(0, 6), s,
  }));
  formulas.forEach((q) => { q.n.textContent = q.s; });
  const me = deskPerson(L.ink, 150, 900, 3.0, '#5b8fd6', '#2f7a5c');
  // an open workbook on the desk
  S(L.ink, 'M300 728 Q345 718 385 728 L385 736 Q345 726 300 736Z', SP);
  P(L.ink, 'M342 722 L342 732', SP * 0.7);
  const zs = [0, 1, 2].map((i) => ({ n: el('text', { ...TXT, 'font-size': 30 + i * 8, 'font-weight': 900, fill: 'currentColor' }, L.ink), at: i * 0.6 }));
  zs.forEach((z) => { z.n.textContent = 'Z'; });
  const dur = 3.2;
  return {
    root: L.root, dur, tau: [0.5, 0.5], title: { han: '', name: '' },
    caps: [{ at: 0.15, pos: 'top', lines: ['<b class="big">수학 문제집,</b>', '<b class="big"><em>펴자마자 졸리다면?</em></b>'] }],
    update(t) {
      lightRoot(L);
      L.cam.setAttribute('transform', `translate(270 480) scale(${f(lerp(1.0, 1.08, easeInOut(t / dur)))}) translate(-270 ${f(-480 - lerp(40, 70, easeInOut(t / dur)))})`);
      tick(t, 2);
      // nodding off: head sinks slowly, then jerks up
      const nod = ((t % 1.6) / 1.6);
      me.draw(t * 0.2, 0.55 + 0.45 * Math.min(1, nod * 1.4) * (nod < 0.9 ? 1 : 0), 0);
      me.glow.setAttribute('opacity', '0');
      formulas.forEach((q) => { const y = q.y - t * q.sp; q.n.setAttribute('transform', `translate(${f(q.x + Math.sin(t * 0.6 + q.ph) * 10)} ${f(y)}) rotate(${f(Math.sin(t + q.ph) * 6)})`); q.n.setAttribute('opacity', f(0.22 * clamp((y - 360) / 60, 0, 1))); });
      zs.forEach((z, i) => {
        const s = ((t - z.at) % 1.8 + 1.8) % 1.8, k = s / 1.8;
        z.n.setAttribute('transform', `translate(${f(270 + i * 22 + Math.sin(s * 3) * 8)} ${f(560 - k * 110)}) scale(${f(0.6 + k * 0.6)})`);
        z.n.setAttribute('opacity', f(t < z.at ? 0 : Math.sin(Math.PI * k)));
      });
    },
  };
}

/** A friendly line-art robot (the AI opponent). */
function robot(g: Element) {
  const n = G(g);
  P(n, 'M0 -118 L0 -100', SP * 1.4);
  S(n, oval(0, -122, 6, 6), SP * 1.2).setAttribute('fill', LIMEM);
  S(n, 'M-46 -100 Q-50 -100 -50 -94 L-50 -44 Q-50 -38 -44 -38 L44 -38 Q50 -38 50 -44 L50 -94 Q50 -100 44 -100Z', SP * 1.4);
  const eyes = [el('circle', { cx: -20, cy: -72, r: 8, fill: LIMEM, stroke: 'currentColor', 'stroke-width': SP }, n), el('circle', { cx: 20, cy: -72, r: 8, fill: LIMEM, stroke: 'currentColor', 'stroke-width': SP }, n)];
  P(n, 'M-16 -52 Q0 -46 16 -52', SP * 1.2);
  S(n, 'M-40 -30 L40 -30 L36 40 L-36 40Z', SP * 1.4);
  el('text', { ...TXT, x: 0, y: 4, 'font-size': 44, 'font-weight': 900, fill: LIMEM, 'font-family': 'serif' }, n).textContent = 'π';
  P(n, 'M-40 -20 Q-62 0 -58 26 M40 -20 Q62 0 58 26', SP * 1.4);
  return { n, eyes };
}

// ------------------------------------------------------------------ 2 twist: VS countdown
export function mtVs(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  solidBg(L.back, DGREEN);
  const sparks = P(L.ink, '', SP * 1.6);
  sparks.setAttribute('stroke', LIMEM);
  const pg = G(L.ink);
  const kid = new Person(pg, 'tourist', 140, 900, 1, 2.9, { stand: true, shirt: '#5b8fd6', extra: '#d8f57a' });
  const bot = robot(L.ink);
  const crisp = crispLayer(L);
  const vs = el('text', { ...TXT, x: 270, y: 640, 'font-size': 96, 'font-weight': 900, fill: LIMEM, 'font-style': 'italic', stroke: DGREEN, 'stroke-width': 8, 'paint-order': 'stroke' }, crisp);
  vs.textContent = 'VS';
  const count = el('text', { ...TXT, x: 270, y: 450, 'font-size': 150, 'font-weight': 900, fill: '#ffffff' }, crisp);
  const youTag = el('text', { ...TXT, x: 140, y: 930, 'font-size': 22, 'font-weight': 900, fill: '#e9f7c9' }, crisp);
  youTag.textContent = '나';
  const aiTag = el('text', { ...TXT, x: 400, y: 930, 'font-size': 22, 'font-weight': 900, fill: '#e9f7c9' }, crisp);
  aiTag.textContent = 'AI 상대';
  const dur = 3.2;
  return {
    root: L.root, dur, tau: [0.92, 0.92], title: { han: '', name: '' },
    caps: [{ at: 0.15, pos: 'top', lines: ['그럼', '<em>대결로</em> 풀어볼까요?'] }],
    update(t, dt, Pl) {
      darkRoot(L);
      const slide = easeInOut(clamp(t / 0.5, 0, 1));
      kid.x = lerp(-80, 140, slide); kid.draw(t, dt, Pl);
      bot.n.setAttribute('transform', `translate(${f(lerp(640, 400, slide))} ${f(830 + Math.sin(t * 4) * 4)}) scale(1.6)`);
      bot.eyes.forEach((e) => e.setAttribute('r', f(Math.sin(t * 2.3) > 0.95 ? 1.5 : 8)));
      const vk = pop((t - 0.35) / 0.35);
      vs.setAttribute('transform', `translate(270 640) scale(${f(Math.max(0, vk) * (1 + Math.sin(t * 10) * 0.02))}) translate(-270 -640)`);
      // 3, 2, 1, GO! (beeps in the music line up with these)
      const marks = [0.9, 1.5, 2.1, 2.6];
      const idx = marks.filter((m) => t >= m).length - 1;
      if (idx < 0) { count.setAttribute('opacity', 0); }
      else {
        const s = t - marks[idx];
        count.textContent = ['3', '2', '1', 'GO!'][idx];
        count.setAttribute('fill', idx === 3 ? LIMEM : '#ffffff');
        count.setAttribute('font-size', idx === 3 ? '110' : '150');
        count.setAttribute('opacity', f(1 - clamp((s - 0.35) / 0.2, 0, 1) * (idx === 3 ? 0 : 1)));
        count.setAttribute('transform', `translate(270 450) scale(${f(Math.max(0, pop(s / 0.22)))}) translate(-270 -450)`);
      }
      const b = clamp((t - 0.35) / 0.5, 0, 1);
      sparks.setAttribute('d', b >= 1 ? '' : Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2, r0 = 70 + b * 50, r1 = r0 + 26 * Math.sin(b * Math.PI); return `M${f(270 + Math.cos(a) * r0)} ${f(640 + Math.sin(a) * r0 * 0.7)} L${f(270 + Math.cos(a) * r1)} ${f(640 + Math.sin(a) * r1 * 0.7)}`; }).join(' '));
      youTag.setAttribute('x', f(kid.x)); aiTag.setAttribute('x', f(lerp(640, 400, slide)));
    },
  };
}

// ------------------------------------------------------------------ 3 reveal
export function mtReveal(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  solidBg(L.back, DGREEN);
  const rays = P(L.ink, '', SP * 1.4);
  rays.setAttribute('stroke', LIMEM);
  const crisp = crispLayer(L);
  const ph = phone(L.ink, crisp, 270, 600, 250);
  const splash = G(ph.content);
  el('rect', { x: -ph.sw / 2, y: -ph.sh / 2, width: ph.sw, height: ph.sh, fill: DGREEN }, splash);
  const icon = el('image', { href: '/math/icon.png', x: -70, y: -105, width: 140, height: 140 }, splash);
  const nm = el('text', { ...TXT, x: 0, y: 58, 'font-size': 26, 'font-weight': 900, fill: '#ffffff' }, splash);
  nm.textContent = '미니 수학의신';
  const tg = el('text', { ...TXT, x: 0, y: 88, 'font-size': 15, 'font-weight': 700, fill: LIMEM }, splash);
  tg.textContent = '도전하면서 실력쌓기';
  const duel = ph.add('s3', '/math/s3.png');
  ph.content.appendChild(splash);
  const tp = tap(ph.overlay, LIMEM);
  const dur = 3.5;
  return {
    root: L.root, dur, tau: [0.92, 0.92], title: { han: '', name: '' },
    caps: [{ at: 0.35, pos: 'top', lines: ['앱 설치 없이 토스에서 바로', '<em>미니 수학의신</em>'] }],
    update(t) {
      darkRoot(L);
      const up = easeInOut(clamp((t - 0.05) / 0.7, 0, 1));
      ph.at(270, lerp(1250, 610, up), 1, lerp(8, 0, up));
      icon.setAttribute('transform', `translate(0 -35) scale(${f(Math.max(0, pop((t - 0.6) / 0.4)))}) translate(0 35)`);
      nm.setAttribute('opacity', f(ease((t - 0.9) / 0.3))); tg.setAttribute('opacity', f(ease((t - 1.1) / 0.3)));
      const sw = ease((t - 1.9) / 0.4);
      splash.setAttribute('opacity', f(1 - sw)); duel.setAttribute('opacity', f(sw));
      const a = ph.pt(0.5, 0.72);
      tp(a[0], a[1], t - 2.85);
      const b = clamp((t - 0.65) / 0.9, 0, 1), r0 = 250 + b * 40, r1 = r0 + 30 * Math.sin(b * Math.PI);
      rays.setAttribute('d', b <= 0 || b >= 1 ? '' : Array.from({ length: 18 }, (_, i) => { const q = (i / 18) * Math.PI * 2; return `M${f(270 + Math.cos(q) * r0)} ${f(610 + Math.sin(q) * r0 * 1.2)} L${f(270 + Math.cos(q) * r1)} ${f(610 + Math.sin(q) * r1 * 1.2)}`; }).join(' '));
      rays.setAttribute('opacity', f(1 - b));
    },
  };
}

function lightStage(L: ReturnType<typeof layers>) {
  solidBg(L.back, PAPERM);
  const deco = G(L.ink, { opacity: 0.16 });
  // graph paper along the edges
  const d: string[] = [];
  for (let x = 0; x <= W; x += 30) d.push(`M${x} 300 L${x} 960`);
  for (let y = 300; y <= 960; y += 30) d.push(`M0 ${y} L${W} ${y}`);
  P(deco, d.join(' '), SP * 0.6);
}

// ------------------------------------------------------------------ 4 duel
export function mtDuel(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  lightStage(L);
  const crisp = crispLayer(L);
  const ph = phone(L.ink, crisp, 270, 610, 250);
  const s4 = ph.add('s4', '/math/s4.png'); s4.setAttribute('opacity', 1);
  const s5 = ph.add('s5', '/math/s5.png');
  const t1 = tap(ph.overlay, '#2f7a5c'), t2 = tap(ph.overlay, '#2f7a5c');
  // big timer ring at the left, round tag at the right
  const ringBg = el('circle', { cx: 74, cy: 440, r: 46, fill: '#ffffff', stroke: INKM, 'stroke-width': 2 }, crisp);
  void ringBg;
  const ring = el('circle', { cx: 74, cy: 440, r: 46, fill: 'none', stroke: '#2f7a5c', 'stroke-width': 7, 'stroke-linecap': 'round', transform: 'rotate(-90 74 440)', 'stroke-dasharray': `${2 * Math.PI * 46} 999` }, crisp);
  const secs = el('text', { ...TXT, x: 74, y: 438, 'font-size': 30, 'font-weight': 900, fill: INKM }, crisp);
  const sLabel = el('text', { ...TXT, x: 74, y: 506, 'font-size': 16, 'font-weight': 900, fill: INKM }, crisp);
  sLabel.textContent = '문제당 90초';
  const tag = G(crisp);
  el('rect', { x: -56, y: -22, width: 112, height: 44, rx: 22, fill: LIMEM, stroke: INKM, 'stroke-width': 1.6 }, tag);
  const roundTxt = el('text', { ...TXT, x: 0, y: 1, 'font-size': 18, 'font-weight': 900, fill: DGREEN }, tag);
  const plus = el('text', { ...TXT, x: 466, y: 700, 'font-size': 40, 'font-weight': 900, fill: '#2f7a5c', stroke: PAPERM, 'stroke-width': 6, 'paint-order': 'stroke', opacity: 0 }, crisp);
  plus.textContent = '+118';
  const dur = 4.6;
  return {
    root: L.root, dur, tau: [0.5, 0.5], title: { han: '', name: '' },
    caps: [{ at: 0.3, pos: 'top', lines: ['AI 상대와 5라운드,', '<em>빠르고 정확할수록 고득점</em>'] }],
    update(t) {
      lightRoot(L);
      ph.at(270, 620 + Math.sin(t * 1.4) * 4, 1);
      const left = Math.max(0, 89 - Math.floor(t * 1.0));
      secs.textContent = `${left}s`;
      ring.setAttribute('stroke-dasharray', `${f(2 * Math.PI * 46 * (left / 90))} 999`);
      const sw = ease((t - 2.2) / 0.35);
      s5.setAttribute('opacity', f(sw)); s4.setAttribute('opacity', f(1 - sw));
      roundTxt.textContent = sw > 0.5 ? 'Round 2/5' : 'Round 1/5';
      tag.setAttribute('transform', `translate(466 450) scale(${f(Math.max(0, pop((t - 0.2) / 0.35)))})`);
      const a = ph.pt(0.5, 0.745), b = ph.pt(0.5, 0.85);
      t1(a[0], a[1], t - 0.9); t2(b[0], b[1], t - 1.8);
      const pk = pop((t - 2.6) / 0.35);
      plus.setAttribute('opacity', f(t > 2.6 ? 1 - clamp((t - 3.9) / 0.4, 0, 1) : 0));
      plus.setAttribute('transform', `translate(466 ${f(700 - clamp(t - 2.6, 0, 2) * 16)}) scale(${f(Math.max(0, pk))}) translate(-466 -700)`);
    },
  };
}

function chip(g: Element, text: string) {
  const n = G(g);
  const w = 28 * text.length + 36;
  el('rect', { x: -w / 2, y: -24, width: w, height: 48, rx: 24, fill: LIMEM, stroke: INKM, 'stroke-width': 1.6 }, n);
  el('text', { ...TXT, x: 0, y: 1, 'font-size': 23, 'font-weight': 900, fill: DGREEN }, n).textContent = text;
  return n;
}

// ------------------------------------------------------------------ 5 grow
export function mtGrow(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  lightStage(L);
  const crisp = crispLayer(L);
  const ph = phone(L.ink, crisp, 270, 610, 250);
  const s1 = ph.add('s1', '/math/s1.png'); s1.setAttribute('opacity', 1);
  const s2 = ph.add('s2', '/math/s2.png');
  const hl = el('path', { fill: 'none', stroke: '#2f7a5c', 'stroke-width': 4, 'stroke-linejoin': 'round', opacity: 0 }, ph.overlay);
  const lvl = el('text', { ...TXT, x: 0, y: 0, 'font-size': 22, 'font-weight': 900, fill: '#2f7a5c', stroke: PAPERM, 'stroke-width': 5, 'paint-order': 'stroke', opacity: 0 }, ph.overlay);
  lvl.textContent = 'LEVEL UP!';
  const chips = [['중등', 76, 480], ['고등', 464, 540], ['대학', 78, 690]].map(([w, x, y], i) => ({ g: chip(crisp, w as string), x: x as number, y: y as number, at: 1.9 + i * 0.22 }));
  const dur = 4.0;
  return {
    root: L.root, dur, tau: [0.5, 0.5], title: { han: '', name: '' },
    caps: [{ at: 0.3, pos: 'top', lines: ['중등부터 대학 수학까지', '<em>풀수록 레벨 업</em>'] }],
    update(t) {
      lightRoot(L);
      ph.at(270, 620 + Math.sin(t * 1.4) * 4, 1);
      const k = ease((t - 0.3) / 0.3) * (1 - ease((t - 1.6) / 0.3));
      const [x0, y0] = ph.pt(0.66, 0.08), [x1, y1] = ph.pt(0.93, 0.27);
      hl.setAttribute('d', `M${f(x0)} ${f(y0)} L${f(x1)} ${f(y0)} L${f(x1)} ${f(y1)} L${f(x0)} ${f(y1)}Z`);
      hl.setAttribute('opacity', f(k));
      const lk = pop((t - 0.6) / 0.35);
      lvl.setAttribute('opacity', f(k));
      lvl.setAttribute('transform', `translate(${f((x0 + x1) / 2 - 20)} ${f(y1 + 20)}) scale(${f(Math.max(0, lk))})`);
      const sw = ease((t - 1.7) / 0.35);
      s2.setAttribute('opacity', f(sw)); s1.setAttribute('opacity', f(1 - sw));
      chips.forEach((c) => {
        const q = pop((t - c.at) / 0.4), m = Math.min(1, Math.max(0, q));
        c.g.setAttribute('transform', `translate(${f(lerp(270, c.x, m))} ${f(lerp(610, c.y, m) + Math.sin(t * 2 + c.x) * 3)}) scale(${f(Math.max(0, q))})`);
      });
    },
  };
}

// ------------------------------------------------------------------ 6 CTA
export function mtCta(svg: SVGSVGElement, filter: string): Scene {
  reseed(506);
  const L = layers(svg, filter);
  solidBg(L.back, DGREEN);
  const syms = ['π', '∑', '√', '∞', '∫', 'x²', 'Δ', 'θ'];
  const float = Array.from({ length: 16 }, (_, i) => ({ n: el('text', { ...TXT, 'font-size': srnd(26, 54), 'font-weight': 900, fill: LIMEM, opacity: 0.16, 'font-family': 'serif' }, L.back), x: srnd(20, 520), y: srnd(320, 960), sp: srnd(8, 20), ph: srnd(0, 6), s: syms[i % syms.length] }));
  float.forEach((q) => { q.n.textContent = q.s; });
  const crisp = crispLayer(L);
  const clip = el('clipPath', { id: 'math-icon' }, svg.querySelector('defs')!);
  el('rect', { x: -84, y: -84, width: 168, height: 168, rx: 38 }, clip);
  const icon = el('image', { href: '/math/icon.png', x: -84, y: -84, width: 168, height: 168, 'clip-path': 'url(#math-icon)' }, crisp);
  const pill = G(crisp);
  el('rect', { x: -220, y: -36, width: 440, height: 72, rx: 36, fill: LIMEM }, pill);
  el('text', { ...TXT, x: 0, y: 2, 'font-size': 27, 'font-weight': 900, fill: DGREEN }, pill).textContent = '토스에서 ‘미니 수학의신’ 검색';
  const hint = el('text', { ...TXT, x: 270, y: 690, 'font-size': 19, 'font-weight': 700, fill: '#c8dcb8' }, crisp);
  hint.textContent = '앱 설치 없이 토스에서 바로 열려요';
  const dur = 5.0;
  return {
    root: L.root, dur, tau: [0.92, 0.92], title: { han: '', name: '' },
    caps: [{ at: 0.1, pos: 'top', lines: ['<b class="big">미니 수학의신</b>'], sub: '도전하면서 실력쌓기' }],
    update(t) {
      darkRoot(L);
      float.forEach((q) => q.n.setAttribute('transform', `translate(${f(q.x + Math.sin(t + q.ph) * 8)} ${f(q.y - t * q.sp)})`));
      icon.setAttribute('transform', `translate(270 ${f(440 + Math.sin(t * 1.6) * 3)}) rotate(${f(Math.sin(t * 2) * 2)}) scale(${f(Math.max(0, pop((t - 0.2) / 0.5)))})`);
      const pp = pop((t - 0.9) / 0.45), pulse = t > 1.6 ? 1 + Math.max(0, Math.sin((t - 1.6) * 4)) * 0.03 : 1;
      pill.setAttribute('transform', `translate(270 612) scale(${f(Math.max(0, pp) * pulse)})`);
      hint.setAttribute('opacity', f(ease((t - 1.3) / 0.4)));
    },
  };
}
