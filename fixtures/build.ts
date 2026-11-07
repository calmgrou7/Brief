/**
 * Lovable 화면용 가상 데이터(fixture) 생성기.
 * 계약(contracts/analysis.ts)을 그대로 따르므로, 나중에 실제 API로 교체해도 화면 코드는 그대로다.
 *
 *   node fixtures/build.ts   → fixtures/*.json 생성
 *
 * 모든 값은 가상이며 is_fixture=true. 실제 상권을 나타내지 않는다.
 */
import { writeFileSync } from "node:fs";
import type { AnalysisResponse, Evidence } from "../contracts/analysis.ts";
import { METRIC_VERSION } from "../contracts/analysis.ts";
import { compare } from "../src/metrics.ts";
import { ruleBasedSummary } from "../src/ai-guard.ts";

const A = { lng: 129.0592, lat: 35.1578 };
const B = { lng: 129.1186, lat: 35.1532 };
const base = { source_period: "가상-2026Q3", fetched_at: "2026-11-07", snapshot_id: "fixture-1" };
const radius = (center: typeof A) => ({ area_type: "radius" as const, radius_m: 500, center });
const dong = (code: string, name: string) => ({ area_type: "admin_dong" as const, code, name, code_version: "fixture" });

function ev(id: string, candidate: "A" | "B", metric: Evidence["metric"], value: number | null,
  unit: Evidence["unit"], scope: Evidence["scope"], status: Evidence["status"] = "ok",
  source_id: Evidence["source_id"] = "SEMAS"): Evidence {
  return { id, candidate, metric, value, unit, scope, source_id, status, ...base };
}

function build(name: string, opts: { popMissingB?: boolean; aiFallback?: boolean }): AnalysisResponse {
  const evidence: Evidence[] = [
    ev("E_COMPETITORS_A", "A", "competitor_count", 42, "stores", radius(A)),
    ev("E_TOTAL_A", "A", "total_store_count", 610, "stores", radius(A)),
    ev("E_SHARE_A", "A", "same_industry_share", 6.9, "percent", radius(A)),
    ev("E_NEAREST_A", "A", "nearest_competitor_m", 35, "m", radius(A)),
    ev("E_POP_A", "A", "dong_population", 18000, "persons", dong("F-0001", "가상동A"), "ok", "SGIS"),
    ev("E_COMPETITORS_B", "B", "competitor_count", 27, "stores", radius(B)),
    ev("E_TOTAL_B", "B", "total_store_count", 300, "stores", radius(B)),
    ev("E_SHARE_B", "B", "same_industry_share", 9.0, "percent", radius(B)),
    ev("E_NEAREST_B", "B", "nearest_competitor_m", 60, "m", radius(B)),
    opts.popMissingB
      ? ev("E_POP_B", "B", "dong_population", null, "persons", dong("F-0002", "가상동B"), "missing", "SGIS")
      : ev("E_POP_B", "B", "dong_population", 21000, "persons", dong("F-0002", "가상동B"), "ok", "SGIS"),
  ];
  const v = (id: string) => evidence.find((e) => e.id === id)!.value;
  const def = "SEMAS|r500|cafe-map-fixture|fixture-1";
  const popDef = (id: string) => (evidence.find((e) => e.id === id)!.status === "ok" ? "SGIS|2025|dong" : "missing");
  const comparison = [
    compare("competitor_count", { value: v("E_COMPETITORS_A"), definitionKey: def }, { value: v("E_COMPETITORS_B"), definitionKey: def }),
    compare("same_industry_share", { value: v("E_SHARE_A"), definitionKey: def }, { value: v("E_SHARE_B"), definitionKey: def }),
    compare("nearest_competitor_m", { value: v("E_NEAREST_A"), definitionKey: def }, { value: v("E_NEAREST_B"), definitionKey: def }),
    compare("dong_population", { value: v("E_POP_A"), definitionKey: popDef("E_POP_A") }, { value: v("E_POP_B"), definitionKey: popDef("E_POP_B") }),
  ];
  return {
    analysis_id: `fixture-${name}`,
    status: opts.popMissingB ? "partial" : "complete",
    industry: "cafe",
    candidates: [
      { key: "A", label: "후보 A (가상)", location: A, admin_dong: "가상동A" },
      { key: "B", label: "후보 B (가상)", location: B, admin_dong: "가상동B" },
    ],
    evidence,
    comparison,
    limitations: [
      "점포 수는 직선 반경 500m, 인구는 행정동 전체 기준입니다. 반경 내 인구가 아닙니다.",
      "가상 데이터입니다. 실제 상권을 나타내지 않습니다.",
    ],
    ai_status: opts.aiFallback ? "fallback" : "ok",
    ai: ruleBasedSummary(evidence),
    metric_version: METRIC_VERSION,
    is_fixture: true,
  };
}

const outputs: Record<string, unknown> = {
  "analysis.complete.json": build("complete", {}),
  "analysis.partial-population.json": build("partial", { popMissingB: true, aiFallback: true }),
  "error.outside-coverage.json": {
    error: "OUTSIDE_COVERAGE",
    message: "현재 부산진구·수영구·해운대구만 지원합니다.",
    supported: ["부산진구", "수영구", "해운대구"],
  },
};
for (const [file, data] of Object.entries(outputs)) {
  writeFileSync(new URL(file, import.meta.url), JSON.stringify(data, null, 2) + "\n");
  console.log("wrote fixtures/" + file);
}
