"use server";

import { revalidatePath } from "next/cache";
import { today } from "@/lib/dates";
import { saveRecord, type DecisionStatus } from "@/lib/decision-store";

const STATUSES: DecisionStatus[] = ["approved", "snoozed", "dismissed"];

export async function decide(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!id) return;

  if (status === "undo") {
    await saveRecord(id, null);
  } else if ((STATUSES as string[]).includes(status)) {
    await saveRecord(id, {
      status: status as DecisionStatus,
      at: new Date().toISOString(),
      // 보류는 내일 아침에 다시 보여준다
      until: status === "snoozed" ? today() : undefined,
      title: String(form.get("title") ?? ""),
      clientName: String(form.get("clientName") ?? ""),
      impactLabel: String(form.get("impactLabel") ?? ""),
    });
  }
  revalidatePath("/", "layout");
}
