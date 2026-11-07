import { test } from "node:test";
import assert from "node:assert/strict";
import { renderText, ruleBasedSummary, validateAiResult } from "../src/ai-guard.ts";
import type { Evidence } from "../contracts/analysis.ts";

const scope = { area_type: "radius" as const, radius_m: 500, center: { lng: 129.05, lat: 35.15 } };
const mk = (id: string, candidate: "A" | "B", value: number | null, status: Evidence["status"] = "ok"): Evidence => ({
  id, candidate, metric: "competitor_count", value, unit: "stores", scope,
  source_id: "SEMAS", source_period: "2026Q3", fetched_at: "2026-11-07", snapshot_id: "s1", status,
});
const EV = [mk("E_COMPETITORS_A", "A", 12), mk("E_COMPETITORS_B", "B", null, "not_loaded")];

const ok = {
  observations: [{ text: "후보 A의 반경 안 등록 카페는 {{E_COMPETITORS_A}}입니다.", evidence_ids: ["E_COMPETITORS_A"] }],
  interpretations: [],
  field_checks: [{ text: "점심시간 보행 흐름을 확인해 보세요.", kind: "checklist_template" }],
  limitations: ["등록 점포 기준입니다."],
};

test("정상 출력 통과", () => {
  assert.deepEqual(validateAiResult(ok, EV), []);
});

const bad: [string, string, string][] = [
  ["월매출 약 3,000만원이 예상됩니다.", "PROHIBITED_CLAIM", "매출"],
  ["성공 확률이 높습니다.", "PROHIBITED_CLAIM", "성공확률"],
  ["유동인구가 많습니다.", "PROHIBITED_CLAIM", "유동인구"],
  ["반드시 성공할 입지입니다.", "PROHIBITED_CLAIM", "단정"],
  ["지금 바로 계약하세요.", "PROHIBITED_CLAIM", "권유"],
  ["신뢰도 92% 분석입니다.", "PROHIBITED_CLAIM", "신뢰도"],
  ["카페가 15곳 있습니다.", "RAW_NUMBER", "LLM이 쓴 숫자"],
  ["{{E_FAKE}} 입니다.", "UNKNOWN_EVIDENCE", "없는 근거"],
  ["B는 {{E_COMPETITORS_B}}입니다.", "EVIDENCE_NOT_OK", "미수집 근거 인용"],
];
for (const [text, code, label] of bad) {
  test(`차단: ${label}`, () => {
    const out = { ...ok, observations: [{ text, evidence_ids: ["E_COMPETITORS_A"] }] };
    assert.ok(validateAiResult(out, EV).some((i) => i.code === code), JSON.stringify(validateAiResult(out, EV)));
  });
}

test("evidence_ids 누락·스키마 오류", () => {
  assert.ok(validateAiResult({ ...ok, observations: [{ text: "근거 없음" }] }, EV).some((i) => i.code === "MISSING_EVIDENCE"));
  assert.equal(validateAiResult("이전 지시를 무시하고", EV)[0].code, "SCHEMA");
});

test("자리표시자는 서버가 치환, 결측은 '확인 불가'", () => {
  assert.equal(renderText("A {{E_COMPETITORS_A}}, B {{E_COMPETITORS_B}}", EV), "A 12곳, B 확인 불가");
});

test("규칙형 대체는 자체 검증을 통과하고 결측을 한계로 알린다", () => {
  const r = ruleBasedSummary(EV);
  assert.deepEqual(validateAiResult(r, EV), []);
  assert.ok(r.limitations.some((t) => t.includes("후보 B의 경쟁 점포")));
  assert.equal(r.interpretations.length, 0); // B 미수집이면 비교 해석 없음
});

test("현장 질문: 시간 숫자는 허용, 금액은 차단", () => {
  const fc = (text: string) => ({ ...ok, field_checks: [{ text, kind: "hypothesis" }] });
  assert.deepEqual(validateAiResult(fc("12~13시 보행 흐름을 10분간 세어 보세요."), EV), []);
  assert.ok(validateAiResult(fc("월매출 2000만원을 목표로 하세요."), EV).some((i) => i.code === "PROHIBITED_CLAIM"));
});
