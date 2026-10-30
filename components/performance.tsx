import Link from "next/link";
import { CpaChart, SpendChart } from "./charts";
import { count, multiple, percent, won, wonShort } from "./format";
import { Card, Delta, StatusBadge } from "./ui";
import { PRESET_LABEL } from "@/lib/dates";
import { delta, kpiStatus, type Verdict } from "@/lib/kpi";
import type { PerformanceView } from "@/lib/performance";
import type { RangePreset, Status } from "@/lib/types";

// 운영자용 고객 페이지와 고객 공유 리포트가 함께 쓰는 성과 섹션.
// 내부 정보(수수료, 결정, 소재 판정)는 이 파일이 아니라 각 페이지가 따로 붙인다.

export function PeriodTabs({ preset, hrefFor }: { preset: RangePreset; hrefFor: (r: RangePreset) => string }) {
  return (
    <nav className="flex rounded-lg border border-line bg-surface p-0.5 text-sm" aria-label="기간">
      {(Object.keys(PRESET_LABEL) as RangePreset[]).map((r) => (
        <Link
          key={r}
          href={hrefFor(r)}
          aria-current={r === preset ? "page" : undefined}
          className={`rounded-md px-3 py-1.5 ${r === preset ? "bg-surface-2 font-semibold text-ink" : "text-ink-2 hover:text-ink"}`}
        >
          {PRESET_LABEL[r]}
        </Link>
      ))}
    </nav>
  );
}

export function RangeNote({ v }: { v: PerformanceView }) {
  return (
    <p className="text-xs text-muted">
      {v.range.since} ~ {v.range.until}
      {v.preset === "mtd" ? " (오늘은 집계 중)" : ""} · 비교: 직전 같은 기간 ({v.prev.since} ~ {v.prev.until})
    </p>
  );
}

const FUNNEL_FILL = ["var(--funnel-1)", "var(--funnel-2)", "var(--funnel-3)", "var(--funnel-4)"];

export function FunnelCard({ v }: { v: PerformanceView }) {
  const { k, p } = v;
  return (
    <Card title="마케팅 퍼널" aside="광고비가 매출이 되기까지">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <FunnelEnd label="광고비" value={wonShort(k.spend)} sub={<Delta value={delta(k.spend, p.spend)} neutral />} />
        {v.stages.map((s, i) => (
          <li key={s.key} className="rounded-lg bg-surface-2 p-3">
            <div className="flex items-center gap-1.5 text-xs text-ink-2">
              <span aria-hidden className="inline-block size-2.5 rounded-sm" style={{ background: FUNNEL_FILL[i] }} />
              {s.label}
            </div>
            <div className="tabular mt-1 text-lg font-bold">{count(s.value)}</div>
            <div className="tabular text-xs text-muted">{s.rate == null ? "시작 단계" : `이전 단계의 ${percent(s.rate, s.rate < 0.1 ? 2 : 1)}`}</div>
          </li>
        ))}
        <FunnelEnd
          label={v.isPurchase ? "매출" : `${v.convLabel} 1건당 비용`}
          value={v.isPurchase ? wonShort(k.revenue) : won(k.cpa)}
          sub={v.isPurchase ? <span className="tabular text-xs text-muted">ROAS {multiple(k.roas)}</span> : <Delta value={delta(k.cpa, p.cpa)} lowerIsBetter />}
        />
      </ol>
    </Card>
  );
}

function FunnelEnd({ label, value, sub }: { label: string; value: string; sub: React.ReactNode }) {
  return (
    <li className="rounded-lg border border-line p-3">
      <div className="text-xs text-ink-2">{label}</div>
      <div className="tabular mt-1 text-lg font-bold">{value}</div>
      <div>{sub}</div>
    </li>
  );
}

export function KpiTiles({ v }: { v: PerformanceView }) {
  const { k, p, client } = v;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      <Tile label={v.unit} value={won(k.cpa)} d={delta(k.cpa, p.cpa)} lower status={kpiStatus(k.cpa, client.targetCpa, true)} />
      {v.isPurchase && (
        <Tile label="ROAS" value={multiple(k.roas)} d={delta(k.roas, p.roas)} status={client.targetRoas ? kpiStatus(k.roas, client.targetRoas, false) : null} />
      )}
      <Tile label={`${v.convLabel} 수`} value={`${count(k.conversions)}건`} d={delta(k.conversions, p.conversions)} />
      <Tile label="CTR" value={percent(k.ctr, 2)} d={delta(k.ctr, p.ctr)} />
      <Tile label="CPC" value={won(k.cpc)} d={delta(k.cpc, p.cpc)} lower />
      <Tile label="CPM" value={won(k.cpm)} d={delta(k.cpm, p.cpm)} lower />
      <Tile label="전환율 (클릭→전환)" value={percent(k.cvr, 2)} d={delta(k.cvr, p.cvr)} />
      {!v.isPurchase && <Tile label="일평균 빈도" value={k.frequency == null ? "–" : k.frequency.toFixed(2)} d={delta(k.frequency, p.frequency)} lower />}
    </div>
  );
}

function Tile({ label, value, d, lower = false, status }: { label: string; value: string; d: number | null; lower?: boolean; status?: Status | null }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-xs text-ink-2">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Delta value={d} lowerIsBetter={lower} />
        {status && <StatusBadge status={status} label={status === "good" ? "목표 달성" : status === "warning" ? "주의" : "미달"} />}
      </div>
    </div>
  );
}

export function TrendCharts({ v }: { v: PerformanceView }) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Card title="일별 광고비">
        <SpendChart data={v.series} />
      </Card>
      <Card title={`일별 ${v.unit}`} aside="선이 끊긴 날은 전환 0건">
        <CpaChart data={v.series} target={v.client.targetCpa} label={v.unit} />
      </Card>
    </div>
  );
}

const VERDICT: Record<Verdict, { status: Status | "neutral"; label: string }> = {
  winner: { status: "good", label: "승자" },
  watch: { status: "warning", label: "관찰" },
  pause: { status: "critical", label: "중지 권장" },
  learning: { status: "neutral", label: "학습 중" },
};

/** showVerdict: 운영자용 판정 열. 고객 리포트에서는 끈다. */
export function CreativeTable({ v, showVerdict }: { v: PerformanceView; showVerdict: boolean }) {
  return (
    <Card title="소재별 성과" aside={`${v.ads.length}개 · 광고비 순`}>
      <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-right text-xs text-muted">
              <th className="py-2 pr-3 text-left font-medium">소재</th>
              <th className="py-2 pr-3 font-medium">광고비</th>
              <th className="py-2 pr-3 font-medium">노출</th>
              <th className="py-2 pr-3 font-medium">CTR</th>
              <th className="py-2 pr-3 font-medium">{v.convLabel}</th>
              <th className="py-2 pr-3 font-medium">{v.unit}</th>
              {v.isPurchase && <th className="py-2 pr-3 font-medium">ROAS</th>}
              {showVerdict && <th className="py-2 text-left font-medium">판정</th>}
            </tr>
          </thead>
          <tbody className="tabular">
            {v.ads.map((a) => (
              <tr key={a.adId} className="border-b border-line text-right last:border-0">
                <td className="py-2.5 pr-3 text-left">
                  <div className="font-medium text-ink">{a.name}</div>
                  <div className="text-xs text-muted">{a.campaignName}</div>
                </td>
                <td className="py-2.5 pr-3">{won(a.kpis.spend)}</td>
                <td className="py-2.5 pr-3">{count(a.kpis.impressions)}</td>
                <td className="py-2.5 pr-3">{percent(a.kpis.ctr, 2)}</td>
                <td className="py-2.5 pr-3">{count(a.kpis.conversions)}</td>
                <td className="py-2.5 pr-3">{won(a.kpis.cpa)}</td>
                {v.isPurchase && <td className="py-2.5 pr-3">{multiple(a.kpis.roas)}</td>}
                {showVerdict && (
                  <td className="py-2.5 text-left">
                    <StatusBadge status={VERDICT[a.verdict].status} label={VERDICT[a.verdict].label} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showVerdict && (
        <p className="mt-3 text-xs text-muted">
          판정 기준: {v.unit}가 목표 이하면 승자, 목표의 2배를 넘거나 전환 없이 목표의 2배를 쓰면 중지 권장, 목표 1배만큼도 안 썼으면 학습 중.
        </p>
      )}
    </Card>
  );
}
