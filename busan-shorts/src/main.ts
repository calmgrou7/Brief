// Busan line-art shorts: five landmarks, one afternoon-to-night walk, 1080 x 1920.
//   ?debug    exact stepping via window.__step(seconds) (used by scripts/render.mjs)
//   ?capture  no preview scaling (render at exactly 1080 x 1920)
//   ?scene=3  start at a scene (preview)
import { el, inkDefs, run, f } from '../lib/ink.ts';
import { palette, rgb, type Palette } from '../lib/daynight.ts';
import { W, H, glowDefs, clamp, ease, lerp } from './kit.ts';
import type { Scene } from './scene.ts';
import { gamcheon } from './scenes/gamcheon.ts';
import { jagalchi } from './scenes/jagalchi.ts';
import { yeongdo } from './scenes/yeongdo.ts';
import { haeundae } from './scenes/haeundae.ts';
import { gwangan } from './scenes/gwangan.ts';

const q = new URLSearchParams(location.search);
if (q.has('capture')) document.body.classList.add('capture');
const frame = document.querySelector<HTMLDivElement>('#frame')!;
const fit = () => { if (!q.has('capture')) frame.style.transform = `scale(${Math.min(innerWidth / 1080, innerHeight / 1920) * 0.98})`; };
fit(); addEventListener('resize', fit);

const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '부산 명소 라인아트 애니메이션' });
const { filter } = inkDefs(svg, 'ink');
glowDefs(svg);
document.querySelector('#stage')!.appendChild(svg);

const XF = 0.7;            // crossfade seconds
const OUTRO = 2.6;         // CTA hold after the last scene's captions
const makers = [gamcheon, jagalchi, yeongdo, haeundae, gwangan];
const scenes: Scene[] = makers.map((m) => m(svg, filter));
const starts: number[] = [];
{ let acc = 0; scenes.forEach((s, i) => { starts.push(acc); acc += s.dur - (i < scenes.length - 1 ? XF : 0); }); }
const TOTAL = starts[starts.length - 1] + scenes[scenes.length - 1].dur + OUTRO;
(window as any).__total = TOTAL;
(window as any).__starts = starts;

// ---------------------------------------------------------------- HUD (captions)
const hud = document.querySelector<HTMLDivElement>('#hud')!;
const chip = document.createElement('div');
chip.className = 'chip';
chip.innerHTML = '<b>HERITAGE STUDIO B</b> · 부산 라인아트';
hud.appendChild(chip);

interface Cap { at: number; until: number; el: HTMLDivElement; spans: HTMLElement[] }
const huds = scenes.map((s, i) => {
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;inset:0;opacity:0';
  box.innerHTML = `<div class="label"><span class="han">${s.title.han}</span><span class="num">${String(i + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')}</span><h1>${s.title.name}</h1><div class="bar"></div></div>`;
  hud.appendChild(box);
  const caps: Cap[] = s.caps.map((c, k) => {
    const d = document.createElement('div');
    d.className = 'cap';
    d.innerHTML = c.lines.map((l) => `<span>${l}</span>`).join('') + (c.sub ? `<span class="sub">${c.sub}</span>` : '');
    box.appendChild(d);
    const until = k < s.caps.length - 1 ? s.caps[k + 1].at : s.dur;
    return { at: c.at, until, el: d, spans: Array.from(d.querySelectorAll('span')) };
  });
  return { box, label: box.querySelector<HTMLDivElement>('.label')!, bar: box.querySelector<HTMLDivElement>('.bar')!, caps };
});
const cta = document.createElement('div');
cta.className = 'cap cta';
cta.innerHTML = '<span>부산, 낮부터 밤까지</span><span>선 하나로 걸어봤어요</span><span class="sub">저장해두고 여행 갈 때 따라 걸어보세요</span>';
cta.style.opacity = '0';
hud.appendChild(cta);
const ctaSpans = Array.from(cta.querySelectorAll('span')) as HTMLElement[];

const reveal = (spans: HTMLElement[], t: number, out: number) => {
  spans.forEach((sp, i) => {
    const k = ease((t - i * 0.22) / 0.45) * (1 - ease((t - out) / 0.35));
    sp.style.opacity = f(k);
    sp.style.transform = `translateY(${f((1 - ease((t - i * 0.22) / 0.45)) * 26)}px)`;
  });
};

const setText = (Pl: Palette) => {
  // captions never sit in the low-contrast ink flip: dark on light, or light on dark
  const night = Pl.inkT > 0.5;
  frame.style.setProperty('--ink', night ? '#f6eedb' : '#1c1c1c');
  frame.style.setProperty('--paper', night ? 'rgba(14,18,36,.85)' : 'rgba(253,252,248,.95)');
  frame.style.setProperty('--accent', Pl.inkT > 0.5 ? '#f2b766' : '#d9772b');
};

// ---------------------------------------------------------------- loop
let T = q.has('scene') ? starts[clamp(Number(q.get('scene')) - 1, 0, scenes.length - 1)] : 0;
const live = scenes.map(() => false);
run((_t, dt) => {
  T += dt;
  if (!q.has('debug') && T > TOTAL) { T = 0; }
  let main = 0, mainOp = 0;
  scenes.forEach((s, i) => {
    const t = T - starts[i];
    const fin = i === 0 ? 1 : ease(t / XF);
    const fout = i === scenes.length - 1 ? 1 : 1 - ease((t - (s.dur - XF)) / XF);
    const op = t < 0 ? 0 : t > s.dur ? (i === scenes.length - 1 ? 1 : 0) : fin * fout;
    s.root.style.opacity = f(op);
    s.root.style.display = op > 0.001 ? '' : 'none';
    const tau = lerp(s.tau[0], s.tau[1], clamp(t / s.dur, 0, 1));
    const Pl = palette(tau);
    if (op > 0.001) {
      s.root.style.color = rgb(Pl.ink);
      s.root.style.setProperty('--paper', rgb(Pl.paper));
      s.update(Math.max(0, t), live[i] ? dt : 0, Pl, tau);
      live[i] = true;
    }
    // HUD
    const H = huds[i];
    const tin = i === 0 ? t / 0.4 : (t - XF * 0.5) / 0.35;
    const hop = t < 0 ? 0 : clamp(Math.min(ease(tin), 1 - ease((t - (s.dur - XF)) / (XF * 0.45))), 0, 1);
    const last = i === scenes.length - 1;
    H.box.style.opacity = f(last ? (t < 0 ? 0 : ease(tin)) : hop);
    H.label.style.transform = `translateY(${f((1 - ease((t - 0.1) / 0.6)) * 20)}px)`;
    H.label.style.opacity = f(ease((t - 0.1) / 0.5) * (last ? 1 - ease((t - s.dur - 0.2) / 0.5) : 1));
    H.bar.style.width = `${f(ease((t - 0.4) / 0.8) * 210)}px`;
    H.caps.forEach((c) => { c.el.style.opacity = t >= c.at - 0.01 && t < c.until + 0.4 ? '1' : '0'; reveal(c.spans, t - c.at, c.until - c.at - 0.35); });
    if (op > mainOp) { mainOp = op; main = i; }
  });
  setText(palette(lerp(scenes[main].tau[0], scenes[main].tau[1], clamp((T - starts[main]) / scenes[main].dur, 0, 1))));
  // outro CTA over the last scene
  const tl = T - (starts[scenes.length - 1] + scenes[scenes.length - 1].dur);
  cta.style.opacity = tl > 0 ? '1' : '0';
  reveal(ctaSpans, tl, 99);
  chip.style.opacity = f(1 - ease((tl - 0.2) / 0.4) * 0);
});

// caption timeline for the SRT (global seconds)
(window as any).__caps = scenes.flatMap((s, i) => s.caps.map((c, k) => ({
  a: starts[i] + c.at,
  b: starts[i] + (k < s.caps.length - 1 ? s.caps[k + 1].at : s.dur),
  text: c.lines.join('\n'),
}))).concat([{ a: starts[scenes.length - 1] + scenes[scenes.length - 1].dur, b: TOTAL, text: '부산, 낮부터 밤까지\n저장해두고 여행 갈 때 따라 걸어보세요' }]);
