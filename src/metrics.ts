/**
 * 지표 계산 (기획서 6.4절).
 *
 * 운영에서는 PostGIS geography로 계산한다. 이 모듈은
 *  1) fixture·규칙형 대체 생성, 2) PostGIS 결과와 대조하는 "독립 계산" 용도다.
 */
import type { ComparisonRow, LngLat, MetricId } from "../contracts/analysis.ts";

export interface StoreRow {
  source_store_id: string;
  location: LngLat;
  app_industry: string | null; // 매핑 결과. 미매핑은 null
}

const EARTH_RADIUS_M = 6_371_008.8;

/** 대권거리(m). PostGIS ST_Distance(geography)와 수 m 이내 일치해야 한다. */
export function haversineM(a: LngLat, b: LngLat): number {
  assertLngLat(a);
  assertLngLat(b);
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** 한국 범위 밖이면 경위도 뒤바뀜을 의심한다. */
export function assertLngLat(p: LngLat): void {
  if (!(p.lng >= 124 && p.lng <= 132 && p.lat >= 33 && p.lat <= 39)) {
    throw new RangeError(`좌표가 국내 범위 밖이거나 경도/위도가 뒤바뀜: ${JSON.stringify(p)}`);
  }
}

export interface RadiusMetrics {
  competitor_count: number;
  total_store_count: number;
  same_industry_share: number | null; // 전체 0이면 null
  nearest_competitor_m: number | null; // 동종 0이면 null
}

/**
 * @param complete 스냅샷이 완전 수집됐는지. false면 집계하지 않는다(0 ≠ 미수집).
 */
export function radiusMetrics(
  center: LngLat,
  stores: StoreRow[],
  industry: string,
  radiusM: number,
  complete: boolean,
): RadiusMetrics | null {
  if (!complete) return null;
  const seen = new Set<string>();
  let total = 0;
  let same = 0;
  let nearest: number | null = null;
  for (const s of stores) {
    if (seen.has(s.source_store_id)) continue; // 고유 점포 ID 기준
    const d = haversineM(center, s.location);
    if (d > radiusM) continue;
    seen.add(s.source_store_id);
    total++;
    if (s.app_industry === industry) {
      same++;
      if (nearest === null || d < nearest) nearest = d;
    }
  }
  return {
    competitor_count: same,
    total_store_count: total,
    same_industry_share: total === 0 ? null : round1((same / total) * 100),
    nearest_competitor_m: nearest === null ? null : Math.round(nearest),
  };
}

/** A/B 비교 행. 정의가 다르면 계산하지 않는다. */
export function compare(
  metric: MetricId,
  a: { value: number | null; definitionKey: string },
  b: { value: number | null; definitionKey: string },
  opts: { sameBackground?: boolean } = {},
): ComparisonRow {
  if (a.definitionKey !== b.definitionKey) {
    return {
      metric, a: a.value, b: b.value, diff: null, relative_pct: null,
      status: "not_comparable", reason: "기준시점·분류·공간범위가 달라 직접 비교할 수 없습니다.",
    };
  }
  if (opts.sameBackground) {
    return {
      metric, a: a.value, b: b.value, diff: null, relative_pct: null,
      status: "same_background", reason: "두 후보가 같은 행정동이라 같은 배경 정보입니다.",
    };
  }
  const diff = a.value === null || b.value === null ? null : round1(a.value - b.value);
  const relative_pct =
    diff === null || b.value === null || b.value === 0 ? null : round1((diff / b.value) * 100);
  return { metric, a: a.value, b: b.value, diff, relative_pct, status: "ok" };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
