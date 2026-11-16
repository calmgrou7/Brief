import "server-only";
import { NextResponse } from "next/server";
import crypto from "crypto";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export function clientMeta(req: Request) {
  return {
    ip: (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null,
    user_agent: req.headers.get("user-agent")?.slice(0, 300) || null,
  };
}

// ── 관리자 인증 (단일 비밀번호 → httpOnly 쿠키) ──
export const ADMIN_COOKIE = "admin_token";
export const adminToken = () =>
  crypto.createHash("sha256").update(`admin|${process.env.ADMIN_PASSWORD || ""}|${process.env.OTP_SECRET || ""}`).digest("hex");

export function isAdmin(req: Request): boolean {
  if (!process.env.ADMIN_PASSWORD) return false;
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`${ADMIN_COOKIE}=([a-f0-9]+)`));
  return !!m && m[1] === adminToken();
}
