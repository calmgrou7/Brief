import { issueOtp, normalizePhone, isValidPhone, sendSms } from "@/lib/otp";
import { config } from "@/lib/config";
import { json, bad } from "@/lib/http";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const phone = normalizePhone(body?.phone);
  if (!isValidPhone(phone)) return bad("휴대폰 번호를 확인해주세요");
  const { code, token } = issueOtp(phone);
  const sent = await sendSms(phone, `[${config.siteName}] 인증번호 ${code} (3분 이내 입력)`).catch((e) => {
    console.error(e);
    return false;
  });
  const devMode = process.env.OTP_DEV_MODE === "true";
  if (!sent && !devMode) return bad("문자 발송에 실패했어요. 잠시 후 다시 시도해주세요", 502);
  return json({ token, ...(devMode && !sent ? { devCode: code } : {}) });
}
