import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyReportLink } from "@/components/copy-link";
import { DecisionCard } from "@/components/decision-card";
import { multiple, won } from "@/components/format";
import { CreativeTable, FunnelCard, KpiTiles, PeriodTabs, RangeNote, TrendCharts } from "@/components/performance";
import { performanceView } from "@/lib/performance";
import { requireOwner } from "@/lib/auth";
import { getClientData } from "@/lib/data";
import { addDays, isPreset } from "@/lib/dates";
import { isOpen, loadRecords } from "@/lib/decision-store";
import { decisionsFor, rankDecisions } from "@/lib/decisions";
import { describeContract } from "@/lib/finance";
import { createReportToken, LINK_DAYS, reportSecret } from "@/lib/report-link";
import type { RangePreset } from "@/lib/types";

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string }> }) {
  const { id } = await params;
  await requireOwner(`/clients/${encodeURIComponent(id)}`);
  const { range: rangeParam } = await searchParams;
  const preset: RangePreset = isPreset(rangeParam) ? rangeParam : "30d";

  const data = await getClientData(id);
  if (!data) notFound();
  const { client, anchor } = data;
  const v = performanceView(data, preset);

  const records = await loadRecords();
  const decisions = rankDecisions(decisionsFor(data)).filter((d) => isOpen(records[d.id], anchor));

  const secret = reportSecret();
  const expires = addDays(anchor, LINK_DAYS);
  const reportPath = secret ? `/r/${createReportToken(client.id, expires, secret)}` : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/" className="text-xs text-muted hover:underline">
            ← 결정함
          </Link>
          <h1 className="mt-1 text-xl font-bold">{client.name}</h1>
          <p className="mt-1 text-sm text-ink-2">
            {client.industry} · 목표 {v.unit} {won(client.targetCpa)}
            {client.targetRoas ? ` · 목표 ROAS ${multiple(client.targetRoas)}` : ""} · {describeContract(client.contract)}
          </p>
        </div>
        {reportPath ? (
          <CopyReportLink path={reportPath} expires={expires} />
        ) : (
          <p className="max-w-xs text-xs text-muted">고객 리포트 링크를 쓰려면 서버 환경변수 REPORT_SECRET(16자 이상)을 설정하세요.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangeNote v={v} />
        <PeriodTabs preset={preset} hrefFor={(r) => `?range=${r}`} />
      </div>

      {decisions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">
            이 고객의 결정 <span className="text-muted">{decisions.length}건</span>
          </h2>
          {decisions.map((d, i) => (
            <DecisionCard key={d.id} d={d} rank={i + 1} showClient={false} />
          ))}
        </section>
      )}

      <FunnelCard v={v} />
      <KpiTiles v={v} />
      <TrendCharts v={v} />
      <CreativeTable v={v} showVerdict />
    </div>
  );
}
