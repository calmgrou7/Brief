import { progressiveTax, type TaxParameters } from './params';

export interface ValuationInput {
  sharesOutstanding: number;
  /** [최근 연도, 1년 전, 2년 전] 당기순이익 — 가중치 3:2:1 */
  netIncomes: [number, number, number];
  equity: number; // 순자산(자본총계)
  isRealEstateHeavy: boolean;
  isSme: boolean;
}

export interface ValuationResult {
  incomeValuePerShare: number; // 1주당 순손익가치
  netAssetValuePerShare: number; // 1주당 순자산가치
  valuePerShare: number; // 평가액(최대주주 할증 반영)
  floorApplied: boolean; // 순자산가치 80% 하한 적용 여부
  companyValue: number;
}

/**
 * 비상장주식 보충적 평가 약식(상증법 시행령 54조 구조).
 * 실제 평가는 세무상 각 사업연도 소득·자산 시가 조정이 필요하므로 상담용 추정치다.
 */
export function valueShares(v: ValuationInput, p: TaxParameters): ValuationResult {
  const shares = Math.max(1, v.sharesOutstanding);
  const [n0, n1, n2] = v.netIncomes;
  const weightedNetIncome = (n0 * 3 + n1 * 2 + n2) / 6;
  const incomeValuePerShare = Math.max(0, weightedNetIncome / shares / p.stockValuation.capitalizationRate);
  const netAssetValuePerShare = Math.max(0, v.equity / shares);
  const [wi, wa] = v.isRealEstateHeavy ? [2, 3] : [3, 2];
  const weighted = (incomeValuePerShare * wi + netAssetValuePerShare * wa) / (wi + wa);
  const floor = netAssetValuePerShare * p.stockValuation.netAssetFloorRatio;
  const floorApplied = floor > weighted;
  // 중소기업은 최대주주 할증 면제, 그 외 20% 할증
  const premium = v.isSme ? 1 : 1.2;
  const valuePerShare = Math.round(Math.max(weighted, floor) * premium);
  return {
    incomeValuePerShare: Math.round(incomeValuePerShare),
    netAssetValuePerShare: Math.round(netAssetValuePerShare),
    valuePerShare,
    floorApplied,
    companyValue: valuePerShare * shares,
  };
}

/** 성인 자녀 증여세 약식(10년 합산·과세특례 미반영, 신고세액공제 반영) */
export function estimateGiftTax(giftValue: number, p: TaxParameters): number {
  const base = Math.max(0, giftValue - p.giftTax.adultChildDeduction);
  const tax = progressiveTax(base, p.giftTax.brackets);
  return Math.round(tax * (1 - p.giftTax.filingCredit));
}
