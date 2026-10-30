import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { addDays, today } from "./dates";
import { createSession, SESSION_DAYS, verifySession } from "./session";

// 운영자 로그인. 1인 운영이라 계정 대신 비밀번호 하나(OWNER_PASSWORD)로 잠근다.
// - 비밀번호 설정됨: 로그인해야 운영자 화면·버튼 사용 가능
// - 미설정 + 개발 모드(npm run dev): 잠금 없이 열림
// - 미설정 + 운영 모드: 잠김 (로그인 화면에 설정 안내)

export const SESSION_COOKIE = "brief_owner";

export type AuthMode = "password" | "open" | "locked";

export function ownerPassword(): string | null {
  const p = process.env.OWNER_PASSWORD;
  return p && p.length >= 8 ? p : null;
}

export function authMode(): AuthMode {
  if (ownerPassword()) return "password";
  return process.env.NODE_ENV === "production" ? "locked" : "open";
}

export async function isOwner(): Promise<boolean> {
  const mode = authMode();
  if (mode === "open") return true;
  const pw = ownerPassword();
  if (!pw) return false;
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value, pw, today());
}

/** 운영자 화면 맨 앞에서 호출. 로그인이 안 되어 있으면 로그인 화면으로 보낸다. */
export async function requireOwner(currentPath: string): Promise<void> {
  if (!(await isOwner())) redirect(`/login?next=${encodeURIComponent(currentPath)}`);
}

export async function startSession(): Promise<void> {
  const pw = ownerPassword();
  if (!pw) return;
  const expires = addDays(today(), SESSION_DAYS);
  (await cookies()).set(SESSION_COOKIE, createSession(expires, pw), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
