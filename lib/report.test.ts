import { describe, expect, it } from "vitest";
import { performanceView } from "./performance";
import { reportSummary } from "./report";
import { SAMPLE_CLIENTS, sampleAds, sampleInsights } from "./sample-data";

const ANCHOR = "2026-10-30";
const view = (id: string) => {
  const client = SAMPLE_CLIENTS.find((c) => c.id === id)!;
  return performanceView({ client, ads: sampleAds(id), rows: sampleInsights(id, ANCHOR, 70), anchor: ANCHOR }, "30d");
};

describe("reportSummary", () => {
  it("구매형은 구매 수와 매출로 요약", () => {
    const s = reportSummary(view("haru"));
    expect(s.headline).toMatch(/^광고비 .+원으로 구매 [\d,]+건, 매출 .+을 만들었습니다\.$/);
    expect(s.points.some((p) => p.includes("ROAS"))).toBe(true);
  });

  it("리드형은 신청 수로 요약하고 ROAS는 말하지 않는다", () => {
    const s = reportSummary(view("soom"));
    expect(s.headline).toContain("신청");
    expect(s.points.join(" ")).not.toContain("ROAS");
  });

  it("고객에게 내부 정보(수수료·판정)는 노출하지 않는다", () => {
    for (const id of ["haru", "soom", "ongyeol"]) {
      const text = [reportSummary(view(id)).headline, ...reportSummary(view(id)).points].join(" ");
      expect(text).not.toMatch(/수수료|마진|중지 권장|승자/);
    }
  });
});
