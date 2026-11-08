import type { Problem, User } from '../types';
import { TIER_XP, eloDelta, nextStreak, streakMultiplier } from './game';
import { listCommunity, updateUser } from './store';

export interface AttemptResult { user: User; correct: boolean; xpGained: number; ratingDelta: number; firstSolve: boolean }

/**
 * 연습 문제 1회 제출 처리.
 * - 레이팅: 아직 풀지 않은 문제에만 반영 (오답 −, 첫 정답 +). 반복 풀이로 점수 파밍 불가.
 * - XP: 첫 정답에만 지급, 오답 횟수만큼 감소(최소 40%), 스트릭 보너스 적용.
 */
export function recordAttempt(userId: string, p: Problem, correct: boolean): AttemptResult | null {
  let xpGained = 0;
  let ratingDelta = 0;
  let firstSolve = false;
  const user = updateUser(userId, (u) => {
    u.totalAttempts += 1;
    if (u.solved[p.id]) {
      if (correct) u.totalCorrect += 1;
      return u;
    }
    const misses = u.misses[p.id] ?? 0;
    if (!correct) {
      u.misses[p.id] = misses + 1;
      // 같은 문제의 오답은 처음 2번만 레이팅에 반영
      if (misses < 2) ratingDelta = eloDelta(u.rating, p.rating, 0, 12);
    } else {
      firstSolve = true;
      u.totalCorrect += 1;
      u.streak = nextStreak(u.streak);
      const penalty = Math.max(0.4, 1 - 0.2 * misses);
      xpGained = Math.round(TIER_XP[p.tier] * penalty * streakMultiplier(u.streak.count));
      ratingDelta = eloDelta(u.rating, p.rating, 1, misses === 0 ? 24 : 12);
      u.solved[p.id] = { at: Date.now(), tries: misses + 1 };
      delete u.misses[p.id];
      u.xp += xpGained;
    }
    u.rating = Math.max(100, u.rating + ratingDelta);
    return u;
  });
  if (!user) return null;
  // 커뮤니티 문제를 다른 사람이 풀면 출제자에게 +5 XP
  if (firstSolve && p.authorId && p.authorId !== userId && listCommunity().some((c) => c.id === p.id)) {
    updateUser(p.authorId, (a) => ({ ...a, xp: a.xp + 5 }));
  }
  return { user, correct, xpGained, ratingDelta, firstSolve };
}

/** 풀기 전에 해설을 열면 보상이 최소치(40%)로 줄어듭니다. */
export function revealExplanation(userId: string, p: Problem): User | null {
  return updateUser(userId, (u) => {
    if (!u.solved[p.id]) u.misses[p.id] = Math.max(u.misses[p.id] ?? 0, 3);
    return u;
  });
}
