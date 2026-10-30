import "server-only";
import { invoiceFor, isMonth, marginFor, monthOf, monthRange, previousMonth, type Expense, type Invoice, type Margin, type Month } from "@/lib/billing";
import { getClientData, listClients } from "@/lib/data";
import { today } from "@/lib/dates";
import { invoiceStatuses, listExpenses, type InvoiceStatus } from "@/lib/finance-store";
import { inRange, sumMetrics } from "@/lib/kpi";
import type { Client } from "@/lib/types";

// 정산 화면과 청구서 화면이 함께 쓰는 월별 계산

export interface SettlementRow {
  client: Client;
  spend: number;
  invoice: Invoice;
  margin: Margin;
  status: InvoiceStatus;
  expenses: Expense[];
  error?: string;
}

export interface Settlement {
  month: Month;
  /** 이번 달이면 아직 진행 중 */
  inProgress: boolean;
  months: { month: Month; current: boolean }[];
  rows: SettlementRow[];
}

/** 기본은 지난달(청구 기준). 선택 가능한 달은 지난달·이번 달. */
export async function loadSettlement(monthParam: string | undefined): Promise<Settlement> {
  const thisMonth = monthOf(today());
  const lastMonth = previousMonth(thisMonth);
  const month = isMonth(monthParam) && (monthParam === thisMonth || monthParam === lastMonth) ? monthParam : lastMonth;
  const range = monthRange(month);

  const [clients, expenses, statuses] = await Promise.all([listClients(), listExpenses(month), invoiceStatuses(month)]);
  const rows = await Promise.all(
    clients.map(async (client): Promise<SettlementRow> => {
      const own = expenses.filter((e) => e.clientId === client.id);
      try {
        const data = await getClientData(client.id);
        const spend = data ? sumMetrics(inRange(data.rows, range)).spend : 0;
        return { client, spend, invoice: invoiceFor(client, spend), margin: marginFor(client, spend, own), status: statuses[client.id] ?? "draft", expenses: own };
      } catch (e) {
        return {
          client,
          spend: 0,
          invoice: invoiceFor(client, 0),
          margin: marginFor(client, 0, own),
          status: statuses[client.id] ?? "draft",
          expenses: own,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }),
  );

  return {
    month,
    inProgress: month === thisMonth,
    months: [
      { month: lastMonth, current: false },
      { month: thisMonth, current: true },
    ],
    rows,
  };
}
