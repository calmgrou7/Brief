import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Expense, ExpenseCategory, Month } from "./billing";
import { db } from "./db";

// 정산 기록: 고객별 비용과 청구서 상태.
// DATABASE_URL이 있으면 Supabase(supabase/migrations/0002_finance.sql), 없으면 .data/finance.json.

export type InvoiceStatus = "draft" | "sent" | "paid";

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "초안",
  sent: "보냄",
  paid: "입금 완료",
};

interface FileData {
  expenses: Expense[];
  invoices: Record<string, InvoiceStatus>;
}

const FILE = path.join(process.cwd(), ".data", "finance.json");

async function readFileData(): Promise<FileData> {
  try {
    const d = JSON.parse(await readFile(FILE, "utf8"));
    return { expenses: d.expenses ?? [], invoices: d.invoices ?? {} };
  } catch {
    return { expenses: [], invoices: {} };
  }
}

async function writeFileData(d: FileData): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(d, null, 2));
}

const key = (clientId: string, month: Month) => `${clientId}:${month}`;

export async function listExpenses(month: Month): Promise<Expense[]> {
  const sql = db();
  if (sql) {
    const rows = await sql<{ id: string; client_id: string; month: string; category: ExpenseCategory; amount: string; memo: string }[]>`
      select id, client_id, month, category, amount, memo from expenses where month = ${month} order by created_at`;
    return rows.map((r) => ({ id: r.id, clientId: r.client_id, month: r.month, category: r.category, amount: Number(r.amount), memo: r.memo }));
  }
  return (await readFileData()).expenses.filter((e) => e.month === month);
}

export async function addExpense(e: Omit<Expense, "id">): Promise<void> {
  const id = randomUUID();
  const sql = db();
  if (sql) {
    await sql`insert into expenses (id, client_id, month, category, amount, memo)
      values (${id}, ${e.clientId}, ${e.month}, ${e.category}, ${e.amount}, ${e.memo})`;
    return;
  }
  const d = await readFileData();
  d.expenses.push({ id, ...e });
  await writeFileData(d);
}

export async function deleteExpense(id: string): Promise<void> {
  const sql = db();
  if (sql) {
    await sql`delete from expenses where id = ${id}`;
    return;
  }
  const d = await readFileData();
  d.expenses = d.expenses.filter((e) => e.id !== id);
  await writeFileData(d);
}

/** 고객별 청구서 상태 (기록이 없으면 초안) */
export async function invoiceStatuses(month: Month): Promise<Record<string, InvoiceStatus>> {
  const sql = db();
  if (sql) {
    const rows = await sql<{ client_id: string; status: InvoiceStatus }[]>`
      select client_id, status from invoice_status where month = ${month}`;
    return Object.fromEntries(rows.map((r) => [r.client_id, r.status]));
  }
  const all = (await readFileData()).invoices;
  return Object.fromEntries(
    Object.entries(all)
      .filter(([k]) => k.endsWith(`:${month}`))
      .map(([k, v]) => [k.slice(0, k.length - month.length - 1), v]),
  );
}

export async function setInvoiceStatus(clientId: string, month: Month, status: InvoiceStatus): Promise<void> {
  const sql = db();
  if (sql) {
    await sql`insert into invoice_status (client_id, month, status) values (${clientId}, ${month}, ${status})
      on conflict (client_id, month) do update set status = excluded.status, updated_at = now()`;
    return;
  }
  const d = await readFileData();
  d.invoices[key(clientId, month)] = status;
  await writeFileData(d);
}
