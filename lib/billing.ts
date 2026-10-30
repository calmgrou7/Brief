import { agencyFee } from "./finance";
import type { Client, DateRange } from "./types";

// 월말 정산 계산 (순수 함수). 청구서 초안과 고객별 이익을 만든다.

/** "2026-09" 형식 */
export type Month = string;

export const VAT_RATE = 0.1;

export function monthOf(date: string): Month {
  return date.slice(0, 7);
}

export function previousMonth(month: Month): Month {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function monthRange(month: Month): DateRange {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { since: `${month}-01`, until: `${month}-${String(last).padStart(2, "0")}` };
}

export function monthLabel(month: Month): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}년 ${m}월`;
}

export function isMonth(v: unknown): v is Month {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

export type ExpenseCategory = "creative" | "tool" | "other";

export const EXPENSE_LABEL: Record<ExpenseCategory, string> = {
  creative: "소재 제작비",
  tool: "도구·구독료",
  other: "기타",
};

export interface Expense {
  id: string;
  clientId: string;
  month: Month;
  category: ExpenseCategory;
  amount: number;
  memo: string;
}

export interface InvoiceItem {
  label: string;
  amount: number;
}

export interface Invoice {
  items: InvoiceItem[];
  subtotal: number;
  vat: number;
  total: number;
}

/**
 * 청구서 초안. 대행 수수료는 항상, 광고비는 대행사가 먼저 결제한 계약일 때만 넣는다.
 * 부가세는 공급가액(합계)의 10%, 원 단위 버림 대신 반올림.
 */
export function invoiceFor(client: Client, monthSpend: number): Invoice {
  const items: InvoiceItem[] = [];
  if (client.contract.spendPaidBy === "agency") items.push({ label: "메타 광고비 (대납)", amount: monthSpend });
  items.push({ label: feeLabel(client), amount: agencyFee(client.contract, monthSpend) });
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const vat = Math.round(subtotal * VAT_RATE);
  return { items, subtotal, vat, total: subtotal + vat };
}

function feeLabel(client: Client): string {
  const c = client.contract;
  switch (c.feeModel) {
    case "percent":
      return `광고 운영 대행 수수료 (광고비의 ${c.feePercent}%)`;
    case "fixed":
      return "광고 운영 대행 수수료 (월 정액)";
    case "hybrid":
      return `광고 운영 대행 수수료 (광고비의 ${c.feePercent}%, 최소 ${(c.minFee ?? 0).toLocaleString("ko-KR")}원)`;
  }
}

export interface Margin {
  /** 내 매출 = 대행 수수료 (대납 광고비는 그대로 메타로 나가므로 매출이 아님) */
  revenue: number;
  costs: number;
  profit: number;
  /** 이익률 (매출 0이면 null) */
  rate: number | null;
}

export function marginFor(client: Client, monthSpend: number, expenses: readonly Expense[]): Margin {
  const revenue = agencyFee(client.contract, monthSpend);
  const costs = expenses.filter((e) => e.clientId === client.id).reduce((s, e) => s + e.amount, 0);
  const profit = revenue - costs;
  return { revenue, costs, profit, rate: revenue > 0 ? profit / revenue : null };
}

/** 카톡·문자에 붙여 넣는 청구 안내문 */
export function invoiceText(client: Client, month: Month, inv: Invoice, agencyName: string): string {
  const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
  return [
    `${agencyName ? `[${agencyName}] ` : ""}${client.name} ${monthLabel(month)} 광고 운영 청구 안내`,
    "",
    ...inv.items.map((i) => `- ${i.label}: ${won(i.amount)}`),
    `- 공급가액: ${won(inv.subtotal)}`,
    `- 부가세(10%): ${won(inv.vat)}`,
    `- 합계: ${won(inv.total)}`,
    "",
    "확인 부탁드립니다. 감사합니다.",
  ].join("\n");
}
