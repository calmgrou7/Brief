import { checkOtp, issueVerifiedProof, normalizePhone } from "@/lib/otp";
import { json, bad } from "@/lib/http";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const phone = normalizePhone(body?.phone);
  if (!checkOtp(phone, String(body?.code || ""), String(body?.token || ""))) return bad("인증번호가 올바르지 않거나 만료됐어요");
  return json({ proof: issueVerifiedProof(phone) });
}
