import { addDays, daysBetween, daysInMonth, monthStart, presetRange } from "./dates";
import { agencyFee, budgetPace, projectMonthEnd, type Pace } from "./finance";
import {
  creativeVerdict,
  deriveKpis,
  inRange,
  kpiStatus,
  metricsByAd,
  sumMetrics,
  ZERO,
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

export interface Insight {
  tone: Status;
  text: string;
}

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * 규칙 기반 인사이트. 5단계에서 분석 에이전트(LLM)가 이 자리를 대체하되,
 * 같은 근거 데이터를 입력으로 받는다.
 */
export function insights(input: ClientInput, range: DateRange): Insight[] {
  const { client, rows, anchor } = input;
  const out: Insight[] = [];
  const perf = adPerformance(input, range);
  const unit = client.objective === "purchase" ? "CPA" : "CPL";

  const winners = perf.filter((a) => a.verdict === "winner" && a.kpis.cpa != null);
  const best = winners.sort((a, b) => (a.kpis.cpa ?? 0) - (b.kpis.cpa ?? 0))[0];
  if (best?.kpis.cpa != null) {
    out.push({
      tone: "good",
      text: `‘${best.name}’ 소재의 ${unit}가 ${won(best.kpis.cpa)}로 목표보다 ${pct(1 - best.kpis.cpa / client.targetCpa)} 낮습니다. 예산 증액 후보입니다.`,
    });
  }

  for (const a of perf.filter((p) => p.verdict === "pause")) {
    const detail = a.kpis.cpa != null ? `${unit} ${won(a.kpis.cpa)}` : "전환 0건";
    out.push({
      tone: "critical",
      text: `‘${a.name}’ 소재는 ${won(a.kpis.spend)}를 썼지만 ${detail}입니다. 일시중지를 권장합니다.`,
    });
  }

  // 소재 피로도: 최근 7일 CTR이 그 전 7일보다 20% 넘게 떨어진 소재
  const last7 = presetRange("7d", anchor);
  const prev7 = { since: addDays(last7.since, -7), until: addDays(last7.since, -1) };
  const now = metricsByAd(inRange(rows, last7));
  const before = metricsByAd(inRange(rows, prev7));
  for (const a of input.ads) {
    const n = deriveKpis(now.get(a.id) ?? ZERO, client.objective).ctr;
    const b = deriveKpis(before.get(a.id) ?? ZERO, client.objective).ctr;
    if (n != null && b != null && n < b * 0.8) {
      out.push({
        tone: "warning",
        text: `‘${a.name}’ 소재의 CTR이 지난주보다 ${pct(1 - n / b)} 떨어졌습니다. 소재 피로도가 의심되니 새 변형을 준비하세요.`,
      });
    }
  }

  const m = monthSummary(input);
  if (m.pace !== "on") {
    const ratio = m.projectedSpend / client.monthlyBudget;
    out.push({
      tone: "warning",
      text:
        m.pace === "over"
          ? `지금 속도면 월말 광고비가 ${won(m.projectedSpend)}로 예산의 ${pct(ratio)}입니다. 일 예산 조정이 필요합니다.`
          : `지금 속도면 월말 광고비가 예산의 ${pct(ratio)}에 그칩니다. 성과 좋은 소재에 예산을 더 배정할 여유가 있습니다.`,
    });
  }

  return out;
}

export function monthLabel(anchor: string): string {
  const s = monthStart(anchor);
  return `${Number(s.slice(5, 7))}월`;
}
