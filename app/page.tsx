import Link from "next/link";
import { Card, Meter, StatusBadge } from "@/components/ui";
import { count, multiple, percent, won, wonShort } from "@/components/format";
import { getClientData, listClients } from "@/lib/data";
import { describeContract, type Pace } from "@/lib/finance";
import { monthLabel, monthSummary, type MonthSummary } from "@/lib/summary";
import type { Client, Status } from "@/lib/types";

// 날짜(오늘)에 따라 달라지므로 요청마다 렌더링한다. 메타 조회는 fetch 캐시(1시간)가 따로 막아준다.
export const dynamic = "force-dynamic";

const PACE: Record<Pace, { status: Status; label: string }> = {
  on: { status: "good", label: "정상" },
  under: { status: "warning", label: "미달" },
  over: { status: "critical", label: "초과" },
};

const STATUS_LABEL: Record<Status, string> = { good: "목표 달성", warning: "주의", critical: "목표 미달" };

interface Row {
  client: Client;
  summary: MonthSummary | null;
  error?: string;
}

export default async function Home() {
  const clients = await listClients();
  const results = await Promise.allSettled(clients.map((c) => getClientData(c.id)));
  const rows: Row[] = clients.map((client, i) => {
    const r = results[i];
    if (r.status === "rejected") return { client, summary: null, error: String(r.reason?.message ?? r.reason) };
    return { client, summary: r.value ? monthSummary(r.value) : null };
  });
  const ok = rows.filter((r): r is Row & { summary: MonthSummary } => r.summary != null);
  const anchor = results.flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value.anchor] : []))[0] ?? null;
  const first = ok[0]?.summary;

  const spend = ok.reduce((s, r) => s + r.summary.kpis.spend, 0);
  const projected = ok.reduce((s, r) => s + r.summary.projectedSpend, 0);
  const budget = ok.reduce((s, r) => s + r.client.monthlyBudget, 0);
  const purchases = ok.filter((r) => r.client.objective === "purchase");
  const purchaseCount = purchases.reduce((s, r) => s + r.summary.kpis.conversions, 0);
  const leadCount = ok.filter((r) => r.client.objective === "lead").reduce((s, r) => s + r.summary.kpis.conversions, 0);
  const pSpend = purchases.reduce((s, r) => s + r.summary.kpis.spend, 0);
  const pRevenue = purchases.reduce((s, r) => s + r.summary.kpis.revenue, 0);
  const feeToDate = ok.reduce((s, r) => s + r.summary.feeToDate, 0);
  const feeProjected = ok.reduce((s, r) => s + r.summary.feeProjected, 0);

  const alerts = ok.flatMap(({ client, summary: s }) => {
    const out: { status: Status; text: string; id: string }[] = [];
    if (s.cpaStatus === "critical")
      out.push({ status: "critical", id: client.id, text: `${client.name}: ${client.objective === "purchase" ? "CPA" : "CPL"} ${won(s.kpis.cpa)}로 목표(${won(client.targetCpa)})를 20% 넘게 초과` });
    if (s.pace !== "on")
      out.push({
        status: s.pace === "over" ? "critical" : "warning",
        id: client.id,
        text: `${client.name}: 월말 예상 광고비 ${wonShort(s.projectedSpend)} (예산의 ${percent(s.projectedSpend / client.monthlyBudget, 0)})`,
      });
    if (s.pauseCount > 0) out.push({ status: "warning", id: client.id, text: `${client.name}: 중지 권장 소재 ${s.pauseCount}개` });
    return out;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{anchor ? `${monthLabel(anchor)} 운영 현황` : "운영 현황"}</h1>
        {first && (
          <p className="mt-1 text-sm text-ink-2">
            고객 {ok.length}곳 · 이번 달 {first.daysElapsed}일차 / {first.daysInMonth}일
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="이번 달 광고비" value={wonShort(spend)} sub={`월말 예상 ${wonShort(projected)} · 예산 ${wonShort(budget)}`} />
        <Stat label="전환" value={`구매 ${count(purchaseCount)}건`} sub={`리드 ${count(leadCount)}건`} />
        <Stat label="구매형 고객 ROAS" value={multiple(pSpend > 0 ? pRevenue / pSpend : null)} sub={`매출 ${wonShort(pRevenue)} / 광고비 ${wonShort(pSpend)}`} />
        <Stat label="대행 수수료" value={wonShort(feeToDate)} sub={`월말 예상 ${wonShort(feeProjected)}`} />
      </div>

      {alerts.length > 0 && (
        <Card title="확인이 필요한 항목" aside={`${alerts.length}건`}>
          <ul className="space-y-2">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <StatusBadge status={a.status} label="" />
                <Link href={`/clients/${a.id}`} className="text-ink hover:underline">
                  {a.text}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

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
                <th className="py-2 pr-3 font-medium">수수료</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ client, summary: s, error }) => (
                <tr key={client.id} className="border-b border-line last:border-0 align-top">
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
                        <div className="tabular">{wonShort(s.feeToDate)}</div>
                        <div className="text-xs text-muted">{describeContract(client.contract)}</div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">막대 위 세로선은 지금 속도로 쓸 때의 월말 예상 위치입니다.</p>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs text-ink-2">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="tabular mt-1 text-xs text-muted">{sub}</div>
    </div>
  );
}
