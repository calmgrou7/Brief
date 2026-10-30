import type { Metadata } from "next";
import { CreativeTable, FunnelCard, KpiTiles, PeriodTabs, RangeNote, TrendCharts } from "@/components/performance";
import { getClientData } from "@/lib/data";
import { isPreset, PRESET_LABEL, today } from "@/lib/dates";
import { performanceView } from "@/lib/performance";
import { reportSummary } from "@/lib/report";
import { reportSecret, verifyReportToken } from "@/lib/report-link";
import type { RangePreset } from "@/lib/types";

// 고객 공유 리포트. 링크(서명된 토큰)를 가진 고객사만 자기 성과를 본다.
// 수수료, 마진, 결정 카드, 소재 판정, 다른 고객 정보는 이 화면에 없다.

export const metadata: Metadata = {
  title: "광고 성과 리포트",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

export default async function ReportPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ range?: string }> }) {
  const { token } = await params;
  const { range: rangeParam } = await searchParams;
  const preset: RangePreset = isPreset(rangeParam) ? rangeParam : "30d";

  const secret = reportSecret();
  const link = secret ? verifyReportToken(token, secret, today()) : null;
  const data = link ? await getClientData(link.clientId) : null;
  if (!link || !data) return <InvalidLink />;

  const v = performanceView(data, preset);
  const summary = reportSummary(v);

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="text-sm">
            <span className="font-bold text-ink">{data.client.name}</span>
            <span className="text-ink-2"> · 광고 성과 리포트</span>
          </div>
          <span className="text-xs text-muted">메타(페이스북·인스타그램) 광고 · 매일 갱신</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <RangeNote v={v} />
          <PeriodTabs preset={preset} hrefFor={(r) => `?range=${r}`} />
        </div>

        <section className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          <p className="text-xs font-medium text-muted">{PRESET_LABEL[preset]} 요약</p>
          <h1 className="mt-1 text-xl font-bold leading-snug text-balance sm:text-2xl">{summary.headline}</h1>
          {summary.points.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink-2">
              {summary.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <FunnelCard v={v} />
        <KpiTiles v={v} />
        <TrendCharts v={v} />
        <CreativeTable v={v} showVerdict={false} />

        <Glossary isPurchase={v.isPurchase} />

        <p className="pb-4 text-xs text-muted">이 링크는 {link.expires}까지 열립니다. 궁금한 점은 담당 마케터에게 문의해 주세요.</p>
      </main>
    </>
  );
}

function Glossary({ isPurchase }: { isPurchase: boolean }) {
  const items: [string, string][] = [
    [isPurchase ? "CPA" : "CPL", isPurchase ? "구매 1건을 얻는 데 든 광고비" : "신청 1건을 얻는 데 든 광고비"],
    ...(isPurchase ? ([["ROAS", "광고비 대비 매출. 3배면 광고비 1원으로 매출 3원"]] as [string, string][]) : []),
    ["CTR", "광고를 본 사람 중 클릭한 비율"],
    ["CPC", "클릭 1번에 든 광고비"],
    ["CPM", "광고가 1,000번 보이는 데 든 광고비"],
    ["전환율", "클릭한 사람 중 " + (isPurchase ? "구매" : "신청") + "까지 간 비율"],
  ];
  return (
    <details className="rounded-xl border border-line bg-surface p-4 text-sm sm:p-5">
      <summary className="cursor-pointer font-semibold">용어 설명</summary>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {items.map(([t, d]) => (
          <div key={t} className="flex gap-2">
            <dt className="w-16 shrink-0 font-medium text-ink">{t}</dt>
            <dd className="text-ink-2">{d}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function InvalidLink() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12 text-center">
      <h1 className="text-lg font-bold">리포트 링크가 만료되었거나 올바르지 않습니다</h1>
      <p className="mt-2 text-sm text-ink-2">담당 마케터에게 새 링크를 요청해 주세요.</p>
    </main>
  );
}
