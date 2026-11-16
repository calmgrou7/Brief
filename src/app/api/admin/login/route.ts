import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken, bad } from "@/lib/http";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!process.env.ADMIN_PASSWORD || b?.password !== process.env.ADMIN_PASSWORD) return bad("비밀번호가 틀렸어요", 401);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminToken(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  return res;
}
