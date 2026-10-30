"use server";

import { redirect } from "next/navigation";
import { endSession, ownerPassword, startSession } from "@/lib/auth";
import { passwordMatches, safeNext } from "@/lib/session";

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const pw = ownerPassword();
  if (!pw) return "서버에 OWNER_PASSWORD가 설정되지 않았습니다.";
  if (!passwordMatches(String(form.get("password") ?? ""), pw)) {
    // 무작위 대입 속도를 늦춘다
    await new Promise((r) => setTimeout(r, 800));
    return "비밀번호가 맞지 않습니다.";
  }
  await startSession();
  redirect(safeNext(String(form.get("next") ?? "")));
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}
