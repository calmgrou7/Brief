import Link from "next/link";
import { ExpenseForm } from "@/components/finance-forms";
import { percent, won, wonShort } from "@/components/format";
import { Card, StatusBadge } from "@/components/ui";
import { deleteExpenseAction } from "@/app/finance-actions";
import { requireOwner } from "@/lib/auth";
import { EXPENSE_LABEL, monthLabel } from "@/lib/billing";
import { describeContract } from "@/lib/finance";
import { INVOICE_STATUS_LABEL, type InvoiceStatus } from "@/lib/finance-store";
import type { Status } from "@/lib/types";
import { loadSettlement } from "./settlement";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<InvoiceStatus, Status | "neutral"> = { draft: "neutral", sent: "warning", paid: "good" };

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireOwner("/finance");
  const { month: monthParam } = await searchParams;
  const s = await loadSettlement(monthParam);

  const revenue = s.rows.reduce((t, r) => t + r.margin.revenue, 0);
  const costs = s.rows.reduce((t, r) => t + r.margin.costs, 0);
  const billed = s.rows.reduce((t, r) => t + r.invoice.total, 0);
  const paid = s.rows.filter((r) => r.status === "paid").length;
  const expenses = s.rows.flatMap((r) => r.expenses.map((e) => ({ ...e, clientName: r.client.name })));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">월말 정산</h1>
          <p className="mt-1 text-sm text-ink-2">
            {monthLabel(s.month)} · {s.inProgress ? "진행 중이라 금액이 계속 바뀝니다" : "마감된 달 기준"}
          </p>
        </div>
        <nav className="flex rounded-lg border border-line bg-surface p-0.5 text-sm" aria-label="정산 월">
          {s.months.map((m) => (
            <Link
              key={m.month}
              href={`?month=${m.month}`}
              aria-current={m.month === s.month ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 ${m.month === s.month ? "bg-surface-2 font-semibold text-ink" : "text-ink-2 hover:text-ink"}`}
            >
              {monthLabel(m.month)}
              {m.current ? " (진행 중)" : ""}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="내 매출 (대행 수수료)" value={wonShort(revenue)} />
        <Stat label="들어간 비용" value={wonShort(costs)} />
        <Stat label="남는 돈 (이익)" value={wonShort(revenue - costs)} sub={revenue > 0 ? `이익률 ${percent((revenue - costs) / revenue, 0)}` : undefined} />
        <Stat label="청구 합계 (부가세 포함)" value={wonShort(billed)} sub={`입금 완료 ${paid}/${s.rows.length}곳`} />
      </div>

      <Card title="고객사별 정산">
        <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-line text-right text-xs text-muted">
                <th className="py-2 pr-3 text-left font-medium">고객사</th>
                <th className="py-2 pr-3 font-medium">광고비</th>
                <th className="py-2 pr-3 font-medium">내 수수료</th>
                <th className="py-2 pr-3 font-medium">비용</th>
                <th className="py-2 pr-3 font-medium">남는 돈</th>
                <th className="py-2 pr-3 font-medium">청구 합계</th>
                <th className="py-2 pr-3 text-left font-medium">청구 상태</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="tabular">
              {s.rows.map((r) => (
                <tr key={r.client.id} className="border-b border-line text-right align-top last:border-0">
                  <td className="py-3 pr-3 text-left">
                    <div className="font-medium text-ink">{r.client.name}</div>
                    <div className="text-xs text-muted">
                      {describeContract(r.client.contract)} · {r.client.contract.spendPaidBy === "agency" ? "광고비 대납" : "광고비 고객 직접 결제"}
                    </div>
                    {r.error && <div className="text-xs text-critical-text">광고비를 불러오지 못했습니다</div>}
                  </td>
                  <td className="py-3 pr-3">{won(r.spend)}</td>
                  <td className="py-3 pr-3">{won(r.margin.revenue)}</td>
                  <td className="py-3 pr-3">{r.margin.costs ? won(r.margin.costs) : "–"}</td>
                  <td className="py-3 pr-3">
                    <div className={`font-semibold ${r.margin.profit < 0 ? "text-critical-text" : ""}`}>{won(r.margin.profit)}</div>
                    <div className="text-xs text-muted">{r.margin.rate == null ? "" : `이익률 ${percent(r.margin.rate, 0)}`}</div>
                  </td>
                  <td className="py-3 pr-3">{won(r.invoice.total)}</td>
                  <td className="py-3 pr-3 text-left">
                    <StatusBadge status={STATUS_TONE[r.status]} label={INVOICE_STATUS_LABEL[r.status]} />
                  </td>
                  <td className="py-3">
                    <Link href={`/finance/${r.client.id}?month=${s.month}`} className="whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium text-accent hover:bg-surface-2">
                      청구서 보기
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">대납 광고비는 메타로 그대로 나가는 돈이라 내 매출에 넣지 않았습니다. AI 사용료는 해당 기능이 생기면 자동으로 비용에 더해집니다.</p>
      </Card>

      <Card title={`${monthLabel(s.month)} 비용`} aside={expenses.length ? `${expenses.length}건 · ${won(costs)}` : "아직 없음"}>
        <ExpenseForm month={s.month} clients={s.rows.map((r) => ({ id: r.client.id, name: r.client.name }))} />
        {expenses.length > 0 && (
          <ul className="mt-4 divide-y divide-[var(--border)] border-t border-line text-sm">
            {expenses.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <span className="font-medium">{e.clientName}</span>
                  <span className="text-ink-2"> · {EXPENSE_LABEL[e.category]}</span>
                  {e.memo && <span className="text-muted"> · {e.memo}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular font-semibold">{won(e.amount)}</span>
                  <form action={deleteExpenseAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <button type="submit" className="rounded-md px-2 py-1 text-xs text-ink-2 hover:bg-surface-2 hover:text-critical-text">
                      삭제
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs text-ink-2">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="tabular mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}
