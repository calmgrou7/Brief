import type { Answer, Tier, User } from '../types';

/* ───────── 레벨 · XP ─────────
 * 레벨 L에 도달하는 데 필요한 누적 XP = 25·L·(L−1)
 * Lv2 = 50, Lv5 = 500, Lv10 = 2,250, Lv20 = 9,500 */
export const xpForLevel = (level: number) => 25 * level * (level - 1);

export function levelFromXp(xp: number): number {
  // 25L² − 25L − xp ≤ 0 를 만족하는 가장 큰 정수 L
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * xp) / 25)) / 2));
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, current: xp - base, needed: next - base, ratio: (xp - base) / (next - base) };
}

export const TIER_XP: Record<Tier, number> = { middle: 10, high: 20, undergrad: 35, grad: 55, research: 80 };
export const TIER_BASE_RATING: Record<Tier, number> = { middle: 900, high: 1150, undergrad: 1450, grad: 1750, research: 2050 };

/** 출제 권한이 열리는 레벨 */
export const COMPOSER_LEVEL = 10;
/** '수학연구원' 승급에 필요한 승인 문제 수 */
export const RESEARCHER_APPROVALS = 3;
/** 커뮤니티 문제 승인에 필요한 순 찬성표 (로컬 모드 1 / 운영 권장 3) */
export const REVIEW_THRESHOLD = 1;

export type RankKey = 'novice' | 'explorer' | 'composer' | 'prover' | 'scholar';
export function rankOf(level: number): RankKey {
  if (level >= 20) return 'scholar';
  if (level >= 15) return 'prover';
  if (level >= COMPOSER_LEVEL) return 'composer';
  if (level >= 5) return 'explorer';
  return 'novice';
}

/** 연구원 트랙: 레벨과 별도로 '승인된 출제 수'로 결정 */
export type ResearcherKey = 'none' | 'researcher' | 'senior' | 'fellow';
export function researcherOf(user: Pick<User, 'approvedCount' | 'xp'>): ResearcherKey {
  if (levelFromXp(user.xp) < COMPOSER_LEVEL) return 'none';
  if (user.approvedCount >= 25) return 'fellow';
  if (user.approvedCount >= 10) return 'senior';
  if (user.approvedCount >= RESEARCHER_APPROVALS) return 'researcher';
  return 'none';
}

/* ───────── Elo ───────── */
export const expected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));
export function eloDelta(rating: number, opponent: number, score: 0 | 0.5 | 1, k = 24) {
  return Math.round(k * (score - expected(rating, opponent)));
}

/* ───────── 채점 ───────── */
export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/\s+/g, '').replace(/,/g, '').replace(/−/g, '-');
  if (!s) return null;
  const frac = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (frac) {
    const d = Number(frac[2]);
    return d === 0 ? null : Number(frac[1]) / d;
  }
  return /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(s) ? Number(s) : null;
}

export const normalizeShort = (s: string) =>
  s.toLowerCase().replace(/\s+/g, '').replace(/[\\{}$]/g, '').replace(/×/g, 'x');

export function grade(answer: Answer, input: string | number): boolean {
  switch (answer.kind) {
    case 'choice':
      return Number(input) === answer.correct;
    case 'numeric': {
      const n = typeof input === 'number' ? input : parseNumber(input);
      if (n === null || Number.isNaN(n)) return false;
      const tol = answer.tolerance ?? 1e-9;
      return Math.abs(n - answer.value) <= Math.max(tol, Math.abs(answer.value) * 1e-12);
    }
    case 'short':
      return answer.accepted.some((a) => normalizeShort(a) === normalizeShort(String(input)));
  }
}

/* ───────── 연속 학습(스트릭) ───────── */
export const dayKey = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
export function nextStreak(streak: User['streak'], now = Date.now()): User['streak'] {
  const today = dayKey(now);
  if (streak.lastDay === today) return streak;
  const yesterday = dayKey(now - 86_400_000);
  return { count: streak.lastDay === yesterday ? streak.count + 1 : 1, lastDay: today };
}
/** 스트릭 보너스: 3일+ 10%, 7일+ 25% */
export const streakMultiplier = (count: number) => (count >= 7 ? 1.25 : count >= 3 ? 1.1 : 1);

/* ───────── 결정적 난수(시드) ───────── */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
