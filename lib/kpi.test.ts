import { describe, expect, it } from "vitest";
import { addDays, daysBetween, presetRange, previousRange } from "./dates";
import { agencyFee, budgetPace, projectMonthEnd } from "./finance";
import { creativeVerdict, dailySeries, delta, deriveKpis, funnel, kpiStatus, sumMetrics, ZERO } from "./kpi";
import { SAMPLE_CLIENTS, sampleAds, sampleInsights } from "./sample-data";
import type { InsightRow } from "./types";

const row = (date: string, over: Partial<InsightRow> = {}): InsightRow => ({ ...ZERO, adId: "a", date, ...over });

describe("deriveKpis", () => {
  it("비율 지표를 기간 합계로 계산한다", () => {
    // 일별 CPA를 평균 내면 (1000 + 전환없음) 왜곡된다. 합계 기준: 11,000원 ÷ 1건 = 11,000원
    const m = sumMetrics([
      row("2026-10-01", { spend: 1_000, impressions: 1_000, linkClicks: 10, purchases: 1, purchaseValue: 5_000 }),
      row("2026-10-02", { spend: 10_000, impressions: 1_000, linkClicks: 10, purchases: 0 }),
    ]);
    const k = deriveKpis(m, "purchase");
    expect(k.cpa).toBe(11_000);
    expect(k.cpm).toBe(5_500);
    expect(k.ctr).toBeCloseTo(0.01);
    expect(k.cpc).toBe(550);
    expect(k.cvr).toBeCloseTo(0.05);
    expect(k.roas).toBeCloseTo(5_000 / 11_000);
  });

  it("분모가 0이면 null", () => {
    const k = deriveKpis(ZERO, "purchase");
    expect(k.cpa).toBeNull();
    expect(k.ctr).toBeNull();
    expect(k.roas).toBeNull();
  });

  it("리드형은 leads를 전환으로 쓰고 ROAS가 없다", () => {
    const k = deriveKpis({ ...ZERO, spend: 30_000, leads: 3, purchases: 9 }, "lead");
    expect(k.conversions).toBe(3);
    expect(k.cpa).toBe(10_000);
    expect(k.roas).toBeNull();
  });
});

describe("kpiStatus", () => {
  it("낮을수록 좋은 지표", () => {
    expect(kpiStatus(25_000, 25_000, true)).toBe("good");
    expect(kpiStatus(30_000, 25_000, true)).toBe("warning");
    expect(kpiStatus(30_001, 25_000, true)).toBe("critical");
  });
  it("높을수록 좋은 지표", () => {
    expect(kpiStatus(3, 3, false)).toBe("good");
    expect(kpiStatus(2.5, 3, false)).toBe("warning");
    expect(kpiStatus(2.4, 3, false)).toBe("critical");
  });
  it("값이 없으면 null", () => expect(kpiStatus(null, 1, true)).toBeNull());
});

describe("delta", () => {
  it("증감률", () => expect(delta(120, 100)).toBeCloseTo(0.2));
  it("이전 값 0이면 비교 불가", () => expect(delta(5, 0)).toBeNull());
});

describe("funnel", () => {
  it("단계별 전환율을 이전 단계 기준으로 계산", () => {
    const f = funnel({ ...ZERO, impressions: 10_000, linkClicks: 200, landingViews: 150, purchases: 6 }, "purchase");
    expect(f.map((s) => s.value)).toEqual([10_000, 200, 150, 6]);
    expect(f[0].rate).toBeNull();
    expect(f[1].rate).toBeCloseTo(0.02);
    expect(f[3].rate).toBeCloseTo(0.04);
  });
});

describe("dailySeries", () => {
  it("데이터 없는 날도 0으로 채운다", () => {
    const s = dailySeries([row("2026-10-02", { spend: 100 })], { since: "2026-10-01", until: "2026-10-03" }, "lead");
    expect(s.map((p) => p.spend)).toEqual([0, 100, 0]);
  });
});

describe("creativeVerdict", () => {
  const k = (spend: number, conversions: number) => ({
    ...deriveKpis({ ...ZERO, spend, purchases: conversions }, "purchase"),
  });
  it("학습 중", () => expect(creativeVerdict(k(10_000, 0), 25_000)).toBe("learning"));
  it("전환 없이 목표 2배 소진 → 중지", () => expect(creativeVerdict(k(50_000, 0), 25_000)).toBe("pause"));
  it("목표 이하 → 승자", () => expect(creativeVerdict(k(100_000, 5), 25_000)).toBe("winner"));
  it("목표 2배 초과 → 중지", () => expect(creativeVerdict(k(160_000, 3), 25_000)).toBe("pause"));
  it("그 사이 → 관찰", () => expect(creativeVerdict(k(90_000, 3), 25_000)).toBe("watch"));
});

describe("dates", () => {
  it("7일/30일 프리셋은 어제까지", () => {
    expect(presetRange("7d", "2026-10-29")).toEqual({ since: "2026-10-22", until: "2026-10-28" });
    expect(daysBetween(presetRange("30d", "2026-10-29"))).toBe(30);
  });
  it("이번 달은 오늘까지", () => {
    expect(presetRange("mtd", "2026-10-29")).toEqual({ since: "2026-10-01", until: "2026-10-29" });
  });
  it("직전 기간은 같은 길이", () => {
    expect(previousRange({ since: "2026-10-22", until: "2026-10-28" })).toEqual({ since: "2026-10-15", until: "2026-10-21" });
  });
  it("월 경계를 넘는 날짜 계산", () => expect(addDays("2026-03-01", -1)).toBe("2026-02-28"));
});

describe("finance", () => {
  it("정률", () => expect(agencyFee({ feeModel: "percent", feePercent: 12 }, 1_000_000)).toBe(120_000));
  it("정액", () => expect(agencyFee({ feeModel: "fixed", feeFixed: 500_000 }, 9_999_999)).toBe(500_000));
  it("혼합: 최소 수수료 보장", () => {
    const c = { feeModel: "hybrid" as const, feePercent: 15, minFee: 300_000 };
    expect(agencyFee(c, 1_000_000)).toBe(300_000);
    expect(agencyFee(c, 3_000_000)).toBe(450_000);
  });
  it("월말 예상 소진", () => expect(projectMonthEnd(1_000_000, 10, 31)).toBe(3_100_000));
  it("예산 페이스", () => {
    expect(budgetPace(3_400_000, 3_000_000)).toBe("over");
    expect(budgetPace(2_600_000, 3_000_000)).toBe("under");
    expect(budgetPace(3_000_000, 3_000_000)).toBe("on");
  });
});

describe("sample data", () => {
  it("같은 기준일이면 같은 데이터", () => {
    expect(sampleInsights("haru", "2026-10-29", 10)).toEqual(sampleInsights("haru", "2026-10-29", 10));
  });
  it("모든 고객에 광고와 성과가 있고, 퍼널 순서가 맞다", () => {
    for (const c of SAMPLE_CLIENTS) {
      const rows = sampleInsights(c.id, "2026-10-29", 30);
      expect(sampleAds(c.id).length).toBeGreaterThan(0);
      const m = sumMetrics(rows);
      expect(m.impressions).toBeGreaterThan(m.linkClicks);
      expect(m.linkClicks).toBeGreaterThanOrEqual(m.landingViews);
      expect(m.landingViews).toBeGreaterThan(c.objective === "purchase" ? m.purchases : m.leads);
    }
  });
});
