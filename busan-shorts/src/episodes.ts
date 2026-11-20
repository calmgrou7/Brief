// Episodes: which scenes play, the brand chip, and the outro. Pick one with ?ep=<id>.
import type { Scene } from './scene.ts';
import { gamcheon } from './scenes/gamcheon.ts';
import { jagalchi } from './scenes/jagalchi.ts';
import { yeongdo } from './scenes/yeongdo.ts';
import { haeundae } from './scenes/haeundae.ts';
import { gwangan } from './scenes/gwangan.ts';
import { gcView } from './scenes/gc/view.ts';
import { gcStairs } from './scenes/gc/stairs.ts';
import { gcFish } from './scenes/gc/fish.ts';
import { gcRoof } from './scenes/gc/roof.ts';
import { gcNight } from './scenes/gc/night.ts';
import { mtHook, mtVs, mtReveal, mtDuel, mtGrow, mtCta } from './scenes/math/ad.ts';
import { bzHook, bzChaos, bzReveal, bzFilter, bzSave, bzCta } from './scenes/biz/ad.ts';
import { soHook, soMood, soPick, soBreathe, soRelax, soCta } from './scenes/soom/ad.ts';
import { adHook, adChaos, adReveal, adEvents, adCourse, adCta } from './scenes/nowro/ad.ts';

export type Maker = (svg: SVGSVGElement, filter: string) => Scene;
export interface Episode {
  id: string;
  out: string;
  makers: Maker[];
  chip: string;
  cta: { lines: string[]; sub?: string };
  /** production credit shown under the outro */
  credit?: { by: string; names: string };
  outro?: number;
  /** crossfade seconds between scenes */
  xf?: number;
  /** ad layout: no scene numbering */
  ad?: boolean;
  /** caption highlight colours (<em>) */
  hl?: { bg: string; ink: string };
  /** sub-caption colour (day, night) */
  accent?: [string, string];
  /** music generator in scripts/music/<name>.py, mixed in after the render */
  music?: string;
}

export const EPISODES: Record<string, Episode> = {
  busan: {
    id: 'busan', out: 'busan_lineart_shorts',
    makers: [gamcheon, jagalchi, yeongdo, haeundae, gwangan],
    chip: '<b>HERITAGE STUDIO B</b> · 부산 라인아트',
    cta: { lines: ['부산, 낮부터 밤까지', '선 하나로 걸어봤어요'], sub: '저장해두고 여행 갈 때 따라 걸어보세요' },
  },
  gamcheon: {
    id: 'gamcheon', out: 'gamcheon_lineart_shorts',
    makers: [gcView, gcStairs, gcFish, gcRoof, gcNight],
    chip: '<b>HERITAGE STUDIO B</b> × <b>NOWRO KOREA</b>',
    cta: { lines: ['감천문화마을,', '사람이 사는 미술관'], sub: '주민이 사는 마을이에요 · 조용히 걸어주세요' },
    credit: { by: 'PRODUCED BY', names: 'HERITAGE STUDIO B  ×  NOWRO KOREA' },
    outro: 3.4,
  },
  nowro: {
    id: 'nowro', out: 'nowro_busan_ad_shorts',
    makers: [adHook, adChaos, adReveal, adEvents, adCourse, adCta],
    chip: '<b>NOWRO KOREA</b> · 나우로 부산',
    cta: { lines: [] },
    outro: 0.5, xf: 0.45, ad: true,
  },
  soom: {
    id: 'soom', out: 'soomgyeol_ad_shorts',
    makers: [soHook, soMood, soPick, soBreathe, soRelax, soCta],
    chip: '<b>숨결</b> · 토스 미니앱',
    cta: { lines: [] },
    outro: 0.5, xf: 0.55, ad: true,
    hl: { bg: '#a9502f', ink: '#f7eedd' },
  },
  biz: {
    id: 'biz', out: 'bizfunding_ad_shorts',
    makers: [bzHook, bzChaos, bzReveal, bzFilter, bzSave, bzCta],
    chip: '<b>기업정책지원사업</b> · 토스 미니앱',
    cta: { lines: [] },
    outro: 0.5, xf: 0.45, ad: true,
    hl: { bg: '#00c48c', ink: '#0f2f55' },
    accent: ['#1f8f6a', '#5ee0b4'],
  },
  math: {
    id: 'math', out: 'mathgod_ad_shorts',
    makers: [mtHook, mtVs, mtReveal, mtDuel, mtGrow, mtCta],
    chip: '<b>미니 수학의신</b> · 토스 미니앱',
    cta: { lines: [] },
    outro: 0.5, xf: 0.45, ad: true,
    hl: { bg: '#d8f57a', ink: '#154438' },
    accent: ['#2f7a5c', '#d8f57a'],
    music: 'math',
  },
};
