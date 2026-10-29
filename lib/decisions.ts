import { addDays, daysBetween, presetRange } from "./dates";
import { agencyFee } from "./finance";
import { deriveKpis, inRange, metricsByAd, sumMetrics, ZERO } from "./kpi";
import { adPerformance, monthSummary, type ClientInput } from "./summary";

// 오늘의 결정함: 데이터를 "운영자가 오늘 눌러야 할 결정"으로 바꾼다.
// 결정마다 돈 단위 효과를 붙여 무엇부터 할지 정렬한다. 순수 함수.

/** 효과를 계산하는 기간. 월말까지 남은 일수와 무관하게 비교할 수 있도록 고정한다. */
export const HORIZON_DAYS = 7;
/** 예산 증액 시 한계 CPA가 평균보다 이만큼 나빠진다고 보수적으로 가정 */
const MARGINAL_CPA_PENALTY = 1.15;
/** 승자 소재 증액 폭 */
const SCALE_STEP = 0.2;

export type DecisionType = "pause_ad" | "scale_ad" | "refresh_creative" | "slow_budget" | "use_budget";

export interface Evidence {
  label: string;
  value: string;
  /** 목표 대비 나쁜 값이면 강조 */
  bad?: boolean;
}

export interface Decision {
  /** 같은 대상에 대한 같은 결정은 날이 바뀌어도 같은 ID (승인·무시 기록 유지) */
  id: string;
  type: DecisionType;
  clientId: string;
  clientName: string;
  title: string;
  reason: string;
  evidence: Evidence[];
  /** 정렬과 강조에 쓰는 원 단위 효과 (절약·추가 매출·초과 방지 금액). 돈으로 못 바꾸면 0 */
  impactWon: number;
  impactLabel: string;
  impactNote?: string;
  /** 효과를 계산한 기간 표기 */
  impactBasis: string;
  /** 승인 시 실행될 내용 (4단계 집행 에이전트가 수행) */
  action: string;
  /** 추이 근거: 최근 14일 일별 값 */
  trend?: { label: string; values: (number | null)[]; target?: number };
}

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const short = (n: number) => (Math.abs(n) >= 10_000 ? `${Math.round(n / 10_000).toLocaleString("ko-KR")}만원` : won(n));
const pct = (n: number) => `${Math.round(n * 100)}%`;

function dailyAdSeries(input: ClientInput, adId: string, pick: "cpa" | "ctr"): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 14; i >= 1; i--) {
    const date = addDays(input.anchor, -i);
    const m = sumMetrics(input.rows.filter((r) => r.adId === adId && r.date === date));
    out.push(deriveKpis(m, input.client.objective)[pick]);
  }
  return out;
}

export function decisionsFor(input: ClientInput): Decision[] {
  const { client, rows, anchor } = input;
  const out: Decision[] = [];
  const unit = client.objective === "purchase" ? "CPA" : "CPL";
  const conv = client.objective === "purchase" ? "구매" : "리드";
  const last7 = presetRange("7d", anchor);
  const prev7 = { since: addDays(last7.since, -7), until: addDays(last7.since, -1) };
  const recent = metricsByAd(inRange(rows, last7));
  const before = metricsByAd(inRange(rows, prev7));
  const perf = adPerformance(input, presetRange("30d", anchor));
  const paused = new Set<string>();
  const m = monthSummary(input);
  const scaleCandidates: { d: Decision; cpaRatio: number }[] = [];

  // 전환이 드문 소재는 일별 CPA가 대부분 비어 추이가 안 보이므로 CTR 추이로 대신한다
  const efficiencyTrend = (adId: string): NonNullable<Decision["trend"]> => {
    const cpa = dailyAdSeries(input, adId, "cpa");
    return cpa.filter((v) => v != null).length >= 5
      ? { label: `일별 ${unit}`, values: cpa, target: client.targetCpa }
      : { label: "일별 CTR", values: dailyAdSeries(input, adId, "ctr") };
  };

  for (const a of perf) {
    const r = deriveKpis(recent.get(a.adId) ?? ZERO, client.objective);
    const dailySpend = r.spend / 7;
    if (dailySpend <= 0) continue;

    if (a.verdict === "pause") {
      paused.add(a.adId);
      const saved = dailySpend * HORIZON_DAYS;
      out.push({
        id: `pause_ad:${client.id}:${a.adId}`,
        type: "pause_ad",
        clientId: client.id,
        clientName: client.name,
        title: `‘${a.name}’ 소재 끄기`,
        reason:
          a.kpis.cpa == null
            ? `최근 30일 ${won(a.kpis.spend)}를 썼지만 ${conv}가 한 건도 없습니다.`
            : `최근 30일 ${unit}가 ${won(a.kpis.cpa)}로 목표(${won(client.targetCpa)})의 ${(a.kpis.cpa / client.targetCpa).toFixed(1)}배입니다.`,
        evidence: [
          { label: "30일 광고비", value: won(a.kpis.spend) },
          { label: unit, value: a.kpis.cpa == null ? "전환 없음" : won(a.kpis.cpa), bad: true },
          { label: `목표 ${unit}`, value: won(client.targetCpa) },
          ...(a.kpis.roas != null ? [{ label: "ROAS", value: `${a.kpis.roas.toFixed(2)}배`, bad: true }] : []),
        ],
        impactWon: saved,
        impactLabel: `주 ${short(saved)} 절약`,
        impactBasis: "7일 기준",
        impactNote: `잃는 ${conv}는 주 ${Math.round(r.conversions)}건 수준`,
        action: "메타에서 이 광고를 일시중지합니다.",
        trend: efficiencyTrend(a.adId),
      });
      continue;
    }

    // 목표보다 20% 이상 싸게 전환을 만드는 승자 소재만 증액 후보 (전환 5건 미만은 우연일 수 있어 제외)
    if (a.verdict === "winner" && a.kpis.cpa != null && a.kpis.cpa <= client.targetCpa * 0.8 && a.kpis.conversions >= 5) {
      const extraSpend = dailySpend * SCALE_STEP * HORIZON_DAYS;
      const extraConv = extraSpend / (a.kpis.cpa * MARGINAL_CPA_PENALTY);
      const aov = a.kpis.conversions > 0 ? a.kpis.revenue / a.kpis.conversions : 0;
      const extraRevenue = extraConv * aov;
      // 최소 수수료가 있는 계약은 증액분이 그대로 수수료가 되지 않으므로 월말 예상 기준으로 차이를 본다
      const feeGain = agencyFee(client.contract, m.projectedSpend + extraSpend) - agencyFee(client.contract, m.projectedSpend);
      scaleCandidates.push({
        cpaRatio: a.kpis.cpa / client.targetCpa,
        d: {
          id: `scale_ad:${client.id}:${a.adId}`,
          type: "scale_ad",
          clientId: client.id,
          clientName: client.name,
          title: `‘${a.name}’ 예산 ${pct(SCALE_STEP)} 늘리기`,
          reason: `${unit}가 ${won(a.kpis.cpa)}로 목표보다 ${pct(1 - a.kpis.cpa / client.targetCpa)} 낮습니다. 같은 효율이 유지될 여지가 있습니다.`,
          evidence: [
            { label: "30일 광고비", value: won(a.kpis.spend) },
            { label: unit, value: won(a.kpis.cpa) },
            { label: `목표 ${unit}`, value: won(client.targetCpa) },
            { label: `${conv}`, value: `${a.kpis.conversions}건` },
          ],
          impactWon: client.objective === "purchase" ? extraRevenue : 0,
          impactBasis: "7일 기준",
          impactLabel:
            client.objective === "purchase" ? `주 매출 +${short(extraRevenue)}` : `주 리드 +${Math.max(1, Math.round(extraConv))}건`,
          impactNote: `광고비 +${short(extraSpend)} 기준 예상치${feeGain > 0 ? ` · 내 수수료 +${short(feeGain)}` : ""}`,
          action: `광고세트 일 예산을 ${won(dailySpend)} → ${won(dailySpend * (1 + SCALE_STEP))}로 올립니다.`,
          trend: efficiencyTrend(a.adId),
        },
      });
    }
  }

  // 증액은 고객당 가장 효율 좋은 소재 하나만, 그리고 이미 예산 초과 페이스인 고객에게는 제안하지 않는다
  if (m.pace !== "over" && scaleCandidates.length > 0) {
    out.push(scaleCandidates.reduce((x, y) => (y.cpaRatio < x.cpaRatio ? y : x)).d);
  }

  // 소재 피로도: 최근 7일 CTR이 그 전 7일보다 20% 넘게 하락 (이미 끄라고 한 소재는 제외)
  for (const ad of input.ads) {
    if (paused.has(ad.id)) continue;
    const n = deriveKpis(recent.get(ad.id) ?? ZERO, client.objective);
    const b = deriveKpis(before.get(ad.id) ?? ZERO, client.objective);
    if (n.ctr == null || b.ctr == null || n.ctr >= b.ctr * 0.8) continue;
    out.push({
      id: `refresh_creative:${client.id}:${ad.id}`,
      type: "refresh_creative",
      clientId: client.id,
      clientName: client.name,
      title: `‘${ad.name}’ 새 변형 만들기`,
      reason: `CTR이 지난주 ${(b.ctr * 100).toFixed(2)}% → 이번 주 ${(n.ctr * 100).toFixed(2)}%로 ${pct(1 - n.ctr / b.ctr)} 떨어졌습니다. 같은 사람에게 너무 많이 노출된 신호입니다.`,
      evidence: [
        { label: "지난주 CTR", value: `${(b.ctr * 100).toFixed(2)}%` },
        { label: "이번 주 CTR", value: `${(n.ctr * 100).toFixed(2)}%`, bad: true },
        { label: "이번 주 CPC", value: n.cpc == null ? "–" : won(n.cpc) },
      ],
      impactWon: 0,
      impactLabel: "성과 하락 방어",
      impactBasis: "7일 기준",
      impactNote: "방치하면 CPC·CPA가 따라 오릅니다",
      action: "같은 메시지로 이미지·첫 문장을 바꾼 변형 3개를 만듭니다. (3단계 크리에이티브 에이전트)",
      trend: { label: "일별 CTR", values: dailyAdSeries(input, ad.id, "ctr") },
    });
  }

  // 월 예산 페이스
  const remaining = m.daysInMonth - m.daysElapsed;
  if (m.pace !== "on" && remaining > 0) {
    const mtd = presetRange("mtd", anchor);
    const settledDays = Math.max(1, daysBetween(mtd) - 1);
    const currentDaily = sumMetrics(inRange(rows, { since: mtd.since, until: addDays(anchor, -1) })).spend / settledDays;
    const neededDaily = Math.max(0, (client.monthlyBudget - m.kpis.spend) / remaining);
    const gap = m.projectedSpend - client.monthlyBudget;
    const common = {
      clientId: client.id,
      clientName: client.name,
      evidence: [
        { label: "이번 달 소진", value: won(m.kpis.spend) },
        { label: "월 예산", value: won(client.monthlyBudget) },
        { label: "월말 예상", value: won(m.projectedSpend), bad: true },
        { label: "남은 일수", value: `${remaining}일` },
      ],
      action: `고객 전체 일 예산을 ${won(currentDaily)} → ${won(neededDaily)}로 조정합니다.`,
    };
    const overspent = m.kpis.spend - client.monthlyBudget;
    if (m.pace === "over" && overspent >= 0) {
      // 이미 예산을 넘겼으면 "일 예산 0원"은 현실적인 제안이 아니므로 고객과 합의할 일로 올린다
      const more = currentDaily * remaining;
      out.push({
        ...common,
        id: `slow_budget:${client.id}:${mtd.since}`,
        type: "slow_budget",
        title: "월 예산 초과 — 고객과 합의하기",
        reason: `이미 예산보다 ${won(overspent)} 더 썼고, 이대로면 남은 ${remaining}일 동안 ${won(more)}가 더 나갑니다.`,
        impactWon: more,
        impactLabel: `추가 초과 ${short(more)} 방지`,
        impactBasis: "이번 달 기준",
        action: "고객과 추가 예산을 합의하거나, 남은 기간 광고세트를 일시중지합니다.",
      });
    } else if (m.pace === "over") {
      out.push({
        ...common,
        id: `slow_budget:${client.id}:${mtd.since}`,
        type: "slow_budget",
        title: "일 예산 줄이기",
        reason: `지금 속도면 월말 광고비가 예산보다 ${won(gap)} 많아집니다. 고객과 합의한 예산을 넘기 전에 조정이 필요합니다.`,
        impactWon: gap,
        impactLabel: `예산 초과 ${short(gap)} 방지`,
        impactNote: `일 ${short(currentDaily - neededDaily)} 감액`,
        impactBasis: "이번 달 기준",
      });
    } else {
      const feeGain = agencyFee(client.contract, client.monthlyBudget) - agencyFee(client.contract, m.projectedSpend);
      out.push({
        ...common,
        id: `use_budget:${client.id}:${mtd.since}`,
        type: "use_budget",
        title: "남은 예산 집행하기",
        reason: `지금 속도면 예산 중 ${won(-gap)}이 남습니다. 성과 좋은 소재에 배정하면 고객 성과와 수수료가 함께 늘어납니다.`,
        impactWon: -gap,
        impactLabel: `미집행 ${short(-gap)} 활용`,
        impactBasis: "이번 달 기준",
        impactNote: feeGain > 0 ? `내 수수료 +${short(feeGain)}` : undefined,
      });
    }
  }

  return out;
}

const TYPE_ORDER: Record<DecisionType, number> = {
  slow_budget: 0,
  pause_ad: 1,
  scale_ad: 2,
  use_budget: 3,
  refresh_creative: 4,
};

/** 돈 효과가 큰 순서. 효과를 돈으로 못 바꾸는 결정은 뒤로. */
export function rankDecisions(list: Decision[]): Decision[] {
  return [...list].sort((a, b) => b.impactWon - a.impactWon || TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
}

export const TYPE_LABEL: Record<DecisionType, string> = {
  pause_ad: "소재 중지",
  scale_ad: "예산 증액",
  refresh_creative: "소재 교체",
  slow_budget: "예산 조정",
  use_budget: "예산 조정",
};
