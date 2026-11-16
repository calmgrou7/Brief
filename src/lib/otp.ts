/**
 * 휴대폰 인증 — 서버에 상태를 저장하지 않는 서명 토큰 방식(서버리스 친화).
 * token = base64url(phone.exp.hmac(phone|code|exp))
 */
import "server-only";
import crypto from "crypto";

const TTL_MS = 3 * 60 * 1000;
const secret = () => process.env.OTP_SECRET || "dev-secret";
const sign = (s: string) => crypto.createHmac("sha256", secret()).update(s).digest("base64url");

export const normalizePhone = (p: string) => (p || "").replace(/[^0-9]/g, "");
export const isValidPhone = (p: string) => /^01[016789][0-9]{7,8}$/.test(p);

export function issueOtp(phone: string) {
  const code = String(crypto.randomInt(100000, 1000000));
  const exp = Date.now() + TTL_MS;
  const token = Buffer.from(`${phone}.${exp}.${sign(`${phone}|${code}|${exp}`)}`).toString("base64url");
  return { code, token, exp };
}

export function checkOtp(phone: string, code: string, token: string): boolean {
  try {
    const [p, expStr, sig] = Buffer.from(token, "base64url").toString().split(".");
    const exp = Number(expStr);
    if (p !== phone || !exp || Date.now() > exp) return false;
    const expected = sign(`${phone}|${code}|${exp}`);
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** 인증 완료 증명 토큰 (리드 제출 시 함께 전송) — 30분 유효 */
export function issueVerifiedProof(phone: string) {
  const exp = Date.now() + 30 * 60 * 1000;
  return Buffer.from(`${phone}.${exp}.${sign(`verified|${phone}|${exp}`)}`).toString("base64url");
}
export function checkVerifiedProof(phone: string, proof?: string): boolean {
  if (!proof) return false;
  try {
    const [p, expStr, sig] = Buffer.from(proof, "base64url").toString().split(".");
    const exp = Number(expStr);
    if (p !== phone || Date.now() > exp) return false;
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(`verified|${phone}|${exp}`)));
  } catch {
    return false;
  }
}

/** SOLAPI 문자 발송. 키가 없으면 false 반환(개발 모드에서 화면 표시). */
export async function sendSms(to: string, text: string): Promise<boolean> {
  const key = process.env.SOLAPI_API_KEY;
  const sec = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER;
  if (!key || !sec || !from) return false;
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto.createHmac("sha256", sec).update(date + salt).digest("hex");
  const res = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${signature}`,
    },
    body: JSON.stringify({ message: { to, from, text } }),
  });
  if (!res.ok) throw new Error(`SMS 발송 실패 (${res.status})`);
  return true;
}
