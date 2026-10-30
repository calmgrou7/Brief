import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyText } from "@/components/finance-forms";
import { won } from "@/components/format";
import { Card } from "@/components/ui";
import { setInvoiceStatusAction } from "@/app/finance-actions";
import { requireOwner } from "@/lib/auth";
import { invoiceText, monthLabel } from "@/lib/billing";
import { INVOICE_STATUS_LABEL, type InvoiceStatus } from "@/lib/finance-store";
import { loadSettlement } from "../settlement";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<{ month?: string }> }) {
  const { clientId } = await params;
  await requireOwner(`/finance/${encodeURIComponent(clientId)}`);
  const { month: monthParam } = await searchParams;
  const s = await loadSettlement(monthParam);
  const row = s.rows.find((r) => r.client.id === clientId);
  if (!row) notFound();

  const text = invoiceText(row.client, s.month, row.invoice, process.env.AGENCY_NAME ?? "");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/finance?month=${s.month}`} className="text-xs text-muted hover:underline">
          ← 월말 정산
        </Link>
        <h1 className="mt-1 text-xl font-bold">
          {row.client.name} · {monthLabel(s.month)} 청구서
        </h1>
        {s.inProgress && <p className="mt-1 text-sm text-warning-text">이번 달은 아직 진행 중입니다. 금액은 월이 끝나야 확정됩니다.</p>}
      </div>

      <Card title="청구 내역">
        <table className="tabular w-full text-sm">
          <tbody>
            {row.invoice.items.map((i) => (
              <tr key={i.label} className="border-b border-line">
                <td className="py-2.5 pr-3 text-ink-2">{i.label}</td>
                <td className="py-2.5 text-right">{won(i.amount)}</td>
              </tr>
            ))}
            <tr className="border-b border-line">
              <td className="py-2.5 pr-3 text-ink-2">공급가액</td>
              <td className="py-2.5 text-right">{won(row.invoice.subtotal)}</td>
            </tr>
            <tr className="border-b border-line">
              <td className="py-2.5 pr-3 text-ink-2">부가세 (10%)</td>
              <td className="py-2.5 text-right">{won(row.invoice.vat)}</td>
            </tr>
            <tr>
              <td className="pt-3 font-semibold">합계</td>
              <td className="pt-3 text-right text-lg font-bold">{won(row.invoice.total)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">이 달 광고비 {won(row.spend)} 기준으로 계산했습니다. 세금계산서는 홈택스에서 따로 발행해 주세요.</p>
      </Card>

      <Card title="카톡·문자로 보낼 안내문">
        <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-surface-2 p-3 font-sans text-sm leading-relaxed text-ink">{text}</pre>
        <CopyText text={text} />
      </Card>

      <Card title="청구 상태" aside={`지금: ${INVOICE_STATUS_LABEL[row.status]}`}>
        <form action={setInvoiceStatusAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="clientId" value={row.client.id} />
          <input type="hidden" name="month" value={s.month} />
          {(Object.keys(INVOICE_STATUS_LABEL) as InvoiceStatus[]).map((st) => (
            <button
              key={st}
              type="submit"
              name="status"
              value={st}
              aria-pressed={row.status === st}
              className={`rounded-lg border px-4 py-2 text-sm ${row.status === st ? "border-accent bg-accent font-semibold text-white" : "border-line text-ink-2 hover:text-ink"}`}
            >
              {INVOICE_STATUS_LABEL[st]}
            </button>
          ))}
        </form>
      </Card>
    </div>
  );
}
