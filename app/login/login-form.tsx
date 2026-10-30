"use client";

import { useActionState } from "react";
import { login } from "../auth-actions";

export function LoginForm({ next }: { next: string }) {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-3 rounded-xl border border-line bg-surface p-5">
      <h1 className="text-base font-semibold">운영자 로그인</h1>
      <input type="hidden" name="next" value={next} />
      <label htmlFor="password" className="block text-xs text-ink-2">
        비밀번호
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoFocus
        autoComplete="current-password"
        className="w-full rounded-lg border border-line bg-page px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-accent"
      />
      {error && (
        <p role="alert" className="text-sm text-critical-text">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
