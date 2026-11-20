// 기업정책지원사업 ad: papers pile up → agency tabs everywhere → reveal → set conditions →
// matched list, save & send as mail/PDF → CTA (marked as a private service).
import { el, f } from '../../../lib/ink.ts';
import { W, SP, P, S, G, brect, srnd, reseed, lerp, ease, easeInOut, clamp } from '../../kit.ts';
import { layers, type Scene } from '../../scene.ts';
import { phone, tap, solidBg, pop } from '../nowro/kit.ts';
import { deskPerson, clock } from '../soom/ad.ts';

export const NAVY = '#0f2f55', GREEN = '#00c48c', INK = '#14233a', PAPERC = '#f5f7fa';
const lightRoot = (L: ReturnType<typeof layers>) => { L.root.style.color = INK; L.root.style.setProperty('--paper', PAPERC); };
const darkRoot = (L: ReturnType<typeof layers>) => { L.root.style.color = '#e6eef8'; L.root.style.setProperty('--paper', NAVY); };
const crispLayer = (L: ReturnType<typeof layers>) => el('g', {}, L.cam);
const TXT = { 'font-family': 'Noto Sans KR', 'text-anchor': 'middle', 'dominant-baseline': 'central' };

/** A browser window card with a title. */
function windowCard(g: Element, title: string, w = 220, h = 140) {
  const n = G(g);
  S(n, brect(-w / 2, -h / 2, w / 2, h / 2, 0.8), SP * 1.2);
  P(n, `M${-w / 2} ${-h / 2 + 26} L${w / 2} ${-h / 2 + 26}`, SP);
  for (let i = 0; i < 3; i++) S(n, `M${-w / 2 + 14 + i * 12} ${-h / 2 + 13} a3.4 3.4 0 1 0 0.1 0Z`, SP * 0.6);
  el('text', { ...TXT, x: 12, y: -h / 2 + 14, 'font-size': 15, 'font-weight': 900, fill: 'currentColor' }, n).textContent = title;
  P(n, Array.from({ length: 5 }, (_, i) => `M${-w / 2 + 16} ${-h / 2 + 44 + i * 17} L${-w / 2 + 16 + (w - 32) * (i % 2 ? 0.62 : 0.88)} ${-h / 2 + 44 + i * 17}`).join(' '), SP * 0.7);
  return n;
}

function office(L: ReturnType<typeof layers>) {
  solidBg(L.back, PAPERC);
  const wall = G(L.ink);
  S(wall, brect(300, 250, 500, 520, 0.6), SP * 1.1);
  P(wall, 'M400 250 L400 520 M300 385 L500 385', SP * 0.8);
  P(wall, `M-40 900 L${W + 40} 900`, SP * 1.1);
  const tick = clock(wall, 150, 420, 38, GREEN);
  const person = deskPerson(L.ink, 160, 900, 3.0, '#3f6f9f', GREEN);
  return { tick, person };
}

/** Stacks of paper that grow sheet by sheet. */
function piles(g: Element, specs: Array<[number, number, number, number]>) {
  const sheets = specs.flatMap(([x, y, w, n], k) => Array.from({ length: n }, (_, i) => ({ n: S(g, brect(x - w / 2 + srnd(-3, 3), y - (i + 1) * 9, x + w / 2 + srnd(-3, 3), y - i * 9, 0.4), SP * 0.9), at: 0.15 + (i * 0.11) + k * 0.05, y })));
  sheets.forEach((s) => s.n.setAttribute('opacity', 0));
  return (t: number) => sheets.forEach((s) => {
    const k = clamp((t - s.at) / 0.18, 0, 1);
    s.n.setAttribute('opacity', f(k)); s.n.setAttribute('transform', `translate(0 ${f((1 - k) * -40)})`);
  });
}

// ------------------------------------------------------------------ 1 hook
export function bzHook(svg: SVGSVGElement, filter: string): Scene {
  reseed(401);
  const L = layers(svg, filter);
  const o = office(L);
  const grow = piles(L.ink, [[470, 732, 56, 18], [505, 900, 64, 14], [80, 900, 60, 12]]);
  const dur = 3.4;
  return {
    root: L.root, dur, tau: [0.5, 0.5], title: { han: '', name: '' },
    caps: [{ at: 0.15, pos: 'top', lines: ['<b class="big">사장님, 지원사업 공고</b>', '<b class="big"><em>아직도 하나씩</em></b>', '<b class="big">찾으세요?</b>'] }],
    update(t) {
      lightRoot(L);
      L.cam.setAttribute('transform', `translate(270 480) scale(${f(lerp(1.0, 1.08, easeInOut(t / dur)))}) translate(-270 ${f(-480 - lerp(40, 80, easeInOut(t / dur)))})`);
      o.tick(t, 3); o.person.draw(t, 0.8, 0); o.person.glow.setAttribute('opacity', '0.35');
      grow(t);
    },
  };
}

// ------------------------------------------------------------------ 2 problem
export function bzChaos(svg: SVGSVGElement, filter: string): Scene {
  reseed(402);
  const L = layers(svg, filter);
  const o = office(L);
  const grow = piles(L.ink, [[470, 732, 56, 18], [505, 900, 64, 14], [80, 900, 60, 12]]);
  const titles = ['진흥원 공고', '시·도 공고', '창업센터', '기관 게시판', '공고 PDF', '신청 서식', '접수 마감?', '자격 요건'];
  const wins = titles.map((tt, i) => ({ g: windowCard(L.ink, tt, 200 + (i % 3) * 20, 120 + (i % 2) * 30), x: 120 + (i % 4) * 100 + srnd(-20, 20), y: 560 + Math.floor(i / 4) * 140 + srnd(-24, 24), r: srnd(-8, 8), at: 0.1 + i * 0.16 }));
  const dur = 3.4;
  return {
    root: L.root, dur, tau: [0.5, 0.5], title: { han: '', name: '' },
    caps: [{ at: 0.3, pos: 'top', lines: ['기관마다 사이트도,', '조건도 제각각이라', '<em>놓치기 쉬워요</em>'] }],
    update(t) {
      lightRoot(L);
      L.cam.setAttribute('transform', `translate(270 480) scale(1.08) translate(-270 -560)`);
      o.tick(t + 3.4, 3); o.person.draw(t, 1, 0); o.person.glow.setAttribute('opacity', '0.35');
      grow(99);
      wins.forEach((w) => {
        const k = pop((t - w.at) / 0.3), sh = Math.sin(t * 30 + w.x) * 1.2;
        w.g.setAttribute('transform', `translate(${f(w.x + sh)} ${f(w.y)}) rotate(${f(w.r)}) scale(${f(Math.max(0, k))})`);
      });
    },
  };
}

// ------------------------------------------------------------------ 3 reveal
export function bzReveal(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  solidBg(L.back, NAVY);
  const rays = P(L.ink, '', SP * 1.4);
  rays.setAttribute('stroke', GREEN);
  const crisp = crispLayer(L);
  const ph = phone(L.ink, crisp, 270, 590, 250);
  const splash = G(ph.content);
  el('rect', { x: -ph.sw / 2, y: -ph.sh / 2, width: ph.sw, height: ph.sh, fill: '#ffffff' }, splash);
  const icon = el('image', { href: '/biz/icon.png', x: -70, y: -105, width: 140, height: 140 }, splash);
  const nm = el('text', { ...TXT, x: 0, y: 58, 'font-size': 24, 'font-weight': 900, fill: NAVY }, splash);
  nm.textContent = '기업정책지원사업';
  const tg = el('text', { ...TXT, x: 0, y: 88, 'font-size': 14, 'font-weight': 700, fill: '#1f8f6a' }, splash);
  tg.textContent = '우리 회사에 맞는 지원사업 찾기';
  const home = ph.add('s1', '/biz/s1.png');
  ph.content.appendChild(splash);
  const dur = 3.5;
  return {
    root: L.root, dur, tau: [0.92, 0.92], title: { han: '', name: '' },
    caps: [{ at: 0.35, pos: 'top', lines: ['앱 설치 없이 토스에서 바로', '<em>기업정책지원사업</em>'] }],
    update(t) {
      darkRoot(L);
      const up = easeInOut(clamp((t - 0.05) / 0.8, 0, 1));
      ph.at(270, lerp(1250, 600, up), 1, lerp(8, 0, up));
      icon.setAttribute('transform', `translate(0 -35) scale(${f(Math.max(0, pop((t - 0.7) / 0.45)))}) translate(0 35)`);
      nm.setAttribute('opacity', f(ease((t - 1.0) / 0.3))); tg.setAttribute('opacity', f(ease((t - 1.2) / 0.3)));
      const sw = ease((t - 2.3) / 0.45);
      splash.setAttribute('opacity', f(1 - sw)); home.setAttribute('opacity', f(sw));
      const b = clamp((t - 0.75) / 0.9, 0, 1), r0 = 250 + b * 40, r1 = r0 + 30 * Math.sin(b * Math.PI);
      rays.setAttribute('d', b <= 0 || b >= 1 ? '' : Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2; return `M${f(270 + Math.cos(a) * r0)} ${f(600 + Math.sin(a) * r0 * 1.2)} L${f(270 + Math.cos(a) * r1)} ${f(600 + Math.sin(a) * r1 * 1.2)}`; }).join(' '));
      rays.setAttribute('opacity', f(1 - b));
    },
  };
}

function lightStage(L: ReturnType<typeof layers>) {
  solidBg(L.back, PAPERC);
  const deco = G(L.ink, { opacity: 0.22 });
  // a faint skyline of office blocks along the bottom
  let x = -20;
  while (x < W + 20) { const w = srnd(40, 70), h = srnd(60, 150); S(deco, brect(x, 940 - h, x + w, 940, 0.4), SP); for (let y = 940 - h + 12; y < 930; y += 18) P(deco, `M${x + 8} ${y} l${w - 16} 0`, SP * 0.5); x += w + 6; }
}
function chip(g: Element, text: string) {
  const n = G(g);
  const w = 26 * text.length + 34;
  el('rect', { x: -w / 2, y: -24, width: w, height: 48, rx: 24, fill: GREEN, stroke: 'currentColor', 'stroke-width': SP * 1.2 }, n);
  el('text', { ...TXT, x: 0, y: 1, 'font-size': 23, 'font-weight': 900, fill: NAVY }, n).textContent = text;
  return n;
}

// ------------------------------------------------------------------ 4 set conditions
export function bzFilter(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  lightStage(L);
  const crisp = crispLayer(L);
  const ph = phone(L.ink, crisp, 270, 600, 250);
  const s1 = ph.add('s1', '/biz/s1.png'); s1.setAttribute('opacity', 1);
  const s2 = ph.add('s2', '/biz/s2.png');
  const t1 = tap(ph.overlay, GREEN), t2 = tap(ph.overlay, GREEN);
  const chips = [['지역', 76, 430], ['업종', 466, 470], ['규모', 70, 640], ['관심분야', 448, 700]].map(([w, x, y], i) => ({ g: chip(crisp, w as string), x: x as number, y: y as number, at: 1.2 + i * 0.2 }));
  const dur = 4.1;
  return {
    root: L.root, dur, tau: [0.5, 0.5], title: { han: '', name: '' },
    caps: [{ at: 0.35, pos: 'top', lines: ['지역·업종·규모만 정하면', '<em>맞는 공고만 쏙</em>'] }],
    update(t) {
      lightRoot(L);
      ph.at(270, 610 + Math.sin(t * 1.3) * 4, 1);
      const sw = ease((t - 1.0) / 0.35);
      s2.setAttribute('opacity', f(sw)); s1.setAttribute('opacity', f(1 - sw));
      const a = ph.pt(0.5, 0.725), b = ph.pt(0.5, 0.745);
      t1(a[0], a[1], t - 0.55); t2(b[0], b[1], t - 3.0);
      chips.forEach((c) => {
        const k = pop((t - c.at) / 0.4), m = Math.min(1, Math.max(0, k));
        c.g.setAttribute('transform', `translate(${f(lerp(270, c.x, m))} ${f(lerp(600, c.y, m) + Math.sin(t * 2 + c.x) * 3)}) scale(${f(Math.max(0, k))})`);
      });
    },
  };
}

/** line-art envelope and PDF sheet */
function envelope(g: Element) {
  const n = G(g);
  S(n, brect(-30, -20, 30, 20, 0.5), SP * 1.3).setAttribute('fill', '#e8fbf4');
  P(n, 'M-30 -20 L0 4 L30 -20', SP * 1.2);
  return n;
}
function pdf(g: Element) {
  const n = G(g);
  S(n, 'M-22 -30 L12 -30 L24 -18 L24 30 L-22 30Z', SP * 1.3).setAttribute('fill', '#ffffff');
  P(n, 'M12 -30 L12 -18 L24 -18', SP);
  el('rect', { x: -16, y: -4, width: 34, height: 16, rx: 3, fill: '#e5484d' }, n);
  el('text', { ...TXT, x: 1, y: 4, 'font-size': 11, 'font-weight': 900, fill: '#ffffff' }, n).textContent = 'PDF';
  return n;
}

// ------------------------------------------------------------------ 5 matched list, save, export
export function bzSave(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  lightStage(L);
  const crisp = crispLayer(L);
  const ph = phone(L.ink, crisp, 270, 600, 250);
  const s5 = ph.add('s5', '/biz/s5.png'); s5.setAttribute('opacity', 1);
  const s4 = ph.add('s4', '/biz/s4.png');
  const tp = tap(ph.overlay, GREEN);
  const saved = el('text', { ...TXT, x: 0, y: 0, 'font-size': 18, 'font-weight': 900, fill: NAVY, opacity: 0 }, ph.overlay);
  saved.textContent = '✓ 저장됨';
  const env = envelope(crisp), doc = pdf(crisp);
  const dur = 4.4;
  return {
    root: L.root, dur, tau: [0.5, 0.5], title: { han: '', name: '' },
    caps: [{ at: 0.35, pos: 'top', lines: ['관심사업은 저장하고', '<em>메일·PDF로 정리까지</em>'] }],
    update(t) {
      lightRoot(L);
      ph.at(270, 610 + Math.sin(t * 1.3) * 4, 1);
      const a = ph.pt(0.80, 0.645);
      tp(a[0], a[1], t - 0.8);
      const sk = ease((t - 0.95) / 0.2) * (1 - ease((t - 1.9) / 0.3));
      saved.setAttribute('x', f(a[0])); saved.setAttribute('y', f(a[1] - 34 - sk * 6)); saved.setAttribute('opacity', f(sk));
      const sw = ease((t - 1.8) / 0.4);
      s4.setAttribute('opacity', f(sw)); s5.setAttribute('opacity', f(1 - sw));
      // mail and PDF fly out of the phone to either side
      const fly = (n: SVGGElement, at: number, x: number, y: number) => {
        const k = pop((t - at) / 0.45), m = Math.min(1, Math.max(0, k));
        n.setAttribute('transform', `translate(${f(lerp(270, x, m))} ${f(lerp(640, y, m) + Math.sin(t * 2.2 + x) * 4)}) rotate(${f(lerp(0, x < 270 ? -10 : 10, m))}) scale(${f(Math.max(0, k) * 1.4)})`);
      };
      fly(env, 2.5, 78, 500); fly(doc, 2.8, 462, 560);
    },
  };
}

// ------------------------------------------------------------------ 6 CTA
export function bzCta(svg: SVGSVGElement, filter: string): Scene {
  reseed(406);
  const L = layers(svg, filter);
  solidBg(L.back, NAVY);
  const sky = G(L.ink, { opacity: 0.35 });
  let x = -20;
  while (x < W + 20) { const w = srnd(40, 70), h = srnd(80, 220); S(sky, brect(x, 960 - h, x + w, 960, 0.4), SP); for (let y = 960 - h + 14; y < 950; y += 20) for (let xx = x + 8; xx < x + w - 10; xx += 14) P(sky, `M${xx} ${y} l6 0`, SP * 1.2); x += w + 6; }
  const crisp = crispLayer(L);
  el('rect', { x: 270 - 90, y: 430 - 90, width: 180, height: 180, rx: 40, fill: '#ffffff' }, crisp).setAttribute('id', 'bz-icon-bg');
  const iconBg = crisp.lastElementChild as SVGRectElement;
  const icon = el('image', { href: '/biz/icon.png', x: -80, y: -80, width: 160, height: 160 }, crisp);
  const pill = G(crisp);
  el('rect', { x: -235, y: -36, width: 470, height: 72, rx: 36, fill: GREEN }, pill);
  el('text', { ...TXT, x: 0, y: 2, 'font-size': 25, 'font-weight': 900, fill: NAVY }, pill).textContent = '토스에서 ‘기업정책지원사업’ 검색';
  const hint = el('text', { ...TXT, x: 270, y: 690, 'font-size': 18, 'font-weight': 700, fill: '#c9d6e6' }, crisp);
  hint.textContent = '앱 설치 없이 토스에서 바로 · 민간 서비스';
  const dur = 5.0;
  return {
    root: L.root, dur, tau: [0.92, 0.92], title: { han: '', name: '' },
    caps: [{ at: 0.1, pos: 'top', lines: ['<b class="big">기업정책지원사업</b>'], sub: '우리 회사에 맞는 지원사업 찾기' }],
    update(t) {
      darkRoot(L);
      const ip = Math.max(0, pop((t - 0.2) / 0.5));
      const by = 430 + Math.sin(t * 1.6) * 3;
      icon.setAttribute('transform', `translate(270 ${f(by)}) scale(${f(ip)})`);
      iconBg.setAttribute('transform', `translate(270 ${f(by)}) scale(${f(ip)}) translate(-270 -430)`);
      const pp = pop((t - 0.9) / 0.45), pulse = t > 1.6 ? 1 + Math.max(0, Math.sin((t - 1.6) * 4)) * 0.03 : 1;
      pill.setAttribute('transform', `translate(270 610) scale(${f(Math.max(0, pp) * pulse)})`);
      hint.setAttribute('opacity', f(ease((t - 1.3) / 0.4)));
    },
  };
}
