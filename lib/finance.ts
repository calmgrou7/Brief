import type { Contract } from "./types";

/** 계약 조건에 따른 대행 수수료 (원) */
export function agencyFee(contract: Contract, spend: number): number {
  const pct = Math.round((spend * (contract.feePercent ?? 0)) / 100);
  switch (contract.feeModel) {
    case "percent":
      return pct;
    case "fixed":
      return contract.feeFixed ?? 0;
    case "hybrid":
      return Math.max(contract.minFee ?? 0, pct);
  }
}

/** 지금까지의 일평균 소진 속도로 계산한 월말 예상 소진액 */
export function projectMonthEnd(spendToDate: number, daysElapsed: number, daysInMonth: number): number {
  if (daysElapsed <= 0) return 0;
  return Math.round((spendToDate / daysElapsed) * daysInMonth);
}

export type Pace = "under" | "on" | "over";

export function budgetPace(projected: number, budget: number, lowPct = 90, highPct = 110): Pace {
  if (budget <= 0) return "on";
  const pct = (projected / budget) * 100;
  if (pct > highPct) return "over";
  if (pct < lowPct) return "under";
  return "on";
}

export function describeContract(c: Contract): string {
  switch (c.feeModel) {
    case "percent":
      return `광고비의 ${c.feePercent}%`;
    case "fixed":
      return `월 정액 ${(c.feeFixed ?? 0).toLocaleString("ko-KR")}원`;
    case "hybrid":
      return `광고비의 ${c.feePercent}% (최소 ${(c.minFee ?? 0).toLocaleString("ko-KR")}원)`;
  }
}
