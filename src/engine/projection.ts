import { estimateCorporateTax, taxParametersFor } from './params';
import { profit } from './statements';
import type { ComparativeStatements, ProjectionInput, Statements } from './types';

/** 가결산 기준일까지 경과 개월 수 (예: 9월 30일 → 9) */
export function monthsElapsed(interimDate: string): number {
  const [y, m, d] = interimDate.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  return m - 1 + Math.min(d, daysInMonth) / daysInMonth;
}

export function fiscalYear(interimDate: string): number {
  return Number(interimDate.slice(0, 4));
}

/**
 * 가결산 누적 실적으로 연말 재무제표를 추정한다.
 * - 손익: 단순 연환산 또는 대표 예상 매출 반영(원가는 누적 원가율, 나머지 비용은 기간 비례)
 * - 법인세: 연말 세전이익 기준 추정
 * - 재무상태표: 남은 기간 이익(감가상각 가산)은 현금으로, 추가 법인세는 미지급법인세로 반영
 */
export function projectYearEnd(cs: ComparativeStatements, input: ProjectionInput): Statements {
  const m = monthsElapsed(cs.interimDate);
  const factor = m > 0 ? 12 / m : 1;
  const ytd = cs.current.is;
  const scale = (v: number) => Math.round(v * factor);

  const revenue = input.method === 'ceoForecast' ? ytd.revenue + input.remainingRevenue : scale(ytd.revenue);
  const costRatio = ytd.revenue > 0 ? ytd.costOfSales / ytd.revenue : 0;
  const is = {
    revenue,
    costOfSales: input.method === 'ceoForecast' ? Math.round(revenue * costRatio) : scale(ytd.costOfSales),
    sga: scale(ytd.sga),
    depreciation: scale(ytd.depreciation),
    nonOperatingIncome: scale(ytd.nonOperatingIncome),
    interestExpense: scale(ytd.interestExpense),
    otherNonOperatingExpense: scale(ytd.otherNonOperatingExpense),
    incomeTax: 0,
  };
  const params = taxParametersFor(fiscalYear(cs.interimDate));
  is.incomeTax = estimateCorporateTax(profit(is).pretaxIncome, params);

  const remainingPretax = profit(is).pretaxIncome - profit(ytd).pretaxIncome;
  const remainingDepreciation = is.depreciation - ytd.depreciation;
  const taxDelta = is.incomeTax - ytd.incomeTax;
  const bs = { ...cs.current.bs };
  bs.cash += remainingPretax + remainingDepreciation;
  bs.tangibleAssets -= remainingDepreciation;
  bs.otherCurrentLiabilities += taxDelta;
  bs.retainedEarnings += remainingPretax - taxDelta;
  return { bs, is };
}
