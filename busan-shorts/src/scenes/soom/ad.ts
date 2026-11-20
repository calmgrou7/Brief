// 숨결 ad: tension → pick a mood → recommended breath → breathe along (the ad itself
// breathes) → relaxed → CTA. Warm cream / terracotta / olive, like the app.
import { el, f, limb, solid, shoe, PAPER, type Vec } from '../../../lib/ink.ts';
import { W, SP, P, S, B, C, G, brect, oval, srnd, reseed, lerp, ease, easeInOut, clamp } from '../../kit.ts';
import { layers, type Scene } from '../../scene.ts';
import { phone, tap, solidBg, note, pop } from '../nowro/kit.ts';

export const CREAM = '#f7eedd', TERRA = '#a9502f', OLIVE = '#6e7f3a', BROWN = '#3b2a22', DEEP = '#2b1d17', GOLD = '#e7b07a';
const lightRoot = (L: ReturnType<typeof layers>) => { L.root.style.color = BROWN; L.root.style.setProperty('--paper', CREAM); };
const darkRoot = (L: ReturnType<typeof layers>) => { L.root.style.color = '#f3e3c8'; L.root.style.setProperty('--paper', DEEP); };
const crispLayer = (L: ReturnType<typeof layers>) => el('g', {}, L.cam);

/** An olive leaf sprig (line art, coloured leaves) that sways. */
function sprig(g: Element, x: number, y: number, s: number, flip = 1) {
  const n = G(g);
  P(n, 'M0 0 Q4 -30 0 -62', SP * 1.1);
  for (let i = 0; i < 4; i++) {
    const yy = -12 - i * 14, d = i % 2 ? 1 : -1;
    C(n, `M0 ${yy} Q${d * 14} ${yy - 4} ${d * 18} ${yy - 14} Q${d * 6} ${yy - 12} 0 ${yy}Z`, OLIVE, SP * 0.7);
  }
  return (t: number) => n.setAttribute('transform', `translate(${x} ${y}) scale(${f(s * flip)} ${s}) rotate(${f(Math.sin(t * 0.9 + x) * 4)})`);
}

/** A person at a desk with a laptop. tension 0..1 raises the shoulders, drops the head, jitters the typing hand. */
export function deskPerson(parent: Element, x: number, y: number, s: number, shirt = OLIVE, mug = TERRA) {
  const g = G(parent);
  g.setAttribute('transform', `translate(${x} ${y}) scale(${s}) translate(-40 -120)`);
  // chair and desk
  P(g, 'M26 88 L21 50 M24 90 L22 120 M48 90 L50 120', SP * 1.1);
  S(g, brect(22, 85, 50, 90, 0.3), SP * 1.1);
  S(g, brect(58, 64, 150, 69, 0.3), SP * 1.1);
  P(g, 'M64 69 L64 120 M144 69 L144 120', SP * 1.1);
  // laptop: base on the desk, screen seen from the side
  S(g, 'M72 62 L106 62 L107 64.5 L71 64.5Z', SP);
  S(g, 'M105 62.5 L99 36 L101.6 35.6 L107.6 62.2Z', SP);
  const glow = el('ellipse', { cx: 96, cy: 52, rx: 16, ry: 14, fill: 'url(#glow-white)', opacity: 0 }, g);
  // a mug
  C(g, 'M120 64 L121 54 L129 54 L130 64Z', mug, SP * 0.9);
  P(g, 'M130 56 q4 1 0 6', SP * 0.8);
  const steam = P(g, '', SP * 0.7);
  const legs = [limb(g, 4.6), limb(g, 4.6)];
  legs.forEach((l) => solid(l, '#4a3b33'));
  const shoes = [B(g, ''), B(g, '')];
  const farArm = limb(g, 3.8);
  const torso = C(g, '', shirt);
  const head = el('ellipse', { rx: 4, ry: 4.9, fill: PAPER, stroke: 'currentColor', 'stroke-width': 1.35 }, g);
  head.classList.add('pp');
  const hair = B(g, '');
  const nearArm = limb(g, 3.8);
  return {
    g, glow,
    draw(t: number, tension: number, breath: number) {
      const hip: Vec = [40, 86];
      legs[0].draw([hip, [64, 85], [64, 118.4]], [0.3, 0.8]); shoe(shoes[0], [64, 118.4], 0);
      legs[1].draw([[38, 87], [60, 87], [58, 118.4]], [0.3, 0.8]); shoe(shoes[1], [58, 118.4], 0);
      const lean = tension * 5, lift = tension * 3.2 - breath * 1.6;
      const sh: Vec = [40 + lean, 53 - lift];
      const w = 7 + breath * 0.8;
      torso.setAttribute('d', `M${f(sh[0] - w)} ${f(sh[1] + 1)} Q${f(sh[0])} ${f(sh[1] - 2.6 - breath)} ${f(sh[0] + w - 1)} ${f(sh[1] + 1)} Q${f(sh[0] + w + 1)} ${f(72)} ${f(48)} ${f(87)} L${f(32)} ${f(87.5)} Q${f(sh[0] - w - 1.5)} 70 ${f(sh[0] - w)} ${f(sh[1] + 1)}Z`);
      const hc: Vec = [sh[0] + 2.4 + tension * 3, sh[1] - 10.5 + tension * 3.2 - breath * 0.6];
      head.setAttribute('cx', f(hc[0])); head.setAttribute('cy', f(hc[1]));
      hair.setAttribute('d', `M${f(hc[0] - 4.2)} ${f(hc[1] + 1)} Q${f(hc[0] - 4.6)} ${f(hc[1] - 6)} ${f(hc[0] + 1)} ${f(hc[1] - 5.2)} Q${f(hc[0] + 4.2)} ${f(hc[1] - 4.4)} ${f(hc[0] + 3.8)} ${f(hc[1] - 1.6)} L${f(hc[0] - 1)} ${f(hc[1] - 2.4)}Z ${oval(hc[0] - 5, hc[1] - 4.4, 2.6, 2.4)}`);
      const jit = Math.sin(t * 31) * 1.3 * tension, jit2 = Math.sin(t * 27 + 1) * 1.1 * tension;
      // tense: both hands on the keyboard; relaxed: hands rest on the thighs
      const handF: Vec = [lerp(56, 80 + jit2, tension), lerp(82, 61.5, tension)];
      const handN: Vec = [lerp(60, 88 + jit, tension), lerp(83, 61.5, tension)];
      farArm.draw([[sh[0] - 1, sh[1] + 2], [lerp(sh[0] + 2, sh[0] + 9, tension), lerp(sh[1] + 19, sh[1] + 15, tension)], handF], [0.2, 0.5]);
      nearArm.draw([[sh[0] + 1.6, sh[1] + 2.4], [lerp(sh[0] + 5, sh[0] + 13, tension), lerp(sh[1] + 19, sh[1] + 14, tension)], handN], [0.2, 0.4]);
      steam.setAttribute('d', `M123 52 q${f(-2 + Math.sin(t * 2) * 1.5)} -5 0 -10 q${f(2 + Math.sin(t * 2.4))} -5 0 -9 M127 52 q${f(2 + Math.sin(t * 1.7))} -5 0 -9`);
    },
  };
}

/** Wall clock whose second hand ticks (fast when tense). */
export function clock(g: Element, x: number, y: number, r: number, hand = TERRA) {
  S(g, oval(x, y, r, r), SP * 1.2);
  P(g, Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `M${f(x + Math.sin(a) * r * 0.82)} ${f(y - Math.cos(a) * r * 0.82)} L${f(x + Math.sin(a) * r * 0.92)} ${f(y - Math.cos(a) * r * 0.92)}`; }).join(' '), SP * 0.6);
  P(g, `M${x} ${y} L${x + r * 0.45} ${y - r * 0.2} M${x} ${y} L${x - r * 0.1} ${y - r * 0.68}`, SP * 1.3);
  const sec = P(g, '', SP * 0.7);
  sec.setAttribute('stroke', hand);
  return (t: number, speed: number) => {
    const a = Math.floor(t * speed) / 60 * Math.PI * 2 + 0.6;
    sec.setAttribute('d', `M${x} ${y} L${f(x + Math.sin(a) * r * 0.8)} ${f(y - Math.cos(a) * r * 0.8)}`);
  };
}

/** The office corner shared by the hook and the relaxed beat. */
function office(L: ReturnType<typeof layers>) {
  solidBg(L.back, CREAM);
  const wall = G(L.ink);
  S(wall, brect(300, 250, 500, 520, 0.6), SP * 1.1);                 // window
  P(wall, 'M400 250 L400 520 M300 385 L500 385', SP * 0.8);
  P(wall, 'M312 500 l0 -60 l22 0 l0 60 M344 500 l0 -90 l20 0 l0 90 M372 500 l0 -40 l18 0 l0 40 M410 500 l0 -110 l26 0 l0 110 M446 500 l0 -70 l20 0 l0 70', SP * 0.55);
  P(wall, `M-40 900 L${W + 40} 900`, SP * 1.1);
  const tick = clock(wall, 150, 420, 38);
  const sp = [sprig(L.ink, 470, 900, 1.1, -1), sprig(L.ink, 40, 900, 0.9)];
  const person = deskPerson(L.ink, 160, 900, 3.0);
  return { tick, sp, person };
}

// ------------------------------------------------------------------ 1 hook: tension
export function soHook(svg: SVGSVGElement, filter: string): Scene {
  reseed(301);
  const L = layers(svg, filter);
  const o = office(L);
  const words = ['발표 5분 전', '답장 주세요', '마감 오늘!', '회의 시작', '부재중 전화', '자료 확인?'];
  const notes = words.map((w, i) => ({ g: note(L.ink, w, 19 * w.length + 30), a0: (i / words.length) * Math.PI * 2, rx: 120 + (i % 2) * 40, ry: 70 + (i % 3) * 22, at: 0.2 + i * 0.12, sp: srnd(0, 6) }));
  const dur = 3.5;
  return {
    root: L.root, dur, tau: [0.5, 0.5], title: { han: '', name: '' },
    caps: [{ at: 0.15, pos: 'top', lines: ['<b class="big">발표 5분 전,</b>', '<b class="big"><em>숨이 턱</em> 막힐 때</b>'] }],
    update(t) {
      lightRoot(L);
      L.cam.setAttribute('transform', `translate(270 480) scale(${f(lerp(1.0, 1.1, easeInOut(t / dur)))}) translate(-270 ${f(-480 - lerp(20, 60, easeInOut(t / dur)))})`);
      o.tick(t, 4); o.sp.forEach((s) => s(t));
      o.person.draw(t, 1, 0);
      o.person.glow.setAttribute('opacity', '0.4');
      notes.forEach((n) => {
        const k = pop((t - n.at) / 0.35), a = n.a0 + t * 1.1;
        const shake = Math.sin(t * 40 + n.sp) * 1.6;
        n.g.setAttribute('transform', `translate(${f(250 + Math.cos(a) * n.rx * Math.min(1, k) + shake)} ${f(560 + Math.sin(a) * n.ry * Math.min(1, k))}) rotate(${f(Math.sin(t * 6 + n.sp) * 10)}) scale(${f(Math.max(0, k))})`);
      });
    },
  };
}

function softStage(L: ReturnType<typeof layers>) {
  solidBg(L.back, CREAM);
  const sp = [sprig(L.ink, 60, 900, 1.3), sprig(L.ink, 480, 900, 1.3, -1), sprig(L.ink, 30, 560, 0.8), sprig(L.ink, 510, 520, 0.8, -1)];
  return (t: number) => sp.forEach((s) => s(t));
}

// ------------------------------------------------------------------ 2 pick a mood
export function soMood(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  const stage = softStage(L);
  const crisp = crispLayer(L);
  const ph = phone(L.ink, crisp, 270, 600, 250);
  const s1 = ph.add('s1', '/soom/s1.png'); s1.setAttribute('opacity', 1);
  const s4 = ph.add('s4', '/soom/s4.png');
  const t1 = tap(ph.overlay, '#c4633a'), t2 = tap(ph.overlay, '#c4633a');
  const hl = el('path', { fill: 'none', stroke: TERRA, 'stroke-width': 4, 'stroke-linejoin': 'round', opacity: 0 }, ph.overlay);
  const dur = 3.4;
  return {
    root: L.root, dur, tau: [0.5, 0.5], title: { han: '', name: '' },
    caps: [{ at: 0.3, pos: 'top', lines: ['지금 내 <em>마음을 고르면</em>'], sub: '화가 나요 · 긴장돼요 · 잠이 안 와요' }],
    update(t) {
      lightRoot(L); stage(t);
      ph.at(270, 610 + Math.sin(t * 1.2) * 4, 1);
      const sw = ease((t - 0.95) / 0.35);
      s4.setAttribute('opacity', f(sw)); s1.setAttribute('opacity', f(1 - sw));
      const a = ph.pt(0.5, 0.805), b = ph.pt(0.71, 0.53);
      t1(a[0], a[1], t - 0.55); t2(b[0], b[1], t - 2.0);
      const k = ease((t - 2.1) / 0.3), [x0, y0] = ph.pt(0.52, 0.465), [x1, y1] = ph.pt(0.905, 0.6);
      hl.setAttribute('d', `M${f(x0)} ${f(y0)} L${f(x1)} ${f(y0)} L${f(x1)} ${f(y1)} L${f(x0)} ${f(y1)}Z`);
      hl.setAttribute('opacity', f(k));
    },
  };
}

// ------------------------------------------------------------------ 3 recommendation
export function soPick(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  const stage = softStage(L);
  const crisp = crispLayer(L);
  const ph = phone(L.ink, crisp, 270, 600, 250);
  const s5 = ph.add('s5', '/soom/s5.png'); s5.setAttribute('opacity', 1);
  const s3 = ph.add('s3', '/soom/s3.png');
  const tp = tap(ph.overlay, '#c4633a');
  const dur = 3.3;
  return {
    root: L.root, dur, tau: [0.5, 0.5], title: { han: '', name: '' },
    caps: [{ at: 0.3, pos: 'top', lines: ['지금 나에게 맞는 호흡을', '<em>골라줘요</em>'] }],
    update(t) {
      lightRoot(L); stage(t);
      ph.at(270, 610 + Math.sin(t * 1.2) * 4, lerp(1, 1.04, ease((t - 2.2) / 0.8)));
      const a = ph.pt(0.5, 0.865);
      tp(a[0], a[1], t - 1.6);
      const sw = ease((t - 2.1) / 0.4);
      s3.setAttribute('opacity', f(sw)); s5.setAttribute('opacity', f(1 - sw));
    },
  };
}

// ------------------------------------------------------------------ 4 breathe along
export function soBreathe(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  solidBg(L.back, DEEP);
  const cx = 270, cy = 610;
  const glow = el('ellipse', { cx, cy, rx: 100, ry: 100, fill: 'url(#glow-warm)', opacity: 0.5 }, L.glow);
  const echo = [0, 1, 2].map((i) => el('circle', { cx, cy, r: 80, fill: 'none', stroke: GOLD, 'stroke-width': 1.2, opacity: 0.35 - i * 0.1 }, L.ink));
  const ring = el('circle', { cx, cy, r: 80, fill: 'none', stroke: GOLD, 'stroke-width': 3.2 }, L.ink);
  const ringInner = el('circle', { cx, cy, r: 74, fill: 'none', stroke: GOLD, 'stroke-width': 0.8, opacity: 0.6 }, L.ink);
  const crisp = crispLayer(L);
  const label = el('text', { x: cx, y: cy + 2, 'font-size': 40, 'font-weight': 900, 'font-family': 'Noto Sans KR', 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#f6e7cf' }, crisp);
  // the rhythm line under the circle, with a dot riding it
  const wave = el('path', { fill: 'none', stroke: '#c9b291', 'stroke-width': 1.4 }, crisp);
  const dot = el('circle', { r: 5, fill: '#f6e7cf' }, crisp);
  const sp = [sprig(L.ink, 60, 930, 1.2), sprig(L.ink, 480, 930, 1.2, -1)];
  const IN0 = 0.5, IN1 = 4.1, OUT1 = 7.7;
  const radius = (t: number) => t < IN0 ? 80 : t < IN1 ? lerp(80, 205, easeInOut((t - IN0) / (IN1 - IN0))) : lerp(205, 80, easeInOut((t - IN1) / (OUT1 - IN1)));
  const springs = [0, 0, 0];
  const dur = 8.0;
  return {
    root: L.root, dur, tau: [0.92, 0.92], title: { han: '', name: '' },
    caps: [{ at: 0.2, pos: 'top', lines: ['같이 한 번,', '<em>숨 쉬어볼까요?</em>'] }],
    update(t, dt) {
      darkRoot(L); sp.forEach((s) => s(t));
      const r = radius(t);
      ring.setAttribute('r', f(r)); ringInner.setAttribute('r', f(r - 6));
      echo.forEach((e, i) => { springs[i] += (r + 14 + i * 14 - springs[i]) * Math.min(1, dt * (4 - i)); e.setAttribute('r', f(springs[i] || r)); });
      glow.setAttribute('rx', f(r * 1.6)); glow.setAttribute('ry', f(r * 1.6));
      glow.setAttribute('opacity', f(0.25 + (r - 80) / 125 * 0.55));
      const inhale = t >= IN0 && t < IN1, exhale = t >= IN1;
      label.textContent = inhale ? '들이쉬기' : exhale ? '내쉬기' : '준비';
      label.setAttribute('opacity', f(t < IN0 ? 0.6 : 1));
      label.setAttribute('font-size', f(lerp(34, 46, (r - 80) / 125)));
      const wy = 860, wx0 = 90, wx1 = 450;
      wave.setAttribute('d', 'M' + Array.from({ length: 61 }, (_, i) => { const u = i / 60; const yy = wy - 26 * Math.sin(Math.PI * u); return `${f(wx0 + u * (wx1 - wx0))} ${f(yy)}`; }).join(' L'));
      const u = clamp((t - IN0) / (OUT1 - IN0), 0, 1);
      dot.setAttribute('cx', f(wx0 + u * (wx1 - wx0))); dot.setAttribute('cy', f(wy - 26 * Math.sin(Math.PI * u)));
    },
  };
}

// ------------------------------------------------------------------ 5 relaxed
export function soRelax(svg: SVGSVGElement, filter: string): Scene {
  reseed(305);
  const L = layers(svg, filter);
  const o = office(L);
  // leaves drifting up and away where the notes used to be
  const leaves = Array.from({ length: 9 }, (_, i) => ({ n: C(L.ink, 'M0 0 Q8 -3 12 -10 Q4 -9 0 0Z', OLIVE, SP * 0.7), x: 180 + srnd(-90, 120), y: 600 + srnd(-60, 60), sp: srnd(30, 55), ph: srnd(0, 6), at: i * 0.12 }));
  const dur = 3.6;
  return {
    root: L.root, dur, tau: [0.5, 0.5], title: { han: '', name: '' },
    caps: [{ at: 0.3, pos: 'top', lines: ['단 1분,', '<em>숨 고르는 시간</em>'] }],
    update(t) {
      lightRoot(L);
      L.cam.setAttribute('transform', `translate(270 480) scale(1.06) translate(-270 -520)`);
      o.tick(t, 1); o.sp.forEach((s) => s(t));
      const breath = (Math.sin(t * Math.PI / 1.8 - Math.PI / 2) + 1) / 2;
      o.person.draw(t, Math.max(0, 0.25 - t * 0.3), breath);
      o.person.glow.setAttribute('opacity', '0');
      leaves.forEach((l) => {
        const s = t - l.at, k = clamp(s / 0.4, 0, 1);
        l.n.setAttribute('transform', `translate(${f(l.x + Math.sin(s * 1.4 + l.ph) * 18)} ${f(l.y - s * l.sp)}) rotate(${f(Math.sin(s * 2 + l.ph) * 40)}) scale(${f(1.6 * k)})`);
        l.n.setAttribute('opacity', f(k * (1 - clamp((s - 2.4) / 0.8, 0, 1))));
      });
    },
  };
}

// ------------------------------------------------------------------ 6 CTA
export function soCta(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  const stage = softStage(L);
  const ring = el('circle', { cx: 270, cy: 450, r: 112, fill: 'none', stroke: TERRA, 'stroke-width': 2, opacity: 0.6 }, L.ink);
  const crisp = crispLayer(L);
  const icon = el('image', { href: '/soom/icon.png', x: -88, y: -88, width: 176, height: 176 }, crisp);
  const clip = el('clipPath', { id: 'soom-icon' }, svg.querySelector('defs')!);
  el('circle', { cx: 0, cy: 0, r: 88 }, clip);
  icon.setAttribute('clip-path', 'url(#soom-icon)');
  const pill = G(crisp);
  el('rect', { x: -190, y: -36, width: 380, height: 72, rx: 36, fill: TERRA }, pill);
  el('text', { x: 0, y: 2, 'font-size': 28, 'font-weight': 900, 'font-family': 'Noto Sans KR', 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: CREAM }, pill).textContent = '토스에서 ‘숨결’ 검색';
  const hint = el('text', { x: 270, y: 700, 'font-size': 19, 'font-weight': 700, 'font-family': 'Noto Sans KR', 'text-anchor': 'middle', fill: BROWN }, crisp);
  hint.textContent = '앱 설치 없이 토스에서 바로 열려요';
  const dur = 5.0;
  return {
    root: L.root, dur, tau: [0.5, 0.5], title: { han: '', name: '' },
    caps: [{ at: 0.1, pos: 'top', lines: ['<b class="big">숨결</b>'], sub: '빛과 소리를 따라 나에게 맞는 호흡' }],
    update(t) {
      lightRoot(L); stage(t);
      const ip = pop((t - 0.2) / 0.5);
      icon.setAttribute('transform', `translate(270 450) scale(${f(Math.max(0, ip))})`);
      const br = (Math.sin(t * Math.PI / 2 - Math.PI / 2) + 1) / 2;
      ring.setAttribute('r', f(108 + br * 26)); ring.setAttribute('opacity', f(ease((t - 0.4) / 0.4) * (0.7 - br * 0.4)));
      const pp = pop((t - 0.9) / 0.45);
      pill.setAttribute('transform', `translate(270 630) scale(${f(Math.max(0, pp))})`);
      hint.setAttribute('opacity', f(ease((t - 1.3) / 0.4)));
    },
  };
}
