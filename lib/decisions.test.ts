import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { isOpen } from "./decision-store";
import { decisionsFor, HORIZON_DAYS, rankDecisions } from "./decisions";
import { ZERO } from "./kpi";
import type { Ad, Client, InsightRow } from "./types";

const ANCHOR = "2026-10-15";

const client: Client = {
  id: "c",
  name: "테스트몰",
  industry: "쇼핑몰",
  objective: "purchase",
  targetCpa: 20_000,
  targetRoas: 3,
  monthlyBudget: 100_000_000, // 페이스 결정이 끼지 않도록 넉넉하게
  contract: { feeModel: "percent", feePercent: 10 },
};

const ad = (id: string, name: string): Ad => ({ id, clientId: "c", campaignId: "k", campaignName: "캠페인", name });

/** anchor 기준 days일 전부터 어제까지 매일 같은 값을 만든다 (fn으로 날짜별 조정) */
function series(adId: string, days: number, fn: (ago: number) => Partial<InsightRow>): InsightRow[] {
  const out: InsightRow[] = [];
  for (let ago = days; ago >= 1; ago--) out.push({ ...ZERO, adId, date: addDays(ANCHOR, -ago), ...fn(ago) });
  return out;
}

describe("decisionsFor", () => {
  const ads = [ad("loser", "안 되는 소재"), ad("winner", "잘 되는 소재"), ad("tired", "지친 소재")];
  const rows = [
    // 하루 1만원, 전환 없음 → 30일 30만원 소진 → 중지
    ...series("loser", 35, () => ({ spend: 10_000, impressions: 2_000, linkClicks: 20 })),
    // 하루 1만원, 하루 1건 구매(5만원) → CPA 1만원 → 증액
    ...series("winner", 35, () => ({ spend: 10_000, impressions: 2_000, linkClicks: 40, purchases: 1, purchaseValue: 50_000 })),
    // CTR 지난주 2% → 이번 주 1%
    ...series("tired", 35, (ago) => ({ spend: 4_000, impressions: 1_000, linkClicks: ago <= 7 ? 10 : 20, purchases: ago % 3 === 0 ? 1 : 0, purchaseValue: ago % 3 === 0 ? 30_000 : 0 })),
  ];
  const list = decisionsFor({ client, ads, rows, anchor: ANCHOR });
  const byId = Object.fromEntries(list.map((d) => [d.id, d]));

  it("전환 없이 목표의 2배 넘게 쓴 소재는 중지, 효과는 주간 소진액", () => {
    const d = byId["pause_ad:c:loser"];
    expect(d).toBeDefined();
    expect(d.impactWon).toBe(10_000 * HORIZON_DAYS);
  });

  it("목표보다 20% 이상 싼 승자는 증액, 한계 CPA를 15% 나쁘게 가정", () => {
    const d = byId["scale_ad:c:winner"];
    expect(d).toBeDefined();
    const extraSpend = 10_000 * 0.2 * HORIZON_DAYS;
    expect(d.impactWon).toBeCloseTo((extraSpend / (10_000 * 1.15)) * 50_000);
    expect(d.impactNote).toContain("내 수수료 +");
  });

  it("CTR이 20% 넘게 떨어진 소재는 교체 제안", () => {
    expect(byId["refresh_creative:c:tired"]).toBeDefined();
    expect(byId["refresh_creative:c:winner"]).toBeUndefined();
  });

  it("중지할 소재에는 교체 제안을 중복으로 내지 않는다", () => {
    expect(byId["refresh_creative:c:loser"]).toBeUndefined();
  });

  it("돈 효과가 큰 순서, 돈으로 못 바꾸는 결정은 뒤", () => {
    const ranked = rankDecisions(list);
    expect(ranked[ranked.length - 1].type).toBe("refresh_creative");
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1].impactWon).toBeGreaterThanOrEqual(ranked[i].impactWon);
  });

  it("예산 초과 페이스면 일 예산 감액 결정", () => {
    const tight = { ...client, monthlyBudget: 300_000 };
    const d = decisionsFor({ client: tight, ads, rows, anchor: ANCHOR }).find((x) => x.type === "slow_budget");
    expect(d).toBeDefined();
    expect(d!.impactWon).toBeGreaterThan(0);
    // 이미 예산(30만원)을 넘긴 상태라 "일 예산 0원"이 아니라 고객 합의로 제안
    expect(d!.title).toContain("고객과 합의");
    expect(d!.action).not.toContain("0원");
  });
});

describe("isOpen", () => {
  const base = { at: "", title: "", clientName: "", impactLabel: "" };
  it("기록 없으면 보인다", () => expect(isOpen(undefined, ANCHOR)).toBe(true));
  it("승인·무시는 숨긴다", () => {
    expect(isOpen({ ...base, status: "approved" }, ANCHOR)).toBe(false);
    expect(isOpen({ ...base, status: "dismissed" }, ANCHOR)).toBe(false);
  });
  it("보류는 다음 날 다시 보인다", () => {
    expect(isOpen({ ...base, status: "snoozed", until: ANCHOR }, ANCHOR)).toBe(false);
    expect(isOpen({ ...base, status: "snoozed", until: ANCHOR }, addDays(ANCHOR, 1))).toBe(true);
  });
});

describe("증액 제안 제한", () => {
  const ads = [ad("a1", "승자1"), ad("a2", "승자2")];
  const rows = [
    ...series("a1", 35, () => ({ spend: 10_000, impressions: 2_000, linkClicks: 40, purchases: 1, purchaseValue: 50_000 })),
    // a2가 더 효율적 (CPA 5,000원)
    ...series("a2", 35, () => ({ spend: 10_000, impressions: 2_000, linkClicks: 40, purchases: 2, purchaseValue: 100_000 })),
  ];

  it("고객당 가장 효율 좋은 소재 하나만", () => {
    const scale = decisionsFor({ client, ads, rows, anchor: ANCHOR }).filter((d) => d.type === "scale_ad");
    expect(scale.map((d) => d.id)).toEqual(["scale_ad:c:a2"]);
  });

  it("예산 초과 페이스인 고객에게는 증액을 제안하지 않는다", () => {
    const over = decisionsFor({ client: { ...client, monthlyBudget: 300_000 }, ads, rows, anchor: ANCHOR });
    expect(over.some((d) => d.type === "scale_ad")).toBe(false);
    // 아직 예산을 넘기진 않았으므로 일 예산 감액 제안
    expect(over.find((d) => d.type === "slow_budget")?.title).toBe("일 예산 줄이기");
  });
});
