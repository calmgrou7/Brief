import type { Purpose } from './types';

// 연도별 세법 파라미터. 세법이 바뀌면 이 표만 갱신한다.
// 2026: 법인세율 전 구간 1%p 인상(2026.1.1 이후 개시 사업연도부터 적용)
export interface TaxBracket {
  upTo: number; // 과세표준 상한(원), 마지막 구간은 Infinity
  rate: number;
}

export interface TaxParameters {
  year: number;
  corporateTax: TaxBracket[];
  localIncomeTaxRate: number; // 법인지방소득세 = 법인세 × 10%
  deemedInterestRate: number; // 가지급금 인정이자율(당좌대출이자율)
  giftTax: { brackets: TaxBracket[]; adultChildDeduction: number; filingCredit: number };
  stockValuation: { capitalizationRate: number; netAssetFloorRatio: number };
}

const GIFT_TAX_BRACKETS: TaxBracket[] = [
  { upTo: 100_000_000, rate: 0.1 },
  { upTo: 500_000_000, rate: 0.2 },
  { upTo: 1_000_000_000, rate: 0.3 },
  { upTo: 3_000_000_000, rate: 0.4 },
  { upTo: Infinity, rate: 0.5 },
];

export const TAX_PARAMETERS: Record<number, TaxParameters> = {
  2025: {
    year: 2025,
    corporateTax: [
      { upTo: 200_000_000, rate: 0.09 },
      { upTo: 20_000_000_000, rate: 0.19 },
      { upTo: 300_000_000_000, rate: 0.21 },
      { upTo: Infinity, rate: 0.24 },
    ],
    localIncomeTaxRate: 0.1,
    deemedInterestRate: 0.046,
    giftTax: { brackets: GIFT_TAX_BRACKETS, adultChildDeduction: 50_000_000, filingCredit: 0.03 },
    stockValuation: { capitalizationRate: 0.1, netAssetFloorRatio: 0.8 },
  },
  2026: {
    year: 2026,
    corporateTax: [
      { upTo: 200_000_000, rate: 0.1 },
      { upTo: 20_000_000_000, rate: 0.2 },
      { upTo: 300_000_000_000, rate: 0.22 },
      { upTo: Infinity, rate: 0.25 },
    ],
    localIncomeTaxRate: 0.1,
    deemedInterestRate: 0.046,
    giftTax: { brackets: GIFT_TAX_BRACKETS, adultChildDeduction: 50_000_000, filingCredit: 0.03 },
    stockValuation: { capitalizationRate: 0.1, netAssetFloorRatio: 0.8 },
  },
};

export function taxParametersFor(year: number): TaxParameters {
  if (TAX_PARAMETERS[year]) return TAX_PARAMETERS[year];
  const years = Object.keys(TAX_PARAMETERS).map(Number).sort((a, b) => a - b);
  const fallback = year < years[0] ? years[0] : years[years.length - 1];
  return TAX_PARAMETERS[fallback];
}

/** 누진세율 계산 */
export function progressiveTax(base: number, brackets: TaxBracket[]): number {
  if (base <= 0) return 0;
  let tax = 0;
  let lower = 0;
  for (const { upTo, rate } of brackets) {
    if (base <= lower) break;
    tax += (Math.min(base, upTo) - lower) * rate;
    lower = upTo;
  }
  return Math.round(tax);
}

/** 법인세 + 법인지방소득세 (세무조정 없이 세전이익을 과세표준으로 보는 약식) */
export function estimateCorporateTax(pretaxIncome: number, p: TaxParameters): number {
  const national = progressiveTax(pretaxIncome, p.corporateTax);
  return national + Math.round(national * p.localIncomeTaxRate);
}

// ---------------------------------------------------------------------------
// 목적별 목표 비율 (기본값 — 설계사가 화면에서 조정 가능)

export type RatioKey =
  | 'debtRatio'
  | 'currentRatio'
  | 'equityRatio'
  | 'borrowingDependence'
  | 'capitalImpairment'
  | 'operatingMargin'
  | 'netMargin'
  | 'interestCoverage'
  | 'revenueGrowth'
  | 'officerLoanShare';

export interface Threshold {
  /** 'max': 낮을수록 좋음, 'min': 높을수록 좋음 */
  direction: 'max' | 'min';
  target: number; // 이 값을 충족하면 녹색
  caution: number; // 이 값까지는 노랑, 넘어가면 빨강
}

export const RATIO_LABELS: Record<RatioKey, { label: string; unit: '%' | '배'; hint: string }> = {
  debtRatio: { label: '부채비율', unit: '%', hint: '부채총계 ÷ 자본총계' },
  currentRatio: { label: '유동비율', unit: '%', hint: '유동자산 ÷ 유동부채' },
  equityRatio: { label: '자기자본비율', unit: '%', hint: '자본총계 ÷ 자산총계' },
  borrowingDependence: { label: '차입금의존도', unit: '%', hint: '총차입금(가수금 포함) ÷ 자산총계' },
  capitalImpairment: { label: '자본잠식률', unit: '%', hint: '(자본금 − 자본총계) ÷ 자본금' },
  operatingMargin: { label: '영업이익률', unit: '%', hint: '영업이익 ÷ 매출액' },
  netMargin: { label: '순이익률', unit: '%', hint: '당기순이익 ÷ 매출액' },
  interestCoverage: { label: '이자보상배율', unit: '배', hint: '영업이익 ÷ 이자비용' },
  revenueGrowth: { label: '매출증가율', unit: '%', hint: '전기 대비' },
  officerLoanShare: { label: '가지급금 비중', unit: '%', hint: '가지급금 ÷ 자산총계' },
};

export const PURPOSE_LABELS: Record<Purpose, string> = {
  policyFund: '정책자금',
  bankLoan: '은행 대출',
  succession: '가업승계·지분 이전',
};

export const DEFAULT_THRESHOLDS: Record<Purpose, Partial<Record<RatioKey, Threshold>>> = {
  policyFund: {
    capitalImpairment: { direction: 'max', target: 0, caution: 0.5 },
    debtRatio: { direction: 'max', target: 2, caution: 4 },
    interestCoverage: { direction: 'min', target: 1.5, caution: 1 },
    revenueGrowth: { direction: 'min', target: 0.05, caution: 0 },
    operatingMargin: { direction: 'min', target: 0.03, caution: 0 },
    officerLoanShare: { direction: 'max', target: 0.01, caution: 0.05 },
  },
  bankLoan: {
    debtRatio: { direction: 'max', target: 2, caution: 3 },
    currentRatio: { direction: 'min', target: 1.5, caution: 1 },
    borrowingDependence: { direction: 'max', target: 0.3, caution: 0.5 },
    interestCoverage: { direction: 'min', target: 3, caution: 1 },
    operatingMargin: { direction: 'min', target: 0.05, caution: 0.02 },
    equityRatio: { direction: 'min', target: 0.3, caution: 0.15 },
    officerLoanShare: { direction: 'max', target: 0.01, caution: 0.05 },
  },
  succession: {
    // 승계는 비율보다 주식가치가 핵심 — 자본잠식·가지급금만 함께 점검
    capitalImpairment: { direction: 'max', target: 0, caution: 0.5 },
    officerLoanShare: { direction: 'max', target: 0.01, caution: 0.05 },
  },
};
