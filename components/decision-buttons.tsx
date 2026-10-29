"use client";

import { useFormStatus } from "react-dom";
import { decide } from "@/app/actions";
import type { Decision } from "@/lib/decisions";

function Btn({ status, children, primary = false }: { status: string; children: React.ReactNode; primary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="status"
      value={status}
      disabled={pending}
      className={
        primary
          ? "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          : "rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-50"
      }
    >
      {children}
    </button>
  );
}

export function DecisionButtons({ d }: { d: Decision }) {
  return (
    <form action={decide} className="flex items-center gap-1">
      <input type="hidden" name="id" value={d.id} />
      <input type="hidden" name="title" value={d.title} />
      <input type="hidden" name="clientName" value={d.clientName} />
      <input type="hidden" name="impactLabel" value={d.impactLabel} />
      <Btn status="dismissed">무시</Btn>
      <Btn status="snoozed">내일 다시</Btn>
      <Btn status="approved" primary>
        승인
      </Btn>
    </form>
  );
}

export function UndoButton({ id }: { id: string }) {
  return (
    <form action={decide}>
      <input type="hidden" name="id" value={id} />
      <Btn status="undo">되돌리기</Btn>
    </form>
  );
}
