import { addDays, daysBetween, daysInMonth, monthStart, presetRange } from "./dates";
import { agencyFee, budgetPace, projectMonthEnd, type Pace } from "./finance";
import {
  creativeVerdict,
  deriveKpis,
  inRange,
  kpiStatus,
  metricsByAd,
  sumMetrics,
  type Kpis,
  type Verdict,
} from "./kpi";
import type { Ad, Client, DateRange, InsightRow, Status } from "./types";

// 화면에 필요한 요약을 데이터에서 계산한다 (순수 함수).

export interface ClientInput {
  client: Client;
  ads: Ad[];
  rows: InsightRow[];
  anchor: string;
}

export interface MonthSummary {
  kpis: Kpis;
  /** 이번 달 경과일 (오늘 포함) */
  daysElapsed: number;
  daysInMonth: number;
  projectedSpend: number;
  pace: Pace;
  feeToDate: number;
  feeProjected: number;
  /** 주 지표(CPA/CPL)의 목표 대비 상태 */
  cpaStatus: Status | null;
  roasStatus: Status | null;
  /** 최근 30일 기준 중지 권장 소재 수 */
  pauseCount: number;
}

export function monthSummary({ client, rows, anchor }: ClientInput): MonthSummary {
  const range = presetRange("mtd", anchor);
  const kpis = deriveKpis(sumMetrics(inRange(rows, range)), client.objective);
  const elapsed = daysBetween(range);
  const dim = daysInMonth(anchor);
  // 오늘은 하루가 끝나지 않았으므로 속도 계산에서는 어제까지만 쓴다 (월 1일이면 오늘 포함).
  const settled = elapsed > 1 ? { since: range.since, until: addDays(anchor, -1) } : range;
  const settledSpend = sumMetrics(inRange(rows, settled)).spend;
  const projectedSpend = projectMonthEnd(settledSpend, daysBetween(settled), dim);

  return {
    kpis,
    daysElapsed: elapsed,
    daysInMonth: dim,
    projectedSpend,
    pace: budgetPace(projectedSpend, client.monthlyBudget),
    feeToDate: agencyFee(client.contract, kpis.spend),
    feeProjected: agencyFee(client.contract, projectedSpend),
    cpaStatus: kpiStatus(kpis.cpa, client.targetCpa, true),
    roasStatus: client.targetRoas ? kpiStatus(kpis.roas, client.targetRoas, false) : null,
    pauseCount: adPerformance({ client, ads: [], rows, anchor }, presetRange("30d", anchor)).filter(
      (a) => a.verdict === "pause",
    ).length,
  };
}

export interface AdPerformance {
  adId: string;
  name: string;
  campaignName: string;
  kpis: Kpis;
  verdict: Verdict;
}

export function adPerformance({ client, ads, rows }: ClientInput, range: DateRange): AdPerformance[] {
  const byAd = metricsByAd(inRange(rows, range));
  const meta = new Map(ads.map((a) => [a.id, a]));
  return [...byAd.entries()]
    .map(([adId, m]) => {
      const kpis = deriveKpis(m, client.objective);
      return {
        adId,
        name: meta.get(adId)?.name ?? adId,
        campaignName: meta.get(adId)?.campaignName ?? "",
        kpis,
        verdict: creativeVerdict(kpis, client.targetCpa),
      };
    })
    .filter((a) => a.kpis.spend > 0)
    .sort((a, b) => b.kpis.spend - a.kpis.spend);
}

export function monthLabel(anchor: string): string {
  const s = monthStart(anchor);
  return `${Number(s.slice(5, 7))}월`;
}
