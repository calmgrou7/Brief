import { profit } from './statements';
import type { BalanceSheet, IncomeStatement } from './types';

export interface CashFlowLine {
  label: string;
  amount: number;
}

export interface CashFlowEstimate {
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
  lines: { operating: CashFlowLine[]; investing: CashFlowLine[]; financing: CashFlowLine[] };
  /** 현금을 가장 많이 묶은 항목(큰 순) — 대표 설명용 */
  topUses: CashFlowLine[];
}

/**
 * 간접법 추정 현금흐름표: 전기말 재무상태표 → 가결산 재무상태표 변동 + 누적 손익.
 * 회계사무실 현금흐름표 없이도 "이익은 났는데 돈이 어디로 갔는지"를 보여준다.
 * 합계는 현금 증감과 정확히 일치하고, 구분(영업/투자/재무)은 추정이다.
 */
export function estimateCashFlow(opening: BalanceSheet, closing: BalanceSheet, is: IncomeStatement): CashFlowEstimate {
  const d = (k: keyof BalanceSheet) => closing[k] - opening[k];
  const netIncome = profit(is).netIncome;

  const operating: CashFlowLine[] = [
    { label: '당기순이익(누적)', amount: netIncome },
    { label: '감가상각비', amount: is.depreciation },
    { label: '매출채권 증감', amount: -d('receivables') },
    { label: '재고자산 증감', amount: -d('inventory') },
    { label: '기타 유동자산 증감', amount: -d('otherCurrentAssets') },
    { label: '매입채무 증감', amount: d('payables') },
    { label: '기타 유동부채 증감', amount: d('otherCurrentLiabilities') },
    { label: '퇴직급여충당부채 증감', amount: d('retirementProvision') },
  ];
  const investing: CashFlowLine[] = [
    { label: '유·무형자산 취득(순)', amount: -(d('tangibleAssets') + d('intangibleAssets') + is.depreciation) },
    { label: '기타 비유동자산 증감', amount: -d('otherNoncurrentAssets') },
    { label: '가지급금 증감', amount: -d('officerLoans') },
  ];
  const financing: CashFlowLine[] = [
    {
      label: '차입금 증감',
      amount: d('shortTermBorrowings') + d('currentLongTermDebt') + d('longTermBorrowings'),
    },
    { label: '가수금 증감', amount: d('officerAdvances') },
    { label: '기타 비유동부채 증감', amount: d('otherNoncurrentLiabilities') },
    { label: '증자·감자 등 자본 변동', amount: d('capitalStock') + d('otherEquity') },
    { label: '배당 등 잉여금 변동', amount: d('retainedEarnings') - netIncome },
  ];
  const sum = (ls: CashFlowLine[]) => ls.reduce((s, l) => s + l.amount, 0);
  const all = [...operating.slice(2), ...investing, ...financing];
  return {
    operating: sum(operating),
    investing: sum(investing),
    financing: sum(financing),
    netChange: sum(operating) + sum(investing) + sum(financing),
    lines: { operating, investing, financing },
    topUses: all
      .filter((l) => l.amount < 0)
      .sort((a, b) => a.amount - b.amount)
      .slice(0, 3),
  };
}
