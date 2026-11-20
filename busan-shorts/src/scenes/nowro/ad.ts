// 나우로 부산 ad, six beats: hook → problem → reveal → feature 1 → feature 2 → CTA.
// Line-art Busan for the story, real app screenshots inside a line-art phone for the product.
import { el, f } from '../../../lib/ink.ts';
import type { Palette } from '../../../lib/daynight.ts';
import { W, SP, P, S, G, brect, oval, srnd, reseed, sky, tintAll, lerp, ease, easeInOut, smooth, clamp } from '../../kit.ts';
import { layers, type Scene } from '../../scene.ts';
import { Person } from '../../people.ts';
import { water, gulls } from '../../sea.ts';
import { phone, tap, bridge, solidBg, note, pop, LIME, BLACK } from './kit.ts';

const crispLayer = (L: ReturnType<typeof layers>) => el('g', {}, L.cam);
const DARK_INK = '#eef7cf';
const darkRoot = (L: ReturnType<typeof layers>) => { L.root.style.color = DARK_INK; L.root.style.setProperty('--paper', BLACK); };

/** Gwangalli beach backdrop (day): sky, bridge, sea, sand. */
function beach(svg: SVGSVGElement, L: ReturnType<typeof layers>, id: string) {
  const paintSky = sky(svg, L.back, id, -100, -200, W + 100, 1200);
  P(L.ink, 'M40 150 L180 150 q8 0 8 -6 q0 -5 -6 -4 M70 162 L220 162 q7 0 7 6 M330 110 L440 110 q6 0 6 -5', SP * 0.8);
  bridge(L.ink, 520, 380);
  S(L.ink, `M-100 540 L${W + 100} 540 L${W + 100} 700 L-100 700Z`, SP);
  const waves = water(L.ink, -40, W + 40, 548, 690, 50);
  S(L.ink, `M-100 700 L${W + 100} 700 L${W + 100} 1300 L-100 1300Z`, SP);
  const surf = P(L.ink, '', SP * 0.7);
  P(L.ink, Array.from({ length: 40 }, (_, i) => `M${(i * 61) % 560} ${740 + (i * 37) % 260} l2 0`).join(' '), SP * 0.5);
  const birds = gulls(L.ink, 4, -20, W + 20, 220, 360, 1.1);
  return (t: number, Pl: Palette) => {
    paintSky(Pl); waves(t); birds(t);
    surf.setAttribute('d', `M-100 ${f(704 + Math.sin(t * 1.5) * 3)} ` + Array.from({ length: 16 }, (_, j) => `q25 ${j % 2 ? 2 : -2} 50 0`).join(' '));
  };
}

// ------------------------------------------------------------------ 1 hook
export function adHook(svg: SVGSVGElement, filter: string): Scene {
  reseed(201);
  const L = layers(svg, filter);
  const bg = beach(svg, L, 'sky-ah');
  const pg = G(L.ink);
  const passer = new Person(pg, 'coat', 600, 760, -1, 0.95, { shirt: '#c96f5b' });
  const me = new Person(pg, 'tourist', 290, 900, 1, 2.3, { stand: true, shirt: '#e8d9b5', extra: '#3d6b8c' });
  const qs = [[214, 560, 0.5, -12], [296, 512, 0.75, 4], [378, 566, 1.0, 14]].map(([x, y, at, r]) => ({
    x, y, at, r, n: el('text', { 'font-size': 64, 'font-weight': 900, 'font-family': 'Noto Sans KR', 'text-anchor': 'middle', fill: 'currentColor', stroke: 'var(--paper)', 'stroke-width': 6, 'paint-order': 'stroke' }, L.ink),
  }));
  qs.forEach((q) => { q.n.textContent = '?'; });
  const dur = 3.3;
  return {
    root: L.root, dur, tau: [0.5, 0.52], title: { han: '', name: '' },
    caps: [{ at: 0.15, pos: 'top', lines: ['<b class="big">부산 왔는데,</b>', '<b class="big">오늘 <em>뭐 하지?</em></b>'] }],
    update(t, dt, Pl) {
      bg(t, Pl); tintAll(L.ink, Pl);
      L.cam.setAttribute('transform', `translate(270 480) scale(${f(lerp(1.0, 1.08, easeInOut(t / dur)))}) translate(-270 ${f(-480 - lerp(0, 40, easeInOut(t / dur)))})`);
      passer.draw(t, dt, Pl); me.draw(t, dt, Pl);
      qs.forEach((q, i) => {
        const s = pop((t - q.at) / 0.35), b = Math.sin(t * 5 + i) * 4;
        q.n.setAttribute('transform', `translate(${q.x} ${f(q.y + b)}) rotate(${f(q.r + Math.sin(t * 3 + i) * 6)}) scale(${f(Math.max(0, s))})`);
      });
    },
  };
}

// ------------------------------------------------------------------ 2 problem
export function adChaos(svg: SVGSVGElement, filter: string): Scene {
  reseed(202);
  const L = layers(svg, filter);
  const bg = beach(svg, L, 'sky-ac');
  const pg = G(L.ink);
  const me = new Person(pg, 'tourist', 290, 940, 1, 2.0, { stand: true, action: 'photo', shirt: '#e8d9b5', extra: '#3d6b8c' });
  const words = ['축제?', '전시?', '공연?', '몇 시?', '어디서?', '오늘 해?', '체험?', '주차는?', '입장료?', '가는 법?'];
  const cards = words.map((w, i) => ({ g: note(L.ink, w, 22 * w.length + 26), a0: (i / words.length) * Math.PI * 2, rx: 150 + (i % 3) * 34, ry: 120 + (i % 2) * 50, om: (i % 2 ? 1 : -1) * (0.7 + srnd(0, 0.5)), at: 0.05 + i * 0.09, sp: srnd(0, 6) }));
  const dur = 3.4;
  return {
    root: L.root, dur, tau: [0.52, 0.54], title: { han: '', name: '' },
    caps: [{ at: 0.3, pos: 'top', lines: ['축제? 전시? 공연?', '검색만 하다 <em>하루가 가요</em>'] }],
    update(t, dt, Pl) {
      bg(t, Pl); tintAll(L.ink, Pl);
      L.cam.setAttribute('transform', `translate(270 480) scale(1.1) translate(-270 -520)`);
      me.draw(t, dt + (t < 0.05 ? 0.5 : 0), Pl);
      cards.forEach((c) => {
        const k = pop((t - c.at) / 0.4);
        const a = c.a0 + t * c.om;
        const x = 290 + Math.cos(a) * c.rx * Math.min(1, k), y = 700 + Math.sin(a) * c.ry * Math.min(1, k);
        c.g.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f(Math.sin(t * 2.4 + c.sp) * 14)}) scale(${f(Math.max(0, k))})`);
      });
    },
  };
}

// ------------------------------------------------------------------ 3 reveal
export function adReveal(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  solidBg(L.back, BLACK);
  const rays = P(L.ink, '', SP * 1.4);
  rays.setAttribute('stroke', LIME);
  const crisp = crispLayer(L);
  const ph = phone(L.ink, crisp, 270, 560, 250);
  const splash = G(ph.content);
  el('rect', { x: -ph.sw / 2, y: -ph.sh / 2, width: ph.sw, height: ph.sh, fill: BLACK }, splash);
  const icon = el('image', { href: '/nowro/icon.png', x: -70, y: -105, width: 140, height: 140 }, splash);
  const nm = el('text', { x: 0, y: 60, 'font-size': 26, 'font-weight': 900, 'font-family': 'Noto Sans KR', 'text-anchor': 'middle', fill: '#ffffff' }, splash);
  nm.textContent = '나우로 부산';
  const tg = el('text', { x: 0, y: 92, 'font-size': 13, 'font-weight': 700, 'font-family': 'Noto Sans KR', 'text-anchor': 'middle', fill: LIME }, splash);
  tg.textContent = '오늘의 부산 축제부터 전시까지 한눈에';
  const home = ph.add('s1', '/nowro/s1.png');
  ph.content.appendChild(splash);
  const dur = 3.5;
  return {
    root: L.root, dur, tau: [0.92, 0.92], title: { han: '', name: '' },
    caps: [{ at: 0.35, pos: 'top', lines: ['앱 설치 없이', '토스에서 바로 <em>나우로 부산</em>'] }],
    update(t) {
      darkRoot(L);
      const up = easeInOut(clamp((t - 0.05) / 0.8, 0, 1));
      ph.at(270, lerp(1250, 590, up), 1, lerp(8, 0, up));
      const ip = pop((t - 0.7) / 0.45);
      icon.setAttribute('transform', `translate(0 -35) scale(${f(Math.max(0, ip))}) translate(0 35)`);
      nm.setAttribute('opacity', f(ease((t - 1.0) / 0.3))); tg.setAttribute('opacity', f(ease((t - 1.2) / 0.3)));
      const sw = ease((t - 2.3) / 0.45);
      splash.setAttribute('opacity', f(1 - sw)); home.setAttribute('opacity', f(sw));
      // lime burst around the phone when the icon lands
      const b = clamp((t - 0.75) / 0.9, 0, 1), r0 = 250 + b * 40, r1 = r0 + 30 * Math.sin(b * Math.PI);
      rays.setAttribute('d', b <= 0 || b >= 1 ? '' : Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2; return `M${f(270 + Math.cos(a) * r0)} ${f(590 + Math.sin(a) * r0 * 1.2)} L${f(270 + Math.cos(a) * r1)} ${f(590 + Math.sin(a) * r1 * 1.2)}`; }).join(' '));
      rays.setAttribute('opacity', f(1 - b));
    },
  };
}

// light backdrop for the feature beats: paper with a faint bridge along the bottom
function lightStage(svg: SVGSVGElement, L: ReturnType<typeof layers>, id: string) {
  const paintSky = sky(svg, L.back, id, -100, -200, W + 100, 1200);
  const faint = G(L.ink, { opacity: 0.28 });
  bridge(faint, 900, 790);
  return (Pl: Palette) => paintSky(Pl);
}

/** lime chips that pop out from the phone */
function chip(g: Element, text: string) {
  const n = G(g);
  const w = 30 * text.length + 34;
  el('rect', { x: -w / 2, y: -24, width: w, height: 48, rx: 24, fill: LIME, stroke: 'currentColor', 'stroke-width': SP * 1.2 }, n);
  el('text', { x: 0, y: 1, 'font-size': 24, 'font-weight': 900, 'font-family': 'Noto Sans KR', 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: BLACK }, n).textContent = text;
  return n;
}

// ------------------------------------------------------------------ 4 feature: today's events
export function adEvents(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  const stage = lightStage(svg, L, 'sky-ae');
  const crisp = crispLayer(L);
  const ph = phone(L.ink, crisp, 270, 590, 250);
  ph.add('s1', '/nowro/s1.png').setAttribute('opacity', 1);
  const tp = tap(ph.overlay);
  const hl = el('path', { fill: 'none', stroke: LIME, 'stroke-width': 5, 'stroke-linejoin': 'round', opacity: 0 }, ph.overlay);
  const chips = [['축제', 82, 420], ['공연', 462, 470], ['전시', 74, 640], ['체험', 466, 700]].map(([w, x, y], i) => ({ g: chip(crisp, w as string), x: x as number, y: y as number, at: 1.2 + i * 0.22 }));
  const dur = 4.1;
  return {
    root: L.root, dur, tau: [0.5, 0.5], title: { han: '', name: '' },
    caps: [{ at: 0.35, pos: 'top', lines: ['날짜만 고르면', '오늘의 <em>축제·공연·전시</em>가', '한눈에'] }],
    update(t, _dt, Pl) {
      stage(Pl); tintAll(L.ink, Pl);
      ph.at(270, 600 + Math.sin(t * 1.4) * 4, 1);
      const hb = ease((t - 1.3) / 0.4), [hx0, hy0] = ph.pt(0.03, 0.62), [hx1, hy1] = ph.pt(0.97, 0.99);
      hl.setAttribute('d', `M${f(hx0)} ${f(hy0)} L${f(hx1)} ${f(hy0)} L${f(hx1)} ${f(hy1)} L${f(hx0)} ${f(hy1)}Z`);
      hl.setAttribute('opacity', f(hb)); hl.setAttribute('stroke-dasharray', `${f(1000 * hb)} 1000`);
      const [tx, ty] = ph.pt(0.73, 0.52);
      tp(tx, ty, t - 0.75);
      chips.forEach((c) => {
        const k = pop((t - c.at) / 0.4);
        const x = lerp(270, c.x, Math.min(1, Math.max(0, k))), y = lerp(600, c.y, Math.min(1, Math.max(0, k)));
        c.g.setAttribute('transform', `translate(${f(x)} ${f(y + Math.sin(t * 2 + c.x) * 3)}) scale(${f(Math.max(0, k))})`);
      });
    },
  };
}

// ------------------------------------------------------------------ 5 feature: auto course
export function adCourse(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  const stage = lightStage(svg, L, 'sky-ao');
  // route behind the phone: dashed lime path that draws itself, numbered pins drop on it
  const routeD = 'M40 880 C120 820 140 760 120 700 S300 560 470 600 S520 380 440 330';
  const route = el('path', { d: routeD, fill: 'none', stroke: LIME, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-dasharray': '1 0' }, L.ink);
  const routeInk = el('path', { d: routeD, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.2, 'stroke-dasharray': '6 7' }, L.ink);
  const len = 1100;
  const pins = [[120, 700, 1], [470, 600, 2], [440, 330, 3]].map(([x, y, n], i) => {
    const g = G(L.ink);
    S(g, 'M0 0 C-14 -14 -16 -24 -16 -30 A16 16 0 1 1 16 -30 C16 -24 14 -14 0 0Z', SP * 1.2).setAttribute('fill', LIME);
    S(g, oval(0, -30, 9, 9), SP);
    el('text', { x: 0, y: -29, 'font-size': 12, 'font-weight': 900, 'font-family': 'Noto Sans KR', 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: BLACK }, g).textContent = String(n);
    return { g, x, y, at: 2.3 + i * 0.45 };
  });
  const crisp = crispLayer(L);
  const ph = phone(L.ink, crisp, 270, 600, 250);
  const s3 = ph.add('s3', '/nowro/s3.png'); s3.setAttribute('opacity', 1);
  const s5 = ph.add('s5', '/nowro/s5.png');
  const tp1 = tap(ph.overlay), tp2 = tap(ph.overlay);
  const dur = 4.6;
  return {
    root: L.root, dur, tau: [0.5, 0.5], title: { han: '', name: '' },
    caps: [{ at: 0.35, pos: 'top', lines: ['가고 싶은 곳만 고르면', '<em>코스까지 자동으로</em>'] }],
    update(t, _dt, Pl) {
      stage(Pl); tintAll(L.ink, Pl);
      ph.at(270, 610 + Math.sin(t * 1.3) * 4, 1);
      const sw = ease((t - 1.75) / 0.35);
      s5.setAttribute('opacity', f(sw)); s3.setAttribute('opacity', f(1 - sw));
      const a = ph.pt(0.245, 0.65), b = ph.pt(0.5, 0.745);
      tp1(a[0], a[1], t - 0.6); tp2(b[0], b[1], t - 1.35);
      const d = clamp((t - 2.0) / 1.6, 0, 1);
      route.setAttribute('stroke-dasharray', `${f(len * d)} ${len}`);
      routeInk.setAttribute('opacity', f(d > 0 ? 1 : 0));
      routeInk.setAttribute('stroke-dasharray', d >= 1 ? '6 7' : `6 7`);
      routeInk.style.clipPath = `inset(0 0 0 0)`;
      pins.forEach((p) => { const k = pop((t - p.at) / 0.35); p.g.setAttribute('transform', `translate(${p.x} ${f(p.y - (1 - Math.min(1, Math.max(0, k))) * 40)}) scale(${f(Math.max(0, k))})`); });
    },
  };
}

// ------------------------------------------------------------------ 6 CTA
export function adCta(svg: SVGSVGElement, filter: string): Scene {
  reseed(206);
  const L = layers(svg, filter);
  solidBg(L.back, BLACK);
  const stars = Array.from({ length: 40 }, () => el('circle', { cx: srnd(0, W), cy: srnd(-40, 640), r: srnd(0.6, 1.4), fill: '#f6f2dc' }, L.back));
  const lineG = G(L.ink);
  const leds = bridge(lineG, 820, 680);
  const ledN = leds.map(([x, y]) => el('circle', { cx: x, cy: y, r: 5, fill: LIME, opacity: 0 }, L.glow));
  const crisp = crispLayer(L);
  const icon = el('image', { href: '/nowro/icon.png', x: -78, y: -78, width: 156, height: 156 }, crisp);
  const pill = G(crisp);
  el('rect', { x: -205, y: -36, width: 410, height: 72, rx: 36, fill: LIME }, pill);
  el('text', { x: 0, y: 2, 'font-size': 27, 'font-weight': 900, 'font-family': 'Noto Sans KR', 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: BLACK }, pill).textContent = '토스에서 ‘나우로 부산’ 검색';
  const hint = el('text', { x: 270, y: 640, 'font-size': 19, 'font-weight': 700, 'font-family': 'Noto Sans KR', 'text-anchor': 'middle', fill: '#cfd6c0' }, crisp);
  hint.textContent = '앱 설치 없이 토스에서 바로 열려요';
  const dur = 5.0;
  return {
    root: L.root, dur, tau: [0.92, 0.92], title: { han: '', name: '' },
    caps: [{ at: 0.1, pos: 'top', lines: ['<b class="big">나우로 부산</b>'], sub: '오늘의 부산 축제부터 전시까지 한눈에' }],
    update(t) {
      darkRoot(L);
      stars.forEach((s, i) => s.setAttribute('opacity', f(0.4 + 0.4 * Math.sin(t * 2 + i))));
      const ip = pop((t - 0.2) / 0.5);
      icon.setAttribute('transform', `translate(270 ${f(430 + Math.sin(t * 1.6) * 3)}) scale(${f(Math.max(0, ip))})`);
      const pp = pop((t - 0.9) / 0.45), pulse = 1 + Math.max(0, Math.sin((t - 1.6) * 4)) * 0.035 * (t > 1.6 ? 1 : 0);
      pill.setAttribute('transform', `translate(270 568) scale(${f(Math.max(0, pp) * pulse)})`);
      hint.setAttribute('opacity', f(ease((t - 1.3) / 0.4)));
      lineG.setAttribute('stroke', LIME);
      lineG.style.color = LIME;
      ledN.forEach((n, i) => n.setAttribute('opacity', f(ease((t - 0.4 - i * 0.012) / 0.3) * (0.55 + 0.45 * Math.sin(t * 4 - i * 0.4)))));
      void smooth;
    },
  };
}
