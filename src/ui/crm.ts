import { analyze, emptyLevers, totals, verdict, type BalanceSheet, type Grade, type IncomeStatement } from '../engine';

// 고객 관리: 상담 단계·일정·기록, 연도별 재무제표 보관

export const STAGES = ['첫 면담', '자료 수령', '진단 완료', '제안', '실행 관리', '연간 관리'] as const;
export type Stage = (typeof STAGES)[number];

export interface Memo {
  date: string; // YYYY-MM-DD
  text: string;
}

export interface Crm {
  stage: Stage;
  nextDate: string; // '' = 미정
  nextAction: string;
  memos: Memo[];
}

/** 보관한 재무제표(확정 결산 또는 가결산) */
export interface Snapshot {
  label: string; // 예: '2026 가결산'
  date: string; // 재무상태표 기준일
  bs: BalanceSheet;
  is: IncomeStatement;
  savedAt: string;
}

export const emptyCrm = (): Crm => ({ stage: '첫 면담', nextDate: '', nextAction: '', memos: [] });

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 연간 관리 일정: 3월 확정 결산 점검, 10월 가결산, 12월 결산 전 실행 확인 중 오늘 이후 가장 가까운 것 */
export function nextMilestone(today: string): { date: string; action: string } {
  const y = Number(today.slice(0, 4));
  const candidates = [y, y + 1].flatMap((yr) => [
    { date: `${yr}-03-31`, action: `${yr - 1} 확정 결산 점검` },
    { date: `${yr}-10-15`, action: `${yr} 가결산 진단` },
    { date: `${yr}-12-10`, action: `${yr} 결산 전 실행 확인` },
  ]);
  return candidates.find((c) => c.date >= today)!;
}

export type Due = 'overdue' | 'thisMonth' | 'later' | 'none';
export function dueState(nextDate: string, today: string): Due {
  if (!nextDate) return 'none';
  if (nextDate < today) return 'overdue';
  if (nextDate.slice(0, 7) === today.slice(0, 7)) return 'thisMonth';
  return 'later';
}

/** 대시보드 한 줄 요약. 재무제표가 비어 있으면 진단 전으로 본다 */
export function clientSummary(c: {
  company: Parameters<typeof analyze>[1];
  statements: Parameters<typeof analyze>[0];
  projection: Parameters<typeof analyze>[2];
}) {
  const hasData = totals(c.statements.current.bs).assets > 0 && c.statements.current.is.revenue > 0;
  if (!hasData) return { hasData, grade: null as Grade | null, bad: 0, caution: 0, debtRatio: null as number | null, officerLoanShare: null as number | null };
  const a = analyze(c.statements, c.company, c.projection, emptyLevers());
  const ratio = (k: string) => a.rows.find((r) => r.key === k)?.projected ?? null;
  const t = totals(a.projected.bs);
  return {
    hasData,
    grade: verdict(a.rows, 'projected').grade as Grade | null,
    bad: a.rows.filter((r) => r.projectedSignal === 'bad').length,
    caution: a.rows.filter((r) => r.projectedSignal === 'caution').length,
    debtRatio: ratio('debtRatio') ?? (t.equity > 0 ? t.liabilities / t.equity : null),
    officerLoanShare: t.assets > 0 ? a.projected.bs.officerLoans / t.assets : null,
  };
}
