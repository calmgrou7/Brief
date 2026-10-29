import type { Ad, InsightRow } from "../types";

// Meta Insights API 응답(level=ad, time_increment=1) → 내부 InsightRow 변환.
// 네트워크 호출과 분리된 순수 함수라 테스트로 고정해 둔다.

export interface MetaAction {
  action_type: string;
  value: string;
}

export interface MetaInsightRaw {
  ad_id: string;
  ad_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  date_start: string;
  date_stop?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  inline_link_clicks?: string;
  actions?: MetaAction[];
  action_values?: MetaAction[];
}

export const INSIGHT_FIELDS = [
  "ad_id",
  "ad_name",
  "campaign_id",
  "campaign_name",
  "spend",
  "impressions",
  "reach",
  "inline_link_clicks",
  "actions",
  "action_values",
].join(",");

// 같은 전환이 여러 action_type으로 중복 보고되므로 우선순위대로 하나만 쓴다.
// omni_*는 웹·앱·오프라인을 중복 제거한 합계라 가장 먼저 본다.
const PURCHASE_TYPES = ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"];
const LEAD_TYPES = ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"];
const LANDING_TYPES = ["omni_landing_page_view", "landing_page_view"];

function num(v: string | undefined): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function pickAction(list: MetaAction[] | undefined, types: string[]): number {
  if (!list) return 0;
  for (const t of types) {
    const hit = list.find((a) => a.action_type === t);
    if (hit) return num(hit.value);
  }
  return 0;
}

export function parseInsight(raw: MetaInsightRaw): InsightRow {
  return {
    adId: raw.ad_id,
    date: raw.date_start,
    // 원화는 소수 단위가 없지만, 다른 통화 계정 대비 반올림해 정수로 맞춘다.
    spend: Math.round(num(raw.spend)),
    impressions: num(raw.impressions),
    reach: num(raw.reach),
    linkClicks: num(raw.inline_link_clicks),
    landingViews: pickAction(raw.actions, LANDING_TYPES),
    leads: pickAction(raw.actions, LEAD_TYPES),
    purchases: pickAction(raw.actions, PURCHASE_TYPES),
    purchaseValue: Math.round(pickAction(raw.action_values, PURCHASE_TYPES)),
  };
}

/** 응답 행에서 광고 목록을 뽑는다 (가장 최근 이름 기준) */
export function adsFromInsights(clientId: string, raws: readonly MetaInsightRaw[]): Ad[] {
  const byId = new Map<string, Ad>();
  for (const r of raws) {
    byId.set(r.ad_id, {
      id: r.ad_id,
      clientId,
      campaignId: r.campaign_id ?? "",
      campaignName: r.campaign_name ?? "",
      name: r.ad_name ?? r.ad_id,
    });
  }
  return [...byId.values()];
}
