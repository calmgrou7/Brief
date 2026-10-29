// 도메인 타입. 금액은 모두 원 단위 정수.

export type Objective = "purchase" | "lead";

export type FeeModel = "percent" | "fixed" | "hybrid";

export interface Contract {
  feeModel: FeeModel;
  /** 15 = 광고비의 15% */
  feePercent?: number;
  feeFixed?: number;
  minFee?: number;
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
