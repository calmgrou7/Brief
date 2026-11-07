import { test } from "node:test";
import assert from "node:assert/strict";
import { compare, haversineM, radiusMetrics, type StoreRow } from "../src/metrics.ts";

const C = { lng: 129.0592, lat: 35.1578 };
// 위도 1도 ≈ 111.2km → 0.0045도 ≈ 500m
const north = (m: number) => ({ lng: C.lng, lat: C.lat + m / 111_195 });

test("haversine: 북쪽 500m", () => {
  assert.ok(Math.abs(haversineM(C, north(500)) - 500) < 1);
});

test("경도/위도 뒤바뀜은 예외", () => {
  assert.throws(() => haversineM({ lng: 35.15, lat: 129.05 }, C), RangeError);
});

test("반경 경계·중복 ID·업종 비중", () => {
  const stores: StoreRow[] = [
    { source_store_id: "1", location: north(100), app_industry: "cafe" },
    { source_store_id: "1", location: north(100), app_industry: "cafe" }, // 중복
    { source_store_id: "2", location: north(499), app_industry: "cafe" },
    { source_store_id: "3", location: north(501), app_industry: "cafe" }, // 반경 밖
    { source_store_id: "4", location: north(200), app_industry: "restaurant" },
    { source_store_id: "5", location: north(300), app_industry: null },
  ];
  const m = radiusMetrics(C, stores, "cafe", 500, true)!;
  assert.equal(m.competitor_count, 2);
  assert.equal(m.total_store_count, 4);
  assert.equal(m.same_industry_share, 50);
  assert.equal(m.nearest_competitor_m, 100);
});

test("미완전 스냅샷은 0이 아니라 null", () => {
  assert.equal(radiusMetrics(C, [], "cafe", 500, false), null);
});

test("완전 스냅샷 + 점포 0 → 비중 null, 최근접 null", () => {
  const m = radiusMetrics(C, [], "cafe", 500, true)!;
  assert.equal(m.competitor_count, 0);
  assert.equal(m.same_industry_share, null);
  assert.equal(m.nearest_competitor_m, null);
});

test("비교: 정의 불일치, B=0, 같은 행정동", () => {
  assert.equal(compare("competitor_count", { value: 3, definitionKey: "x" }, { value: 2, definitionKey: "y" }).status, "not_comparable");
  const z = compare("competitor_count", { value: 3, definitionKey: "x" }, { value: 0, definitionKey: "x" });
  assert.equal(z.diff, 3);
  assert.equal(z.relative_pct, null);
  assert.equal(compare("dong_population", { value: 1, definitionKey: "x" }, { value: 1, definitionKey: "x" }, { sameBackground: true }).status, "same_background");
});
