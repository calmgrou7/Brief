import { createHmac, timingSafeEqual } from "node:crypto";

// 운영자 로그인 세션 토큰 = "만료일.서명". 서명 키는 운영자 비밀번호에서 만든다.
// 그래서 비밀번호를 바꾸면 기존 로그인이 모두 풀린다. 순수 함수라 테스트로 고정한다.

export const SESSION_DAYS = 30;

function key(password: string): string {
  return createHmac("sha256", "brief-owner-session").update(password).digest("hex");
}

function sign(payload: string, password: string): string {
  return createHmac("sha256", key(password)).update(payload).digest("base64url");
}

export function createSession(expires: string, password: string): string {
  return `${expires}.${sign(expires, password)}`;
}

export function verifySession(token: string | undefined, password: string, today: string): boolean {
  if (!token) return false;
  const [expires, sig, extra] = token.split(".");
  if (!expires || !sig || extra !== undefined || !/^\d{4}-\d{2}-\d{2}$/.test(expires)) return false;
  const expected = Buffer.from(sign(expires, password));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  return expires >= today;
}

/** 비밀번호 비교 (길이·내용으로 시간이 새지 않도록 해시끼리 비교) */
export function passwordMatches(given: string, actual: string): boolean {
  const a = createHmac("sha256", "brief-pw").update(given).digest();
  const b = createHmac("sha256", "brief-pw").update(actual).digest();
  return timingSafeEqual(a, b);
}

/** 로그인 후 돌아갈 주소. 외부 사이트로 튕기는 것을 막는다. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
