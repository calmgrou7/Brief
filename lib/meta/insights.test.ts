import { describe, expect, it } from "vitest";
import { adsFromInsights, parseInsight, pickAction, type MetaInsightRaw } from "./insights";

const raw: MetaInsightRaw = {
  ad_id: "120001",
  ad_name: "후기형 카드뉴스",
  campaign_id: "9001",
  campaign_name: "전환_신상품",
  date_start: "2026-10-28",
  date_stop: "2026-10-28",
  spend: "31250",
  impressions: "4210",
  reach: "3605",
  inline_link_clicks: "71",
  actions: [
    { action_type: "link_click", value: "71" },
    { action_type: "landing_page_view", value: "58" },
    { action_type: "offsite_conversion.fb_pixel_purchase", value: "2" },
    { action_type: "omni_purchase", value: "2" },
    { action_type: "purchase", value: "2" },
  ],
  action_values: [
    { action_type: "offsite_conversion.fb_pixel_purchase", value: "136000" },
    { action_type: "omni_purchase", value: "136000" },
  ],
};

describe("parseInsight", () => {
  it("숫자 문자열과 actions를 내부 형식으로 변환", () => {
    expect(parseInsight(raw)).toEqual({
      adId: "120001",
      date: "2026-10-28",
      spend: 31_250,
      impressions: 4_210,
      reach: 3_605,
      linkClicks: 71,
      landingViews: 58,
      leads: 0,
      purchases: 2,
      purchaseValue: 136_000,
    });
  });

  it("중복 보고된 전환을 두 번 세지 않는다", () => {
    expect(parseInsight(raw).purchases).toBe(2);
  });

  it("필드가 없으면 0", () => {
    const r = parseInsight({ ad_id: "1", date_start: "2026-10-01" });
    expect(r.spend).toBe(0);
    expect(r.purchases).toBe(0);
  });

  it("리드는 lead_grouped로도 잡는다", () => {
    expect(pickAction([{ action_type: "onsite_conversion.lead_grouped", value: "4" }], ["lead", "onsite_conversion.lead_grouped"])).toBe(4);
  });
});

describe("adsFromInsights", () => {
  it("광고 ID로 중복 제거", () => {
    const ads = adsFromInsights("haru", [raw, { ...raw, date_start: "2026-10-27" }]);
    expect(ads).toEqual([{ id: "120001", clientId: "haru", campaignId: "9001", campaignName: "전환_신상품", name: "후기형 카드뉴스" }]);
  });
});
