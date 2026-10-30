import { estimateCorporateTax, type TaxParameters } from './params';
import { profit } from './statements';
import type { Statements } from './types';

export type LoanTerm = 'short' | 'long';
export type LoanTiming = 'thisYear' | 'nextYear';
export type OfficerLoanMethod = 'repay' | 'bonus' | 'dividend';

/** 연말 결산 전 실행할 수 있는 조치(레버). 금액은 원, 비율은 소수 */
export interface ScenarioLevers {
  revenueAdd: number; // 추가 매출
  revenueCostRatio: number; // 추가 매출의 원가율 (원가는 외상 매입)
  revenueCashRatio: number; // 추가 매출 중 연내 현금 회수 비율
  expenseAdd: number; // 추가 비용(판관비, 현금 지출)
  inventoryAdd: number; // 재고 매입(외상) — 손익 영향 없음
  loanAmount: number;
  loanTerm: LoanTerm;
  loanTiming: LoanTiming;
  loanRate: number;
  repayAmount: number; // 대출 상환(단기 → 유동성장기 → 장기 순)
  capitalIncrease: number; // 유상증자
  capitalReduction: number; // 감자
  capitalReductionPaid: boolean; // true: 유상감자, false: 무상감자(결손 보전)
  officerLoanSettle: number; // 가지급금 정리 금액
  officerLoanMethod: OfficerLoanMethod;
  sharesToTransfer: number; // 자녀 증여 주식수(재무제표 영향 없음, 주식가치·증여세로 연결)
}

export const emptyLevers = (): ScenarioLevers => ({
  revenueAdd: 0,
  revenueCostRatio: 0,
  revenueCashRatio: 0.5,
  expenseAdd: 0,
  inventoryAdd: 0,
  loanAmount: 0,
  loanTerm: 'long',
  loanTiming: 'thisYear',
  loanRate: 0.05,
  repayAmount: 0,
  capitalIncrease: 0,
  capitalReduction: 0,
  capitalReductionPaid: false,
  officerLoanSettle: 0,
  officerLoanMethod: 'repay',
  sharesToTransfer: 0,
});

export interface ScenarioResult extends Statements {
  /** 내년 연간 이자 부담 증가액(신규 대출 기준) */
  nextYearInterest: number;
  /** 내년으로 미룬 조치 */
  deferred: string[];
  warnings: string[];
}

/**
 * 연말 예상 재무제표에 레버를 적용한다. 각 레버는 차변·대변을 함께 움직이고,
 * 마지막에 세전이익 변화에 맞춰 법인세를 다시 계산한다(자산 = 부채 + 자본 유지).
 */
export function applyScenario(
  base: Statements,
  lv: ScenarioLevers,
  params: TaxParameters,
  monthsElapsed: number,
  bookTax = true,
): ScenarioResult {
  const basePretax = profit(base.is).pretaxIncome;
  const bs = { ...base.bs };
  const is = { ...base.is };
  const warnings: string[] = [];
  const deferred: string[] = [];
  // 세전이익이 바뀌는 거래는 이익잉여금에 바로 반영하고, 법인세는 마지막에 재계산
  const pretaxChange = (amount: number) => {
    bs.retainedEarnings += amount;
  };

  if (lv.revenueAdd > 0) {
    const cost = Math.round(lv.revenueAdd * lv.revenueCostRatio);
    const cashIn = Math.round(lv.revenueAdd * lv.revenueCashRatio);
    is.revenue += lv.revenueAdd;
    is.costOfSales += cost;
    bs.cash += cashIn;
    bs.receivables += lv.revenueAdd - cashIn;
    bs.payables += cost;
    pretaxChange(lv.revenueAdd - cost);
  }

  if (lv.expenseAdd > 0) {
    is.sga += lv.expenseAdd;
    bs.cash -= lv.expenseAdd;
    pretaxChange(-lv.expenseAdd);
  }

  if (lv.inventoryAdd > 0) {
    bs.inventory += lv.inventoryAdd;
    bs.payables += lv.inventoryAdd;
  }

  let nextYearInterest = 0;
  if (lv.loanAmount > 0) {
    nextYearInterest = Math.round(lv.loanAmount * lv.loanRate);
    if (lv.loanTiming === 'thisYear') {
      const interest = Math.round((lv.loanAmount * lv.loanRate * Math.max(0, 12 - monthsElapsed)) / 12);
      bs.cash += lv.loanAmount - interest;
      if (lv.loanTerm === 'short') bs.shortTermBorrowings += lv.loanAmount;
      else bs.longTermBorrowings += lv.loanAmount;
      is.interestExpense += interest;
      pretaxChange(-interest);
    } else {
      deferred.push(`신규 대출 ${Math.round(lv.loanAmount / 1e6).toLocaleString('ko-KR')}백만원은 내년 실행 — 올해 재무비율에 반영하지 않음`);
    }
  }

  if (lv.repayAmount > 0) {
    let left = lv.repayAmount;
    for (const k of ['shortTermBorrowings', 'currentLongTermDebt', 'longTermBorrowings'] as const) {
      const pay = Math.min(left, bs[k]);
      bs[k] -= pay;
      left -= pay;
    }
    if (left > 0) warnings.push('상환 금액이 차입금 잔액보다 큽니다 — 잔액만큼만 반영했습니다.');
    bs.cash -= lv.repayAmount - left;
  }

  if (lv.capitalIncrease > 0) {
    bs.cash += lv.capitalIncrease;
    bs.capitalStock += lv.capitalIncrease;
  }

  if (lv.capitalReduction > 0) {
    const amount = Math.min(lv.capitalReduction, bs.capitalStock);
    bs.capitalStock -= amount;
    if (lv.capitalReductionPaid) {
      bs.cash -= amount;
      warnings.push('유상감자는 주주에게 의제배당 과세가 생길 수 있습니다 — 세무사 확인 필요.');
    } else {
      // 무상감자: 결손금 보전, 남는 금액은 감자차익(자본잉여금)
      const offset = Math.min(amount, Math.max(0, -bs.retainedEarnings));
      bs.retainedEarnings += offset;
      bs.otherEquity += amount - offset;
      if (offset === 0) warnings.push('결손금이 없어 무상감자로 자본총계가 개선되지 않습니다.');
    }
  }

  if (lv.officerLoanSettle > 0) {
    const amount = Math.min(lv.officerLoanSettle, bs.officerLoans);
    if (amount < lv.officerLoanSettle) warnings.push('정리 금액이 가지급금 잔액보다 큽니다 — 잔액만큼만 반영했습니다.');
    bs.officerLoans -= amount;
    if (lv.officerLoanMethod === 'repay') {
      bs.cash += amount;
    } else if (lv.officerLoanMethod === 'bonus') {
      is.sga += amount;
      pretaxChange(-amount);
      warnings.push('상여로 정리하면 대표 근로소득세가 생기고, 정관·주총 보수 한도 안이어야 비용 인정됩니다.');
    } else {
      bs.retainedEarnings -= amount;
      warnings.push('배당으로 정리하면 대표 배당소득세가 생기고, 배당가능이익 범위 안이어야 합니다.');
    }
  }

  // 세전이익 변화분만큼 법인세를 더하거나 뺀다(확정 결산의 신고 세액은 그대로 두고 차이만 반영)
  const taxDelta = bookTax ? estimateCorporateTax(profit(is).pretaxIncome, params) - estimateCorporateTax(basePretax, params) : 0;
  is.incomeTax += taxDelta;
  bs.otherCurrentLiabilities += taxDelta;
  bs.retainedEarnings -= taxDelta;

  if (bs.cash < 0) warnings.push('연말 현금이 마이너스입니다 — 자금 조달 계획이 필요합니다.');
  return { bs, is, nextYearInterest, deferred, warnings };
}
