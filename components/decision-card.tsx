import Link from "next/link";
import { TYPE_LABEL, type Decision, type DecisionType } from "@/lib/decisions";
import { DecisionButtons } from "./decision-buttons";
import { Sparkline } from "./sparkline";

const TYPE_ICON: Record<DecisionType, string> = {
  pause_ad: "⏸",
  scale_ad: "↑",
  refresh_creative: "↻",
  slow_budget: "↓",
  use_budget: "↑",
};

export function DecisionCard({ d, rank, showClient = true }: { d: Decision; rank: number; showClient?: boolean }) {
  return (
    <article className="rounded-xl border border-line bg-surface">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="tabular font-semibold text-muted">#{rank}</span>
            {showClient && (
              <Link href={`/clients/${d.clientId}`} className="rounded-md bg-surface-2 px-2 py-0.5 font-medium text-ink hover:underline">
                {d.clientName}
              </Link>
            )}
            <span className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-ink-2">
              <span aria-hidden>{TYPE_ICON[d.type]}</span>
              {TYPE_LABEL[d.type]}
            </span>
          </div>
          <h3 className="mt-2 text-base font-bold text-ink">{d.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{d.reason}</p>
        </div>

        <div className="shrink-0 rounded-lg bg-surface-2 px-4 py-3 sm:min-w-44 sm:text-right">
          <div className="text-[11px] font-medium text-muted">예상 효과 · {d.impactBasis}</div>
          <div className={`mt-0.5 text-lg font-bold ${d.impactWon > 0 ? "text-good-text" : "text-ink"}`}>{d.impactLabel}</div>
          {d.impactNote && <div className="mt-0.5 text-xs text-ink-2">{d.impactNote}</div>}
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <dl className="tabular grid grid-cols-2 gap-x-5 gap-y-1 text-xs sm:flex sm:flex-wrap">
          {d.evidence.map((e) => (
            <div key={e.label} className="flex items-baseline gap-1.5">
              <dt className="text-muted">{e.label}</dt>
              <dd className={`font-semibold ${e.bad ? "text-critical-text" : "text-ink"}`}>{e.value}</dd>
            </div>
          ))}
        </dl>
        {d.trend && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted">
              {d.trend.label}
              <br />
              14일{d.trend.target != null ? " · 회색선 목표" : ""}
            </span>
            <Sparkline values={d.trend.values} target={d.trend.target} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-xs text-muted">
          <span className="font-medium text-ink-2">승인하면</span> {d.action}
        </p>
        <DecisionButtons d={d} />
      </div>
    </article>
  );
}
