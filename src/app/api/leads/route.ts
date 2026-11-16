/**
 * 리드(고객 DB) 접수 — 웹/미니앱/앱 공통 엔드포인트.
 * 같은 휴대폰 번호는 하나의 고객으로 합치고, 유입 채널 이력(channels)을 누적합니다.
 */
import { db } from "@/lib/store";
import { normalizePhone, isValidPhone, checkVerifiedProof } from "@/lib/otp";
import { consentItems, CONSENT_VERSION, type ConsentKey } from "@/lib/consent";
import { scoreLead } from "@/lib/scoring";
import { notifyLead } from "@/lib/notify";
import { normalizeChannel } from "@/lib/config";
import { json, bad, clientMeta } from "@/lib/http";

const INTERESTS = ["claim", "check", "remodel", "new", "etc"];

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return bad("잘못된 요청입니다");

  const name = String(b.name || "").trim().slice(0, 30);
  const phone = normalizePhone(b.phone);
  const birthYear = Number(b.birthYear) || null;
  const interest = INTERESTS.includes(b.interest) ? b.interest : "etc";
  const channel = normalizeChannel(b.channel);
  const consents = (b.consents || {}) as Partial<Record<ConsentKey, boolean>>;
  const diagnosisId = b.diagnosisId ? String(b.diagnosisId) : null;

  if (!name) return bad("이름을 입력해주세요");
  if (!isValidPhone(phone)) return bad("휴대폰 번호를 확인해주세요");
  if (birthYear && (birthYear < 1930 || birthYear > new Date().getFullYear())) return bad("출생연도를 확인해주세요");

  // 필수 동의 검증
  const items = consentItems({ withDiagnosis: !!diagnosisId });
  for (const it of items) if (it.required && !consents[it.key]) return bad(`${it.label} 항목에 동의해주세요`);

  const phoneVerified = checkVerifiedProof(phone, b.verifiedProof);
  if (!phoneVerified && process.env.REQUIRE_PHONE_VERIFY !== "false") return bad("휴대폰 인증을 완료해주세요");

  const s = db();
  const diagnosis = diagnosisId ? await s.get("diagnoses", diagnosisId) : null;
  const chatTurns = b.anonId ? (await s.list("chat_messages", { eq: { anon_id: b.anonId, role: "user" }, limit: 50 })).length : 0;
  const existing = await s.findOne("leads", { phone });

  const { score, grade } = scoreLead({
    diagnosisScore: Number(diagnosis?.score) || 0,
    wantsConsult: b.wantsConsult !== false,
    phoneVerified,
    chatTurns,
    interest,
    returning: !!existing,
  });

  const now = new Date().toISOString();
  const utm = typeof b.utm === "object" && b.utm ? b.utm : {};
  const fields = {
    name, phone, birth_year: birthYear, interest, memo_customer: String(b.message || "").slice(0, 500) || null,
    phone_verified: phoneVerified, score, grade,
    diagnosis_id: diagnosisId, last_channel: channel, updated_at: now,
    marketing_opt_in: !!consents.marketing, third_party_opt_in: !!consents.third_party,
  };

  let lead;
  if (existing) {
    const channels = Array.from(new Set([...(((existing.channels as string[]) || [])), channel]));
    lead = await s.update("leads", existing.id as string, {
      ...fields,
      // 재신청 시 빈 값으로 기존 정보를 덮어쓰지 않음 (수신 철회는 /privacy 요청으로만 처리)
      diagnosis_id: diagnosisId || existing.diagnosis_id || null,
      birth_year: birthYear || existing.birth_year || null,
      memo_customer: fields.memo_customer || existing.memo_customer || null,
      marketing_opt_in: fields.marketing_opt_in || !!existing.marketing_opt_in,
      third_party_opt_in: fields.third_party_opt_in || !!existing.third_party_opt_in,
      channels,
      score: Math.max(score, Number(existing.score) || 0),
      grade: (Number(existing.score) || 0) > score ? existing.grade : grade,
      status: existing.status === "lost" ? "new" : existing.status,
    });
  } else {
    lead = await s.insert("leads", {
      ...fields, channels: [channel], first_channel: channel, status: "new",
      anon_id: String(b.anonId || "").slice(0, 64) || null,
      utm_source: utm.source || null, utm_medium: utm.medium || null, utm_campaign: utm.campaign || null,
    });
  }
  const leadId = (lead as { id: string }).id;

  // 동의 이력은 항목별로 영구 기록 (감사·분쟁 대응)
  const meta = clientMeta(req);
  for (const it of items)
    await s.insert("consents", { lead_id: leadId, consent_key: it.key, version: CONSENT_VERSION, agreed: !!consents[it.key], channel, ...meta });

  if (diagnosis && !diagnosis.lead_id) await s.update("diagnoses", diagnosisId!, { lead_id: leadId });

  await notifyLead({
    event: existing ? "lead.returning" : "lead.created",
    id: leadId, name, phone, grade, score, interest, channel,
    findings: ((diagnosis?.findings as { title: string }[]) || []).map((f) => f.title),
    message: fields.memo_customer, created_at: now,
  });

  return json({ ok: true, id: leadId });
}
