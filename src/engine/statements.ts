import type { BalanceSheet, IncomeStatement } from './types';
import type { RatioKey } from './params';

export function totals(bs: BalanceSheet) {
  const currentAssets = bs.cash + bs.receivables + bs.inventory + bs.officerLoans + bs.otherCurrentAssets;
  const nonCurrentAssets = bs.tangibleAssets + bs.intangibleAssets + bs.otherNoncurrentAssets;
  const currentLiabilities =
    bs.payables + bs.shortTermBorrowings + bs.currentLongTermDebt + bs.officerAdvances + bs.otherCurrentLiabilities;
  const nonCurrentLiabilities = bs.longTermBorrowings + bs.retirementProvision + bs.otherNoncurrentLiabilities;
  const equity = bs.capitalStock + bs.otherEquity + bs.retainedEarnings;
  const assets = currentAssets + nonCurrentAssets;
  const liabilities = currentLiabilities + nonCurrentLiabilities;
  const borrowings = bs.shortTermBorrowings + bs.currentLongTermDebt + bs.longTermBorrowings + bs.officerAdvances;
  return {
    currentAssets,
    nonCurrentAssets,
    assets,
    currentLiabilities,
    nonCurrentLiabilities,
    liabilities,
    equity,
    borrowings,
    /** 자산 − (부채 + 자본). 0이 아니면 입력 오류 */
    imbalance: assets - liabilities - equity,
  };
}

export function profit(is: IncomeStatement) {
  const grossProfit = is.revenue - is.costOfSales;
  const operatingIncome = grossProfit - is.sga;
  const pretaxIncome = operatingIncome + is.nonOperatingIncome - is.interestExpense - is.otherNonOperatingExpense;
  const netIncome = pretaxIncome - is.incomeTax;
  return { grossProfit, operatingIncome, pretaxIncome, netIncome };
}

const div = (a: number, b: number): number | null => (b > 0 ? a / b : null);

export type Ratios = Record<RatioKey, number | null>;

/** 재무비율. 분모가 0 이하이면 null */
export function ratios(bs: BalanceSheet, is: IncomeStatement, priorRevenue?: number): Ratios {
  const t = totals(bs);
  const p = profit(is);
  return {
    debtRatio: div(t.liabilities, t.equity),
    // 가지급금은 금융기관이 회수 가능 자산으로 보지 않으므로 유동자산에서 뺀다
    currentRatio: div(t.currentAssets - bs.officerLoans, t.currentLiabilities),
    equityRatio: div(t.equity, t.assets),
    borrowingDependence: div(t.borrowings, t.assets),
    capitalImpairment: bs.capitalStock > 0 ? Math.max(0, (bs.capitalStock - t.equity) / bs.capitalStock) : null,
    operatingMargin: div(p.operatingIncome, is.revenue),
    netMargin: div(p.netIncome, is.revenue),
    interestCoverage: div(p.operatingIncome, is.interestExpense),
    revenueGrowth: priorRevenue ? div(is.revenue - priorRevenue, priorRevenue) : null,
    officerLoanShare: div(bs.officerLoans, t.assets),
  };
}

export const emptyBalanceSheet = (): BalanceSheet => ({
  cash: 0,
  receivables: 0,
  inventory: 0,
  officerLoans: 0,
  otherCurrentAssets: 0,
  tangibleAssets: 0,
  intangibleAssets: 0,
  otherNoncurrentAssets: 0,
  payables: 0,
  shortTermBorrowings: 0,
  currentLongTermDebt: 0,
  officerAdvances: 0,
  otherCurrentLiabilities: 0,
  longTermBorrowings: 0,
  retirementProvision: 0,
  otherNoncurrentLiabilities: 0,
  capitalStock: 0,
  otherEquity: 0,
  retainedEarnings: 0,
});

export const emptyIncomeStatement = (): IncomeStatement => ({
  revenue: 0,
  costOfSales: 0,
  sga: 0,
  depreciation: 0,
  nonOperatingIncome: 0,
  interestExpense: 0,
  otherNonOperatingExpense: 0,
  incomeTax: 0,
});
