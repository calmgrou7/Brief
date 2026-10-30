import Link from "next/link";
import { UndoButton } from "@/components/decision-buttons";
import { DecisionCard } from "@/components/decision-card";
import { count, multiple, percent, won, wonShort } from "@/components/format";
import { Card, Meter, StatusBadge } from "@/components/ui";
import { getClientData, listClients, type ClientData } from "@/lib/data";
import { isOpen, loadRecords, type DecisionStatus } from "@/lib/decision-store";
import { decisionsFor, rankDecisions } from "@/lib/decisions";
import { describeContract, type Pace } from "@/lib/finance";
import { monthLabel, monthSummary, type MonthSummary } from "@/lib/summary";
import type { Client, Status } from "@/lib/types";

// 날짜(오늘)와 결정 기록에 따라 달라지므로 요청마다 렌더링한다. 메타 조회는 fetch 캐시(1시간)가 따로 막아준다.
export const dynamic = "force-dynamic";

const PACE: Record<Pace, { status: Status; label: string }> = {
  on: { status: "good", label: "정상" },
  under: { status: "warning", label: "미달" },
  over: { status: "critical", label: "초과" },
};

const STATUS_LABEL: Record<Status, string> = { good: "목표 달성", warning: "주의", critical: "목표 미달" };

const RECORD_LABEL: Record<DecisionStatus, { status: Status | "neutral"; label: string }> = {
  approved: { status: "good", label: "승인 · 실행 대기" },
  snoozed: { status: "warning", label: "내일 다시" },
  dismissed: { status: "neutral", label: "무시함" },
};

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

interface Row {
  client: Client;
  data: ClientData | null;
  summary: MonthSummary | null;
  error?: string;
}

export default async function Home() {
  const clients = await listClients();
  const results = await Promise.allSettled(clients.map((c) => getClientData(c.id)));
  const rows: Row[] = clients.map((client, i) => {
    const r = results[i];
    if (r.status === "rejected") return { client, data: null, summary: null, error: String(r.reason?.message ?? r.reason) };
    return { client, data: r.value, summary: r.value ? monthSummary(r.value) : null };
  });
  const ok = rows.filter((r): r is Row & { data: ClientData; summary: MonthSummary } => r.summary != null && r.data != null);
  const anchor = ok[0]?.data.anchor ?? null;
  const first = ok[0]?.summary;

  const records = await loadRecords();
  const all = rankDecisions(ok.flatMap((r) => decisionsFor(r.data)));
  const open = anchor ? all.filter((d) => isOpen(records[d.id], anchor)) : all;
  const handled = Object.entries(records)
    .filter(([, rec]) => !(rec.status === "snoozed" && anchor && (rec.until ?? "") < anchor))
    .sort(([, a], [, b]) => b.at.localeCompare(a.at));

  const spend = ok.reduce((s, r) => s + r.summary.kpis.spend, 0);
  const projected = ok.reduce((s, r) => s + r.summary.projectedSpend, 0);
  const budget = ok.reduce((s, r) => s + r.client.monthlyBudget, 0);
  const purchases = ok.filter((r) => r.client.objective === "purchase");
  const purchaseCount = purchases.reduce((s, r) => s + r.summary.kpis.conversions, 0);
  const leadCount = ok.filter((r) => r.client.objective === "lead").reduce((s, r) => s + r.summary.kpis.conversions, 0);
  const pSpend = purchases.reduce((s, r) => s + r.summary.kpis.spend, 0);
  const pRevenue = purchases.reduce((s, r) => s + r.summary.kpis.revenue, 0);
  const feeProjected = ok.reduce((s, r) => s + r.summary.feeProjected, 0);
  const feeRank = [...ok].sort((a, b) => b.summary.feeProjected - a.summary.feeProjected);
  const feeMax = Math.max(1, ...feeRank.map((r) => r.summary.feeProjected));

  const dateLabel = anchor ? `${Number(anchor.slice(5, 7))}월 ${Number(anchor.slice(8, 10))}일 (${WEEKDAY[new Date(`${anchor}T00:00:00Z`).getUTCDay()]})` : "";

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted">{dateLabel}</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight">오늘의 결정함</h1>
            <p className="mt-1 text-sm text-ink-2">
              {open.length > 0 ? (
                <>
                  결정 <b className="text-ink">{open.length}건</b> · 1순위 {open[0].clientName}{" "}
                  <b className="text-good-text">{open[0].impactLabel}</b>
                </>
              ) : (
                "오늘 결정할 일을 모두 처리했습니다."
              )}
            </p>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-muted">
            효과가 큰 순서로 정렬했습니다. 지금은 승인 기록만 남고, 메타 실행은 4단계(집행 에이전트)에서 연결됩니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {open.map((d, i) => (
              <DecisionCard key={d.id} d={d} rank={i + 1} />
            ))}
            {open.length === 0 && (
              <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-2">새 결정은 데이터가 쌓이는 내일 아침에 다시 만들어집니다.</div>
            )}
          </div>

          <aside className="space-y-3">
            <Card title={`${anchor ? monthLabel(anchor) : "이번 달"} 숫자`} aside={first ? `${first.daysElapsed}/${first.daysInMonth}일` : undefined}>
              <dl className="tabular divide-y divide-[var(--border)] text-sm">
                <Line label="광고비" value={wonShort(spend)} sub={`월말 예상 ${wonShort(projected)} / 예산 ${wonShort(budget)}`} />
                <Line label="구매" value={`${count(purchaseCount)}건`} sub={`리드 ${count(leadCount)}건`} />
                <Line label="구매형 ROAS" value={multiple(pSpend > 0 ? pRevenue / pSpend : null)} sub={`매출 ${wonShort(pRevenue)}`} />
              </dl>
            </Card>

            <Card title="내 수수료 · 월말 예상" aside={wonShort(feeProjected)}>
              <ul className="space-y-3">
                {feeRank.map(({ client, summary: s }) => (
                  <li key={client.id}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <Link href={`/clients/${client.id}`} className="truncate hover:underline">
                        {client.name}
                      </Link>
                      <span className="tabular font-semibold">{wonShort(s.feeProjected)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                      <div className="h-1.5 rounded-full bg-[var(--series-1)]" style={{ width: `${(s.feeProjected / feeMax) * 100}%` }} />
                    </div>
                    <div className="tabular mt-1 text-[11px] text-muted">
                      {describeContract(client.contract)} · 광고비 대비 {percent(s.projectedSpend > 0 ? s.feeProjected / s.projectedSpend : null, 0)}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-muted">제작비·툴 비용을 뺀 고객별 마진은 2단계에서 추가됩니다.</p>
            </Card>

            {handled.length > 0 && (
              <Card title="처리한 결정" aside={`${handled.length}건`}>
                <ul className="space-y-2.5">
                  {handled.slice(0, 8).map(([id, rec]) => (
                    <li key={id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0 text-xs">
                        <StatusBadge status={RECORD_LABEL[rec.status].status} label={RECORD_LABEL[rec.status].label} />
                        <div className="mt-0.5 truncate text-sm text-ink">{rec.title}</div>
                        <div className="text-muted">
                          {rec.clientName} · {rec.impactLabel}
                        </div>
                      </div>
                      <UndoButton id={id} />
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </aside>
        </div>
      </section>

      <Card title="고객별 현황" aside="이번 달 기준">
        <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pr-3 font-medium">고객</th>
                <th className="py-2 pr-3 font-medium">광고비 / 예산</th>
                <th className="py-2 pr-3 font-medium">예산 페이스</th>
                <th className="py-2 pr-3 font-medium">CPA·CPL (목표)</th>
                <th className="py-2 pr-3 font-medium">ROAS</th>
                <th className="py-2 pr-3 font-medium">결정</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ client, summary: s, error }) => {
                const pending = open.filter((d) => d.clientId === client.id).length;
                return (
                  <tr key={client.id} className="border-b border-line align-top last:border-0">
                    <td className="py-3 pr-3">
                      <Link href={`/clients/${client.id}`} className="font-medium text-ink hover:underline">
                        {client.name}
                      </Link>
                      <div className="text-xs text-muted">{client.industry}</div>
                    </td>
                    {error || !s ? (
                      <td colSpan={5} className="py-3 text-xs text-critical-text">
                        {error ? `데이터를 불러오지 못했습니다: ${error}` : "광고계정이 연결되지 않았습니다"}
                      </td>
                    ) : (
                      <>
                        <td className="w-56 py-3 pr-3">
                          <div className="tabular mb-1.5 text-xs text-ink-2">
                            {wonShort(s.kpis.spend)} / {wonShort(client.monthlyBudget)}
                          </div>
                          <Meter value={s.kpis.spend / client.monthlyBudget} marker={s.projectedSpend / client.monthlyBudget} status={PACE[s.pace].status} />
                        </td>
                        <td className="py-3 pr-3">
                          <StatusBadge status={PACE[s.pace].status} label={PACE[s.pace].label} />
                          <div className="tabular mt-1 text-xs text-muted">예상 {percent(s.projectedSpend / client.monthlyBudget, 0)}</div>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="tabular">{won(s.kpis.cpa)}</div>
                          <div className="tabular text-xs text-muted">목표 {won(client.targetCpa)}</div>
                          {s.cpaStatus && <StatusBadge status={s.cpaStatus} label={STATUS_LABEL[s.cpaStatus]} />}
                        </td>
                        <td className="py-3 pr-3">
                          {client.objective === "purchase" ? (
                            <>
                              <div className="tabular">{multiple(s.kpis.roas)}</div>
                              <div className="tabular text-xs text-muted">목표 {multiple(client.targetRoas ?? null)}</div>
                            </>
                          ) : (
                            <span className="text-xs text-muted">리드형</span>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          {pending > 0 ? <span className="tabular font-semibold">{pending}건 대기</span> : <span className="text-xs text-muted">없음</span>}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">막대 위 세로선은 지금 속도로 쓸 때의 월말 예상 위치입니다.</p>
      </Card>
    </div>
  );
}

function Line({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="text-ink-2">{label}</dt>
      <dd className="text-right">
        <div className="font-bold">{value}</div>
        <div className="text-[11px] text-muted">{sub}</div>
      </dd>
    </div>
  );
}
