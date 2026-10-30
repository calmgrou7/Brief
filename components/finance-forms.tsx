"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { addExpenseAction } from "@/app/finance-actions";
import { EXPENSE_LABEL } from "@/lib/billing";

export function ExpenseForm({ month, clients }: { month: string; clients: { id: string; name: string }[] }) {
  const [error, action] = useActionState(addExpenseAction, null);
  return (
    <form action={action} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_2fr_auto] sm:items-end">
      <input type="hidden" name="month" value={month} />
      <Field label="고객사" htmlFor="exp-client">
        <select id="exp-client" name="clientId" required defaultValue="" className={input}>
          <option value="" disabled>
            선택
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="종류" htmlFor="exp-category">
        <select id="exp-category" name="category" defaultValue="creative" className={input}>
          {Object.entries(EXPENSE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="금액 (원)" htmlFor="exp-amount">
        <input id="exp-amount" name="amount" inputMode="numeric" required placeholder="150000" className={input} />
      </Field>
      <Field label="메모 (선택)" htmlFor="exp-memo">
        <input id="exp-memo" name="memo" maxLength={100} placeholder="예: 상세페이지 이미지 외주" className={input} />
      </Field>
      <Submit />
      {error && (
        <p role="alert" className="text-sm text-critical-text sm:col-span-5">
          {error}
        </p>
      )}
    </form>
  );
}

const input = "w-full rounded-lg border border-line bg-page px-3 py-2 text-sm text-ink";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-xs text-ink-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
      비용 추가
    </button>
  );
}

/** 안내문 복사. 클립보드가 막히면 글 상자를 선택해 직접 복사하도록 안내한다. */
export function CopyText({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setState("copied");
          } catch {
            setState("manual");
          }
        }}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
      >
        {state === "copied" ? "복사했습니다" : "안내문 복사"}
      </button>
      {state === "manual" && <p className="text-xs text-ink-2">복사가 막혀 있습니다. 아래 글을 길게 눌러 직접 복사해 주세요.</p>}
    </div>
  );
}
