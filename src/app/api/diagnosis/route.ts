import { db } from "@/lib/store";
import { analyze, type Answers } from "@/lib/diagnosis";
import { normalizeChannel } from "@/lib/config";
import { json, bad } from "@/lib/http";

// 점검 결과 저장 (개인정보 없이 anon_id로만 저장 → 리드 제출 시 연결)
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.answers) return bad("answers가 필요합니다");
  const answers = body.answers as Answers;
  const { findings, score } = analyze(answers);
  const row = await db().insert("diagnoses", {
    anon_id: String(body.anonId || "").slice(0, 64) || null,
    channel: normalizeChannel(body.channel),
    answers,
    findings,
    score,
  });
  return json({ id: row.id });
}
