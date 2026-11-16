// 개인정보 열람·삭제 요청 (구글플레이 '데이터 삭제 URL' 요구사항 대응)
import { db } from "@/lib/store";
import { normalizePhone, isValidPhone, checkVerifiedProof } from "@/lib/otp";
import { json, bad, clientMeta } from "@/lib/http";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const phone = normalizePhone(b?.phone);
  if (!isValidPhone(phone)) return bad("휴대폰 번호를 확인해주세요");
  if (!checkVerifiedProof(phone, b?.verifiedProof)) return bad("휴대폰 인증을 완료해주세요");
  const type = b?.type === "withdraw_marketing" ? "withdraw_marketing" : "delete";
  await db().insert("privacy_requests", { phone, type, status: "pending", ...clientMeta(req) });
  return json({ ok: true });
}
