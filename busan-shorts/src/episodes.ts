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
};
