import { describe, expect, it } from 'vitest';
import { eloDelta, grade, levelFromXp, nextStreak, parseNumber, researcherOf, xpForLevel } from './game';
import { PROBLEMS } from '../data/problems';

describe('levels', () => {
  it('round-trips level thresholds', () => {
    for (let l = 1; l < 40; l++) {
      expect(levelFromXp(xpForLevel(l))).toBe(l);
      if (l > 1) expect(levelFromXp(xpForLevel(l) - 1)).toBe(l - 1);
    }
  });
});

describe('grading', () => {
  it('parses fractions and decimals', () => {
    expect(parseNumber('-1/12')).toBeCloseTo(-1 / 12);
    expect(parseNumber('1,000')).toBe(1000);
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('1/0')).toBeNull();
  });
  it('grades each answer kind', () => {
    expect(grade({ kind: 'numeric', value: -1 / 12, tolerance: 1e-6 }, '-1/12')).toBe(true);
    expect(grade({ kind: 'numeric', value: 18 }, '17')).toBe(false);
    expect(grade({ kind: 'choice', options: [], correct: 2 }, 2)).toBe(true);
    expect(grade({ kind: 'short', accepted: ['Z x Z'] }, 'z×z')).toBe(true);
  });
});

describe('elo & streak', () => {
  it('is zero-sum-ish and bounded', () => {
    expect(eloDelta(1500, 1500, 1)).toBe(12);
    expect(eloDelta(1500, 1500, 0)).toBe(-12);
  });
  it('extends streak only on consecutive days', () => {
    const d = Date.UTC(2026, 0, 2);
    expect(nextStreak({ count: 4, lastDay: '2026-01-01' }, d).count).toBe(5);
    expect(nextStreak({ count: 4, lastDay: '2025-12-30' }, d).count).toBe(1);
  });
  it('researcher track needs level and approvals', () => {
    expect(researcherOf({ xp: 0, approvedCount: 50 })).toBe('none');
    expect(researcherOf({ xp: xpForLevel(10), approvedCount: 3 })).toBe('researcher');
  });
});

describe('problem bank', () => {
  it('has unique ids and self-consistent answers', () => {
    const ids = new Set(PROBLEMS.map((p) => p.id));
    expect(ids.size).toBe(PROBLEMS.length);
    for (const p of PROBLEMS) {
      expect(p.statement.ko && p.statement.en && p.explanation.ko && p.explanation.en).toBeTruthy();
      if (p.answer.kind === 'choice') {
        expect(p.answer.correct).toBeLessThan(p.answer.options.length);
        expect(grade(p.answer, p.answer.correct)).toBe(true);
      }
      if (p.answer.kind === 'numeric') expect(grade(p.answer, String(p.answer.value))).toBe(true);
    }
  });
});
