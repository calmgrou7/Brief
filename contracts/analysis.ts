/**
 * 상권첫걸음 — 분석 API 응답 계약 (기획서 6.9절)
 *
 * Lovable 화면과 서버 구현이 공유하는 단일 소스.
 * UI는 이 타입의 값만 렌더링하고, 숫자를 직접 계산하지 않는다.
 */

export type AppIndustry = "cafe";

/** 자료 상태. 0과 null, 미수집을 반드시 구분한다 (6.3, 4.2). */
export type EvidenceStatus =
  | "ok" // 완전 스냅샷에서 계산된 값 (0 포함)
  | "not_loaded" // 수집 전·수집 실패 → UI: "확인 불가"
  | "missing" // 원천에 값 없음 → UI: "자료 없음"
  | "suppressed" // 원천 마스킹·비공개
  | "not_comparable"; // 정의·시점·공간 기준 불일치 → UI: "직접 비교 불가"

export type AreaScope =
  | { area_type: "radius"; radius_m: number; center: LngLat }
  | { area_type: "admin_dong"; code: string; name: string; code_version: string };

/** 순서 주의: 경도, 위도 (6.3-5) */
export type LngLat = { lng: number; lat: number };

export type MetricId =
  | "competitor_count"
  | "same_industry_share"
  | "nearest_competitor_m"
  | "total_store_count"
  | "dong_population"
  | "dong_age_share";

export type SourceId = "SEMAS" | "SGIS" | "KOSIS" | "SEOUL_GOLMOK" | "LOCALDATA";

export interface Evidence {
  id: string; // 예: "E_COMPETITORS_A"
  candidate: "A" | "B";
  metric: MetricId;
  value: number | null;
  unit: "stores" | "percent" | "m" | "persons";
  scope: AreaScope;
  source_id: SourceId;
  source_period: string | null; // 원자료 기준시점 (수집일과 별개)
  fetched_at: string | null; // 수집일
  snapshot_id: string | null;
  status: EvidenceStatus;
  breakdown?: Record<string, number | null>; // 연령대 구성 등
}

export interface AiObservation {
  text: string;
  evidence_ids: string[];
}

export interface AiFieldCheck {
  text: string;
  kind: "hypothesis" | "checklist_template";
}

export interface AiResult {
  observations: AiObservation[];
  interpretations: AiObservation[];
  field_checks: AiFieldCheck[];
  limitations: string[];
}

export type AiStatus = "pending" | "ok" | "fallback" | "disabled";

export interface AnalysisResponse {
  analysis_id: string;
  status: "pending" | "complete" | "partial" | "failed";
  industry: AppIndustry;
  candidates: { key: "A" | "B"; label: string; location: LngLat; admin_dong: string | null }[];
  evidence: Evidence[];
  /** 같은 정의일 때만 채워짐. 다르면 reason을 표시 */
  comparison: ComparisonRow[] | null;
  limitations: string[];
  ai_status: AiStatus;
  ai: AiResult | null;
  metric_version: string;
  is_fixture: boolean; // true면 UI에 "가상 데이터" 배지 필수
}

export interface ComparisonRow {
  metric: MetricId;
  a: number | null;
  b: number | null;
  diff: number | null; // A - B
  relative_pct: number | null; // B가 0이거나 null이면 null
  status: "ok" | "same_background" | "not_comparable";
  reason?: string;
}

export type ApiErrorCode =
  | "INVALID_INPUT" // 400
  | "OUTSIDE_COVERAGE" // 422
  | "RATE_LIMITED" // 429
  | "DATA_UNAVAILABLE"; // 503

/** AI가 절대 만들어선 안 되는 주장 (6.5) */
export const PROHIBITED_CLAIMS = [
  "individual_sales",
  "success_probability",
  "real_time_footfall",
] as const;

export const SUPPORTED_GU = ["부산진구", "수영구", "해운대구"] as const;
export const DEFAULT_RADIUS_M = 500;
export const METRIC_VERSION = "m1";
