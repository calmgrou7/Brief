import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// 고객 공유 리포트 링크. 토큰 = base64url("고객ID.만료일") + "." + 서명.
// DB 없이 위조·추측이 불가능하고 만료일이 박혀 있다.
// 개별 링크 폐기는 2단계(Supabase report_links)에서, 지금은 REPORT_SECRET을 바꾸면 모든 링크가 무효가 된다.

/** 기본 유효기간 */
export const LINK_DAYS = 90;

const DEV_SECRET = "brief-dev-only-secret";

export function reportSecret(): string | null {
  const s = process.env.REPORT_SECRET;
  if (s && s.length >= 16) return s;
  // 운영 환경에서 비밀값이 없으면 링크 기능을 끈다 (예측 가능한 기본값으로 서명하지 않도록)
  return process.env.NODE_ENV === "production" && process.env.BRIEF_ALLOW_DEV_SECRET !== "1" ? null : DEV_SECRET;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createReportToken(clientId: string, expires: string, secret: string): string {
  const payload = Buffer.from(`${clientId}.${expires}`).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export interface VerifiedLink {
  clientId: string;
  expires: string;
}

/** 서명이 맞고 만료 전이면 고객 ID를, 아니면 null */
export function verifyReportToken(token: string, secret: string, today: string): VerifiedLink | null {
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  const decoded = Buffer.from(payload, "base64url").toString();
  const dot = decoded.lastIndexOf(".");
  const clientId = decoded.slice(0, dot);
  const expires = decoded.slice(dot + 1);
  if (!clientId || !/^\d{4}-\d{2}-\d{2}$/.test(expires) || expires < today) return null;
  return { clientId, expires };
}
