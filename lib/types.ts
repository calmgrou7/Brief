// 도메인 타입. 금액은 모두 원 단위 정수.

export type Objective = "purchase" | "lead";

export type FeeModel = "percent" | "fixed" | "hybrid";

export interface Contract {
  feeModel: FeeModel;
  /** 15 = 광고비의 15% */
  feePercent?: number;
  feeFixed?: number;
  minFee?: number;
  /**
   * 광고비를 누가 메타에 내는가. client(기본): 고객 카드로 직접 결제 → 수수료만 청구.
   * agency: 대행사가 먼저 결제 → 광고비까지 함께 청구.
   */
  spendPaidBy?: "client" | "agency";
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  objective: Objective;
  /** 목표 CPA(구매) 또는 CPL(리드) */
  targetCpa: number;
  /** 구매 목표 고객만 사용 */
  targetRoas?: number;
  monthlyBudget: number;
  contract: Contract;
  metaAccountId?: string;
}

export interface Ad {
  id: string;
  clientId: string;
  campaignId: string;
  campaignName: string;
  name: string;
}

/** 합산 가능한 원시 지표 */
export interface Metrics {
  spend: number;
  impressions: number;
  /** 일별·광고별 도달의 합. 기간 중복 제거가 안 된 값이라 빈도는 "일평균"으로만 해석한다. */
  reach: number;
  linkClicks: number;
  landingViews: number;
  leads: number;
  purchases: number;
  purchaseValue: number;
}

/** 광고 단위 일별 성과 */
export interface InsightRow extends Metrics {
  adId: string;
  /** YYYY-MM-DD (광고계정 시간대 기준) */
  date: string;
}

export interface DateRange {
  /** 포함 */
  since: string;
  /** 포함 */
  until: string;
}

export type RangePreset = "7d" | "30d" | "mtd";

export type Status = "good" | "warning" | "critical";
