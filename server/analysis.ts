/** 실데이터 → 계약(AnalysisResponse) 변환. 수치는 완전 수집된 경우에만 채운다. */
import type { AnalysisResponse, ComparisonRow, Evidence, MetricId } from "../contracts/analysis.ts";
import { DEFAULT_RADIUS_M, METRIC_VERSION } from "../contracts/analysis.ts";
import { ruleBasedSummary } from "../src/ai-guard.ts";
import { compare, radiusMetrics } from "../src/metrics.ts";
import type { AddressCandidate } from "./kakao.ts";
import type { RadiusFetchResult } from "./semas.ts";

export interface CandidateInput {
  key: "A" | "B";
  place: AddressCandidate;
  radius: RadiusFetchResult;
}

export function buildAnalysis(
  id: string,
  cafeCode: string,
  inputs: CandidateInput[],
  fetchedAt: string,
): AnalysisResponse {
  const evidence: Evidence[] = [];
  const defKey: Record<string, string> = {};

  for (const { key, place, radius } of inputs) {
    const center = { lng: place.lng, lat: place.lat };
    const m = radiusMetrics(
      center,
      radius.stores.map((s) => ({
        source_store_id: s.bizesId,
        location: { lng: s.lng, lat: s.lat },
        app_industry: s.indsSclsCd === cafeCode ? "cafe" : "other",
      })),
      "cafe",
      DEFAULT_RADIUS_M,
      radius.complete,
    );
    const status = m ? "ok" : "not_loaded";
    const scope = { area_type: "radius" as const, radius_m: DEFAULT_RADIUS_M, center };
    const base = {
      candidate: key, scope, source_id: "SEMAS" as const, source_period: radius.stdrYm,
      fetched_at: fetchedAt, snapshot_id: radius.complete ? `semas-live-${radius.stdrYm}` : null, status,
    } as const;
    defKey[key] = `SEMAS|r${DEFAULT_RADIUS_M}|${cafeCode}|${radius.stdrYm}`;
    const push = (metric: MetricId, value: number | null, unit: Evidence["unit"], suffix: string) =>
      evidence.push({ id: `E_${suffix}_${key}`, metric, value: m ? value : null, unit, ...base });
    push("competitor_count", m?.competitor_count ?? null, "stores", "COMPETITORS");
    push("total_store_count", m?.total_store_count ?? null, "stores", "TOTAL");
    push("same_industry_share", m?.same_industry_share ?? null, "percent", "SHARE");
    push("nearest_competitor_m", m?.nearest_competitor_m ?? null, "m", "NEAREST");
    // 인구(SGIS)는 1주차 게이트 통과 전까지 미연결 → "자료 없음"
    evidence.push({
      id: `E_POP_${key}`, candidate: key, metric: "dong_population", value: null, unit: "persons",
      scope: { area_type: "admin_dong", code: place.dong_h_code ?? "", name: place.dong_h_name ?? "확인 불가", code_version: "kakao-h_code" },
      source_id: "SGIS", source_period: null, fetched_at: null, snapshot_id: null, status: "missing",
    });
  }

  let comparison: ComparisonRow[] | null = null;
  if (inputs.length === 2) {
    const metrics: MetricId[] = ["competitor_count", "same_industry_share", "nearest_competitor_m", "dong_population"];
    comparison = metrics.map((metric) => {
      const a = evidence.find((e) => e.candidate === "A" && e.metric === metric)!;
      const b = evidence.find((e) => e.candidate === "B" && e.metric === metric)!;
      if (a.status !== "ok" || b.status !== "ok") {
        return { metric, a: a.value, b: b.value, diff: null, relative_pct: null, status: "not_comparable", reason: "한쪽 이상 자료가 없어 비교할 수 없습니다." };
      }
      return compare(metric, { value: a.value, definitionKey: defKey.A }, { value: b.value, definitionKey: defKey.B });
    });
  }

  const incomplete = inputs.filter((i) => !i.radius.complete);
  return {
    analysis_id: id,
    status: incomplete.length === inputs.length ? "failed" : "partial", // 인구 미연결이므로 complete 아님
    industry: "cafe",
    candidates: inputs.map(({ key, place }) => ({
      key, label: place.label || place.address, location: { lng: place.lng, lat: place.lat }, admin_dong: place.dong_h_name,
    })),
    evidence,
    comparison,
    limitations: [
      "점포 수는 직선 반경 500m 안의 상가정보 등록 점포 기준입니다. 현장 전수가 아닙니다.",
      "행정동 인구 자료는 아직 연결되지 않았습니다. 수요 판단에 쓰지 마세요.",
      ...incomplete.map((i) => `후보 ${i.key}: 자료 수집이 완료되지 않았습니다 (${i.radius.reason}).`),
    ],
    ai_status: "fallback",
    ai: ruleBasedSummary(evidence),
    metric_version: METRIC_VERSION,
    is_fixture: false,
  };
}
