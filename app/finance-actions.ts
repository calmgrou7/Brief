"use server";

import { revalidatePath } from "next/cache";
import { isOwner } from "@/lib/auth";
import { EXPENSE_LABEL, isMonth, type ExpenseCategory } from "@/lib/billing";
import { listClients } from "@/lib/data";
import { addExpense, deleteExpense, setInvoiceStatus, type InvoiceStatus } from "@/lib/finance-store";

async function guard(): Promise<void> {
  if (!(await isOwner())) throw new Error("로그인이 필요합니다");
}

async function knownClient(id: string): Promise<boolean> {
  return (await listClients()).some((c) => c.id === id);
}

/** 비용 추가. 잘못된 입력이면 화면에 보여줄 안내 문장을 돌려준다. */
export async function addExpenseAction(_prev: string | null, form: FormData): Promise<string | null> {
  await guard();
  const clientId = String(form.get("clientId") ?? "");
  const month = String(form.get("month") ?? "");
  const category = String(form.get("category") ?? "") as ExpenseCategory;
  const amount = Number(String(form.get("amount") ?? "").replace(/[,\s원]/g, ""));
  const memo = String(form.get("memo") ?? "").trim().slice(0, 100);

  if (!(await knownClient(clientId))) return "고객사를 선택해 주세요.";
  if (!isMonth(month)) return "월이 올바르지 않습니다.";
  if (!(category in EXPENSE_LABEL)) return "비용 종류를 선택해 주세요.";
  if (!Number.isInteger(amount) || amount <= 0 || amount > 10_000_000_000) return "금액을 원 단위 숫자로 입력해 주세요.";

  await addExpense({ clientId, month, category, amount, memo });
  revalidatePath("/finance", "layout");
  return null;
}

export async function deleteExpenseAction(form: FormData): Promise<void> {
  await guard();
  const id = String(form.get("id") ?? "");
  if (id) await deleteExpense(id);
  revalidatePath("/finance", "layout");
}

const STATUSES: InvoiceStatus[] = ["draft", "sent", "paid"];

export async function setInvoiceStatusAction(form: FormData): Promise<void> {
  await guard();
  const clientId = String(form.get("clientId") ?? "");
  const month = String(form.get("month") ?? "");
  const status = String(form.get("status") ?? "") as InvoiceStatus;
  if (!(await knownClient(clientId)) || !isMonth(month) || !STATUSES.includes(status)) return;
  await setInvoiceStatus(clientId, month, status);
  revalidatePath("/finance", "layout");
}
