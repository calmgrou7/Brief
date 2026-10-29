import { describe, expect, it } from 'vitest';
import { sampleCompany, sampleStatements } from '../engine/sample';
import { emptyBalanceSheet, emptyIncomeStatement } from '../engine/statements';
import { clientSummary, dueState, nextMilestone } from './crm';

describe('고객 관리', () => {
  it('다음 연간 관리 일정', () => {
    expect(nextMilestone('2026-10-29')).toEqual({ date: '2026-12-10', action: '2026 결산 전 실행 확인' });
    expect(nextMilestone('2026-12-11')).toEqual({ date: '2027-03-31', action: '2026 확정 결산 점검' });
    expect(nextMilestone('2026-03-31').date).toBe('2026-03-31');
  });

  it('일정 상태', () => {
    expect(dueState('', '2026-10-29')).toBe('none');
    expect(dueState('2026-10-01', '2026-10-29')).toBe('overdue');
    expect(dueState('2026-10-30', '2026-10-29')).toBe('thisMonth');
    expect(dueState('2026-11-02', '2026-10-29')).toBe('later');
  });

  it('고객 요약: 재무제표가 없으면 진단 전', () => {
    const empty = { bs: emptyBalanceSheet(), is: emptyIncomeStatement() };
    const s = clientSummary({ company: sampleCompany, statements: { interimDate: '2026-09-30', current: empty, prior: empty }, projection: { method: 'simple', remainingRevenue: 0 } });
    expect(s.hasData).toBe(false);
    const t = clientSummary({ company: sampleCompany, statements: sampleStatements, projection: { method: 'simple', remainingRevenue: 0 } });
    expect(t.hasData).toBe(true);
    expect(t.bad).toBeGreaterThan(0);
    expect(t.officerLoanShare).toBeCloseTo(560 / 5368, 3);
  });
});

describe('백업', async () => {
  const { exportBackup, mergeBackup, sampleCase, blankCase } = await import('./store');
  it('내보낸 백업을 다시 합치면 같은 고객은 교체, 새 고객은 추가', () => {
    const a = { advisor: { name: 'a', org: '', phone: '' }, cases: [sampleCase()], activeCase: 'sample' };
    const extra = blankCase();
    const text = exportBackup({ ...a, cases: [sampleCase(), extra] });
    const r = mergeBackup(a, text);
    expect(r.replaced).toBe(1);
    expect(r.added).toBe(1);
    expect(r.state.cases).toHaveLength(2);
    expect(() => mergeBackup(a, '{"x":1}')).toThrow();
  });
});
