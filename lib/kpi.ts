import { eachDay } from "./dates";
import type { DateRange, InsightRow, Metrics, Objective, Status } from "./types";

// KPI 계산은 전부 순수 함수. 비율 지표는 항상 "기간 합계 ÷ 기간 합계"로 계산한다
// (일별 비율의 평균을 내면 소진이 적은 날이 과대 반영된다).

export const ZERO: Metrics = {
  spend: 0,
  impressions: 0,
  reach: 0,
  linkClicks: 0,
  landingViews: 0,
  leads: 0,
  purchases: 0,
  purchaseValue: 0,
};

const KEYS = Object.keys(ZERO) as (keyof Metrics)[];

export function sumMetrics(rows: readonly Metrics[]): Metrics {
  const out = { ...ZERO };
  for (const r of rows) for (const k of KEYS) out[k] += r[k];
  return out;
}

export function inRange(rows: readonly InsightRow[], range: DateRange): InsightRow[] {
  return rows.filter((r) => r.date >= range.since && r.date <= range.until);
}

function ratio(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}

export function conversionsOf(m: Metrics, objective: Objective): number {
  return objective === "purchase" ? m.purchases : m.leads;
}

export interface Kpis {
  spend: number;
  impressions: number;
  linkClicks: number;
  conversions: number;
  revenue: number;
  cpm: number | null;
  ctr: number | null;
  cpc: number | null;
  /** 클릭 → 전환 */
  cvr: number | null;
  cpa: number | null;
  roas: number | null;
  /** 일별·광고별 도달 합 기준이라 "일평균 빈도"에 가깝다 */
  frequency: number | null;
}

export function deriveKpis(m: Metrics, objective: Objective): Kpis {
  const conversions = conversionsOf(m, objective);
  return {
    spend: m.spend,
    impressions: m.impressions,
    linkClicks: m.linkClicks,
    conversions,
    revenue: m.purchaseValue,
    cpm: ratio(m.spend * 1000, m.impressions),
    ctr: ratio(m.linkClicks, m.impressions),
    cpc: ratio(m.spend, m.linkClicks),
    cvr: ratio(conversions, m.linkClicks),
    cpa: ratio(m.spend, conversions),
    roas: objective === "purchase" ? ratio(m.purchaseValue, m.spend) : null,
    frequency: ratio(m.impressions, m.reach),
  };
}

/** 증감률. 이전 값이 0이거나 없으면 비교 불가(null). */
export function delta(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return (current - previous) / previous;
}

/**
 * 목표 대비 상태. CPA처럼 낮을수록 좋은 지표는 목표 이하가 good, 120% 이내가 warning.
 * ROAS처럼 높을수록 좋은 지표는 목표 이상이 good, 목표의 1/1.2 이상이 warning.
 */
export function kpiStatus(actual: number | null, target: number, lowerIsBetter: boolean): Status | null {
  if (actual == null || target <= 0) return null;
  if (lowerIsBetter) {
    if (actual <= target) return "good";
    return actual <= target * 1.2 ? "warning" : "critical";
  }
  if (actual >= target) return "good";
  return actual >= target / 1.2 ? "warning" : "critical";
}

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
  /** 이전 단계 대비 전환율 */
  rate: number | null;
}

export function funnel(m: Metrics, objective: Objective): FunnelStage[] {
  const steps: [string, string, number][] = [
    ["impressions", "노출", m.impressions],
    ["linkClicks", "링크 클릭", m.linkClicks],
    ["landingViews", "랜딩 방문", m.landingViews],
    objective === "purchase" ? ["purchases", "구매", m.purchases] : ["leads", "신청(리드)", m.leads],
  ];
  return steps.map(([key, label, value], i) => ({
    key,
    label,
    value,
    rate: i === 0 ? null : ratio(value, steps[i - 1][2]),
  }));
}

export interface DailyPoint extends Kpis {
  date: string;
}

/** 기간의 모든 날짜를 채운 일별 시계열 (데이터 없는 날은 0) */
export function dailySeries(rows: readonly InsightRow[], range: DateRange, objective: Objective): DailyPoint[] {
  const byDate = new Map<string, InsightRow[]>();
  for (const r of inRange(rows, range)) {
    const list = byDate.get(r.date);
    if (list) list.push(r);
    else byDate.set(r.date, [r]);
  }
  return eachDay(range).map((date) => ({ date, ...deriveKpis(sumMetrics(byDate.get(date) ?? []), objective) }));
}

export function metricsByAd(rows: readonly InsightRow[]): Map<string, Metrics> {
  const out = new Map<string, Metrics>();
  for (const r of rows) {
    const acc = out.get(r.adId) ?? { ...ZERO };
    for (const k of KEYS) acc[k] += r[k];
    out.set(r.adId, acc);
  }
  return out;
}

export type Verdict = "winner" | "watch" | "learning" | "pause";

/**
 * 소재 판정 (분석 에이전트 연결 전의 규칙 기반 판정).
 * - 목표 CPA 1배만큼도 쓰지 않았고 전환이 없으면 아직 학습 중
 * - 전환 없이 목표 CPA 2배 이상 소진, 또는 CPA가 목표의 2배 초과 → 중지 권장
 * - CPA가 목표 이하 → 승자
 */
export function creativeVerdict(k: Kpis, targetCpa: number): Verdict {
  if (k.conversions === 0) {
    if (k.spend < targetCpa) return "learning";
    return k.spend >= targetCpa * 2 ? "pause" : "watch";
  }
  const cpa = k.cpa ?? Infinity;
  if (cpa <= targetCpa) return "winner";
  return cpa > targetCpa * 2 ? "pause" : "watch";
}
