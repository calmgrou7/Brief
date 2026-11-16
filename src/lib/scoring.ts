/** 리드 점수 — 1인 운영자가 "누구에게 먼저 전화할지" 자동으로 정렬하기 위한 값 */
export type Grade = "HOT" | "WARM" | "COLD";

export function scoreLead(input: {
  diagnosisScore?: number;
  wantsConsult: boolean;
  phoneVerified: boolean;
  chatTurns?: number;
  interest?: string;
  returning?: boolean;
}): { score: number; grade: Grade } {
  let s = input.diagnosisScore ?? 0; // 최대 60
  if (input.wantsConsult) s += 20;
  if (input.phoneVerified) s += 10;
  s += Math.min(10, (input.chatTurns ?? 0) * 2);
  if (input.interest === "claim") s += 5; // 청구 상담은 즉시 니즈
  if (input.returning) s += 5;
  s = Math.max(0, Math.min(100, Math.round(s)));
  const grade: Grade = s >= 65 ? "HOT" : s >= 40 ? "WARM" : "COLD";
  return { score: s, grade };
}
