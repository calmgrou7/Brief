/**
 * 30초 보험 점검 — 문항 정의 + 규칙 기반 결과 생성.
 * 클라이언트(문항 렌더링)와 서버(결과 계산) 양쪽에서 같이 씁니다.
 * ※ 결과는 "가능성 안내"이며 실제 보장·지급 여부는 약관과 심사로 결정됩니다.
 */

export type Answers = {
  age?: string;
  gender?: string;
  family?: string;
  owned?: string[];
  hospital?: string[];
  claimed?: string;
  premium?: string;
  concern?: string;
};

export type Question = {
  id: keyof Answers;
  title: string;
  hint?: string;
  multi?: boolean;
  options: { value: string; label: string }[];
};

export const QUESTIONS: Question[] = [
  {
    id: "age",
    title: "나이대가 어떻게 되세요?",
    options: [
      { value: "20s", label: "20대" },
      { value: "30s", label: "30대" },
      { value: "40s", label: "40대" },
      { value: "50s", label: "50대" },
      { value: "60s", label: "60대 이상" },
    ],
  },
  {
    id: "gender",
    title: "성별을 알려주세요",
    hint: "성별에 따라 필요한 보장이 달라요",
    options: [
      { value: "F", label: "여성" },
      { value: "M", label: "남성" },
    ],
  },
  {
    id: "family",
    title: "가족 구성은요?",
    options: [
      { value: "single", label: "1인 가구" },
      { value: "couple", label: "부부" },
      { value: "kids", label: "자녀가 있어요" },
      { value: "parents", label: "부모님을 부양해요" },
    ],
  },
  {
    id: "owned",
    title: "가입한 보험을 모두 골라주세요",
    hint: "정확하지 않아도 괜찮아요",
    multi: true,
    options: [
      { value: "silson", label: "실손(실비)보험" },
      { value: "diagnosis", label: "암·뇌·심장 진단비" },
      { value: "life", label: "종신·정기보험" },
      { value: "driver", label: "운전자보험" },
      { value: "child", label: "어린이(태아)보험" },
      { value: "dental", label: "치아보험" },
      { value: "care", label: "간병·치매보험" },
      { value: "unknown", label: "잘 모르겠어요" },
    ],
  },
  {
    id: "hospital",
    title: "최근 3년 안에 이런 적 있으세요?",
    hint: "본인 기준, 해당하는 것 모두",
    multi: true,
    options: [
      { value: "outpatient", label: "병원 통원·약국" },
      { value: "inpatient", label: "입원" },
      { value: "surgery", label: "수술 (내시경 용종 제거 포함)" },
      { value: "fracture", label: "골절·깁스" },
      { value: "dental", label: "치과 치료 (크라운·임플란트 등)" },
      { value: "accident", label: "교통사고" },
      { value: "none", label: "없어요" },
    ],
  },
  {
    id: "claimed",
    title: "그때 보험금은 청구하셨어요?",
    options: [
      { value: "all", label: "빠짐없이 청구했어요" },
      { value: "some", label: "일부만 했어요" },
      { value: "none", label: "청구 안 했어요" },
      { value: "unknown", label: "잘 기억 안 나요" },
    ],
  },
  {
    id: "premium",
    title: "한 달 보험료는 대략 얼마예요?",
    options: [
      { value: "lt10", label: "10만원 미만" },
      { value: "10to20", label: "10~20만원" },
      { value: "20to30", label: "20~30만원" },
      { value: "gt30", label: "30만원 이상" },
      { value: "unknown", label: "잘 몰라요" },
    ],
  },
  {
    id: "concern",
    title: "가장 신경 쓰이는 건 뭐예요?",
    options: [
      { value: "cost", label: "보험료가 부담돼요" },
      { value: "gap", label: "보장이 부족할까 봐요" },
      { value: "claim", label: "청구 방법을 몰라요" },
      { value: "renewal", label: "갱신 때 보험료가 올라요" },
      { value: "unsure", label: "뭐가 문제인지도 모르겠어요" },
    ],
  },
];

export type Finding = {
  kind: "claim" | "gap" | "cost" | "check";
  severity: 1 | 2 | 3; // 3 = 가장 중요
  title: string;
  detail: string;
  claimSlug?: string; // 청구 가이드 연결
};

const has = (arr: string[] | undefined, v: string) => Array.isArray(arr) && arr.includes(v);

export function analyze(a: Answers): { findings: Finding[]; score: number } {
  const f: Finding[] = [];
  const owned = a.owned || [];
  const hosp = (a.hospital || []).filter((h) => h !== "none");
  const notAllClaimed = a.claimed && a.claimed !== "all";
  const unknownOwned = has(owned, "unknown") || owned.length === 0;

  // ── 1) 숨은 보험금(청구 누락) ──
  if (hosp.length && notAllClaimed) {
    if (has(hosp, "surgery"))
      f.push({
        kind: "claim", severity: 3, claimSlug: "surgery",
        title: "수술비 청구 누락 가능성",
        detail: "실손 외에 '수술비 특약'이 있으면 정액으로 따로 받을 수 있어요. 내시경 중 용종 제거도 수술로 인정되는 경우가 많습니다.",
      });
    if (has(hosp, "inpatient"))
      f.push({
        kind: "claim", severity: 3, claimSlug: "inpatient",
        title: "입원일당·입원비 청구 누락 가능성",
        detail: "입원 1일당 정액을 주는 특약이 흔해요. 실손과 별개로 청구할 수 있습니다.",
      });
    if (has(hosp, "fracture"))
      f.push({
        kind: "claim", severity: 2, claimSlug: "fracture",
        title: "골절진단비 청구 누락 가능성",
        detail: "골절진단비·깁스치료비 특약은 금액은 작아도 놓치기 쉬운 대표 항목이에요.",
      });
    if (has(hosp, "dental"))
      f.push({
        kind: "claim", severity: 2, claimSlug: "dental",
        title: "치과 치료비 청구 확인 필요",
        detail: "치아보험이나 상해 특약이 있으면 크라운·임플란트·사고로 인한 치료를 청구할 수 있어요.",
      });
    if (has(hosp, "accident"))
      f.push({
        kind: "claim", severity: 3, claimSlug: "accident",
        title: "교통사고 관련 보험금 확인 필요",
        detail: "자동차보험 외에 운전자보험·상해 특약(부상치료비, 상해입원일당)을 중복으로 받을 수 있는 경우가 있어요.",
      });
    if (has(hosp, "outpatient") && has(owned, "silson"))
      f.push({
        kind: "claim", severity: 1, claimSlug: "outpatient",
        title: "소액 통원·약제비 미청구 가능성",
        detail: "몇 만 원짜리 통원비도 3년 안이면 모아서 청구할 수 있어요. 병원·약국 영수증이 있으면 됩니다.",
      });
  }

  // ── 2) 보장 공백 ──
  const ageN = { "20s": 20, "30s": 30, "40s": 40, "50s": 50, "60s": 60 }[a.age || ""] ?? 30;
  if (!unknownOwned && !has(owned, "silson"))
    f.push({ kind: "gap", severity: 3, title: "실손보험 공백", detail: "병원비 대부분을 돌려받는 기본 보험이 확인되지 않아요. 가입 가능 여부부터 점검해보세요." });
  if (!unknownOwned && !has(owned, "diagnosis") && ageN >= 30)
    f.push({ kind: "gap", severity: 3, title: "3대 질병 진단비 공백", detail: "암·뇌·심장 진단 시 생활비를 받는 진단비가 없으면 치료 기간 소득 공백을 메우기 어려워요." });
  if (a.family === "kids" && !has(owned, "child") && !unknownOwned)
    f.push({ kind: "gap", severity: 2, title: "자녀 보장 점검 필요", detail: "자녀 실손·어린이보험 가입 여부를 함께 확인하는 게 좋아요." });
  if ((a.family === "kids" || a.family === "couple" || a.family === "parents") && !has(owned, "life") && !unknownOwned)
    f.push({ kind: "gap", severity: 2, title: "가족 생활비 보장(사망) 공백", detail: "부양가족이 있다면 소득을 대신할 정기·종신보험 보장을 점검해보세요." });
  if (ageN >= 50 && !has(owned, "care") && !unknownOwned)
    f.push({ kind: "gap", severity: 2, title: "간병·치매 대비 공백", detail: "50대 이후엔 간병인 비용 보장이 중요한데 확인되지 않아요." });

  // ── 3) 보험료 ──
  if (a.premium === "gt30" && ageN < 50)
    f.push({ kind: "cost", severity: 2, title: "보험료 과다 가능성", detail: "연령 대비 보험료가 높은 편이에요. 중복 보장이나 불필요한 특약이 있는지 점검해볼 만해요." });
  if (a.concern === "renewal")
    f.push({ kind: "cost", severity: 2, title: "갱신형 인상 리스크", detail: "갱신형 특약 비중이 크면 나이가 들수록 보험료가 크게 오를 수 있어요. 비갱신 전환 여부를 확인해보세요." });

  // ── 4) 가입내역 모름 ──
  if (unknownOwned || a.premium === "unknown")
    f.push({
      kind: "check", severity: 2,
      title: "가입 내역 확인이 먼저예요",
      detail: "신용정보원 '내보험다보여'에서 가입한 보험을 무료로 한 번에 조회할 수 있어요. 조회 결과를 가지고 상담하면 훨씬 정확해요.",
    });

  f.sort((x, y) => y.severity - x.severity);

  // 진단 점수(관심도·니즈 강도). 리드 점수 계산에 쓰입니다.
  let score = f.reduce((s, x) => s + x.severity * 6, 0);
  if (a.concern && a.concern !== "unsure") score += 5;
  score = Math.min(60, score);
  return { findings: f, score };
}
