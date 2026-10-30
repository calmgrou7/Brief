import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authMode, isOwner } from "@/lib/auth";
import { safeNext } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인 · Brief", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = safeNext(next);
  if (await isOwner()) redirect(target);
  const mode = authMode();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-12">
      <div className="mb-6 flex items-center gap-2">
        <span aria-hidden className="inline-flex size-7 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">B</span>
        <span className="text-lg font-bold">Brief</span>
      </div>
      {mode === "locked" ? (
        <div className="rounded-xl border border-line bg-surface p-5 text-sm leading-relaxed">
          <h1 className="font-semibold">운영자 비밀번호가 설정되지 않았습니다</h1>
          <p className="mt-2 text-ink-2">
            서버 환경변수 <code className="rounded bg-surface-2 px-1">OWNER_PASSWORD</code>에 8자 이상 비밀번호를 넣고 다시 시작하세요. 그 전까지 운영자 화면은 잠겨 있습니다.
          </p>
        </div>
      ) : (
        <LoginForm next={target} />
      )}
    </main>
  );
}
