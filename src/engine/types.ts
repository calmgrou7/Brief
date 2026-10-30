// 금액 단위는 모두 원(KRW). 비율은 소수(0.25 = 25%).

export interface BalanceSheet {
  // 자산
  cash: number; // 현금및현금성자산(단기금융상품 포함)
  receivables: number; // 매출채권
  inventory: number; // 재고자산
  officerLoans: number; // 가지급금(주임종 단기대여금)
  otherCurrentAssets: number;
  tangibleAssets: number; // 유형자산(감가상각누계 차감 후)
  intangibleAssets: number;
  otherNoncurrentAssets: number;
  // 부채
  payables: number; // 매입채무
  shortTermBorrowings: number; // 단기차입금
  currentLongTermDebt: number; // 유동성장기부채
  officerAdvances: number; // 가수금(주임종 단기차입금)
  otherCurrentLiabilities: number; // 미지급금·미지급법인세 등
  longTermBorrowings: number;
  retirementProvision: number; // 퇴직급여충당부채
  otherNoncurrentLiabilities: number;
  // 자본
  capitalStock: number; // 자본금
  otherEquity: number; // 자본잉여금·자본조정 등
  retainedEarnings: number; // 이익잉여금(결손금은 음수). 가결산 시점에는 당기 누적이익 포함
}

export interface IncomeStatement {
  revenue: number; // 매출액
  costOfSales: number; // 매출원가
  sga: number; // 판매비와관리비
  depreciation: number; // 감가상각비(원가·판관비에 이미 포함된 금액, 현금흐름 추정용 참고값)
  nonOperatingIncome: number; // 영업외수익
  interestExpense: number; // 이자비용
  otherNonOperatingExpense: number; // 이자 외 영업외비용
  incomeTax: number; // 법인세비용(가결산 시점엔 보통 0)
}

/** 회계사무실 비교식 재무제표: 당기(가결산 누적) vs 전기(직전 결산) */
export interface ComparativeStatements {
  interimDate: string; // 가결산 기준일 YYYY-MM-DD
  current: { bs: BalanceSheet; is: IncomeStatement }; // 당기 가결산(1월~기준월 누적)
  prior: { bs: BalanceSheet; is: IncomeStatement }; // 전기 결산(12개월)
}

export type Purpose = 'policyFund' | 'bankLoan' | 'succession';
/** 법인(법인세) / 개인사업자(종합소득세) */
export type Entity = 'corporation' | 'individual';

export interface CompanyProfile {
  name: string;
  ceo: string;
  industry: string;
  isSme: boolean; // 중소기업 여부(최대주주 할증 면제)
  isRealEstateHeavy: boolean; // 부동산과다보유법인(주식평가 가중치 2:3)
  sharesOutstanding: number; // 발행주식총수
  ceoShares: number; // 대표 보유 주식수
  netIncomeTwoYearsAgo: number; // 전전기 당기순이익(주식평가용)
  purposes: Purpose[];
  entity?: Entity; // 없으면 법인
}

/** simple·ceoForecast: 가결산(연말 추정) / final: 신고 후 확정 결산(그대로 사용) */
export type AnnualizeMethod = 'simple' | 'ceoForecast' | 'final';

export interface ProjectionInput {
  method: AnnualizeMethod;
  /** ceoForecast: 기준일 이후 연말까지 대표 예상 추가 매출 */
  remainingRevenue: number;
}

export interface Statements {
  bs: BalanceSheet;
  is: IncomeStatement;
}
