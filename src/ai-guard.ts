/**
 * AI 출력 검증기 + 규칙형 대체 (기획서 6.5절).
 *
 * 흐름: LLM 출력 → validateAiResult() → 실패 시 1회 재생성 → 재실패 시 ruleBasedSummary()
 * LLM은 숫자를 쓰지 않는다. 숫자는 서버가 {{E_ID}} 자리표시자를 치환해 렌더링한다.
 */
import type { AiResult, Evidence } from "../contracts/analysis.ts";

export interface ValidationIssue {
  path: string;
  code:
    | "SCHEMA"
    | "UNKNOWN_EVIDENCE"
    | "MISSING_EVIDENCE"
    | "EVIDENCE_NOT_OK"
    | "PROHIBITED_CLAIM"
    | "RAW_NUMBER";
  detail: string;
}

/** 금지 주장 패턴: 매출·수익 금액, 성공확률, 근거 없는 유동인구, 투자·계약 권유 */
const PROHIBITED_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /(월|일|연)?\s*매출\s*[은는이가]?\s*(약\s*)?[\d,.]+\s*(만|천|억)?\s*원?/, label: "매출 수치" },
  { re: /[\d,.]+\s*(만|천|억)\s*원/, label: "금액" },
  { re: /(예상|추정)\s*(매출|수익|순이익)/, label: "매출 추정" },
  { re: /(성공|실패)\s*(률|확률|가능성)/, label: "성공확률" },
  { re: /(반드시|확실히|무조건)\s*(성공|망|실패)/, label: "성공·실패 단정" },
  { re: /유동\s*인구(가|는)?\s*(많|적|풍부|높|낮)/, label: "근거 없는 유동인구" },
  { re: /(계약|투자|임대)\s*(하세요|하십시오|을 추천|를 추천|권합니다)/, label: "계약·투자 권유" },
  { re: /신뢰도\s*\d+\s*%/, label: "보정되지 않은 신뢰도" },
];

/** {{E_...}} 자리표시자를 제외한 아라비아 숫자는 LLM이 지어낸 값으로 본다. */
const RAW_NUMBER = /\d/;
const PLACEHOLDER = /\{\{(E_[A-Z0-9_]+)\}\}/g;

export function validateAiResult(raw: unknown, evidence: Evidence[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byId = new Map(evidence.map((e) => [e.id, e]));

  if (!isObj(raw)) return [{ path: "$", code: "SCHEMA", detail: "객체가 아님" }];
  for (const key of ["observations", "interpretations", "field_checks", "limitations"]) {
    if (!Array.isArray(raw[key])) issues.push({ path: key, code: "SCHEMA", detail: "배열 필요" });
  }
  if (issues.length) return issues;
  const r = raw as unknown as AiResult;

  /** allowNumbers: 현장 질문의 시간·분 같은 숫자는 통계 주장이 아니므로 허용 (금지 패턴은 그대로 적용) */
  const checkText = (path: string, text: unknown, allowNumbers = false) => {
    if (typeof text !== "string" || !text.trim()) {
      issues.push({ path, code: "SCHEMA", detail: "text 문자열 필요" });
      return;
    }
    for (const { re, label } of PROHIBITED_PATTERNS) {
      if (re.test(text)) issues.push({ path, code: "PROHIBITED_CLAIM", detail: label });
    }
    const placeholders = [...text.matchAll(PLACEHOLDER)].map((m) => m[1]);
    for (const id of placeholders) {
      const ev = byId.get(id);
      if (!ev) issues.push({ path, code: "UNKNOWN_EVIDENCE", detail: id });
      else if (ev.status !== "ok") issues.push({ path, code: "EVIDENCE_NOT_OK", detail: `${id}:${ev.status}` });
    }
    if (!allowNumbers && RAW_NUMBER.test(text.replace(PLACEHOLDER, ""))) {
      issues.push({ path, code: "RAW_NUMBER", detail: "숫자는 {{E_ID}}로만 표기" });
    }
  };

  const checkCited = (group: "observations" | "interpretations") => {
    r[group].forEach((o, i) => {
      const path = `${group}[${i}]`;
      checkText(path, o?.text);
      if (!Array.isArray(o?.evidence_ids) || o.evidence_ids.length === 0) {
        issues.push({ path, code: "MISSING_EVIDENCE", detail: "evidence_ids 필요" });
        return;
      }
      for (const id of o.evidence_ids) {
        const ev = byId.get(id);
        if (!ev) issues.push({ path, code: "UNKNOWN_EVIDENCE", detail: String(id) });
        else if (ev.status !== "ok") issues.push({ path, code: "EVIDENCE_NOT_OK", detail: `${id}:${ev.status}` });
      }
    });
  };
  checkCited("observations");
  checkCited("interpretations");

  r.field_checks.forEach((f, i) => {
    checkText(`field_checks[${i}]`, f?.text, true);
    if (f?.kind !== "hypothesis" && f?.kind !== "checklist_template") {
      issues.push({ path: `field_checks[${i}]`, code: "SCHEMA", detail: "kind 필요" });
    }
  });
  r.limitations.forEach((t, i) => checkText(`limitations[${i}]`, t));
  return issues;
}

/** 서버가 자리표시자를 실제 값으로 치환한다. LLM이 쓴 숫자는 화면에 나가지 않는다. */
export function renderText(text: string, evidence: Evidence[]): string {
  const byId = new Map(evidence.map((e) => [e.id, e]));
  return text.replace(PLACEHOLDER, (_, id: string) => {
    const ev = byId.get(id);
    if (!ev || ev.value === null) return "확인 불가";
    const unit = { stores: "곳", percent: "%", m: "m", persons: "명" }[ev.unit];
    return `${ev.value.toLocaleString("ko-KR")}${unit}`;
  });
}

/** 업종별 현장 질문 템플릿 (카페) */
export const CAFE_FIELD_CHECKS: string[] = [
  "평일 점심(12~13시)과 주말 오후에 후보지 앞 보행 흐름을 각각 10분씩 세어 보세요.",
  "가장 가까운 경쟁 카페의 아메리카노 가격대와 대기줄을 확인해 보세요.",
  "주차·자전거 거치 공간과 언덕·횡단보도 등 접근 동선을 걸어서 확인해 보세요.",
  "주변 사무실·학교·관광지의 운영 시간과 휴무일(계절성)을 확인해 보세요.",
  "건물 1층 가시성과 간판 설치 가능 여부를 임대인에게 확인해 보세요.",
];

/** AI 실패·예산 초과·검증 재실패 시 사용. 숫자 없이 근거 ID만 연결한다. */
export function ruleBasedSummary(evidence: Evidence[]): AiResult {
  const get = (c: "A" | "B", m: Evidence["metric"]) =>
    evidence.find((e) => e.candidate === c && e.metric === m);
  const observations: AiResult["observations"] = [];
  const limitations: string[] = [
    "등록된 상가정보 기준이며 현장의 모든 점포를 반영하지 않을 수 있습니다.",
    "점포 수만으로 수익성을 판단할 수 없습니다.",
  ];

  for (const c of ["A", "B"] as const) {
    const comp = get(c, "competitor_count");
    if (!comp) continue;
    if (comp.status === "ok") {
      observations.push({
        text: `후보 ${c}의 직선 반경 안 등록 카페는 {{${comp.id}}}입니다.`,
        evidence_ids: [comp.id],
      });
    } else {
      limitations.push(`후보 ${c}의 경쟁 점포 자료를 확인할 수 없습니다.`);
    }
    const pop = get(c, "dong_population");
    if (!pop || pop.status !== "ok") {
      limitations.push(`후보 ${c}의 행정동 인구 자료가 없어 수요 판단이 제한됩니다.`);
    }
  }

  const a = get("A", "competitor_count");
  const b = get("B", "competitor_count");
  const interpretations: AiResult["interpretations"] = [];
  if (a?.status === "ok" && b?.status === "ok" && a.value !== null && b.value !== null && a.value !== b.value) {
    const more = a.value > b.value ? "A" : "B";
    interpretations.push({
      text: `후보 ${more}의 반경 안 등록 카페가 더 많습니다. 경쟁이 적다고 좋은 입지라는 뜻은 아니며, 수요가 적을 가능성도 있습니다.`,
      evidence_ids: [a.id, b.id],
    });
  }

  return {
    observations,
    interpretations,
    field_checks: CAFE_FIELD_CHECKS.slice(0, 3).map((text) => ({ text, kind: "checklist_template" as const })),
    limitations: [...new Set(limitations)],
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
