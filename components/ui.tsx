import type { ReactNode } from "react";
import type { Status } from "@/lib/types";

export function Card({ title, aside, children, className = "" }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {(title || aside) && (
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
          {aside && <div className="text-xs text-muted">{aside}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

// 노랑(warning) 위에는 흰 글자 대비가 부족해 검은 아이콘을 쓴다.
const STATUS_STYLE: Record<Status | "neutral", { icon: string; dot: string; text: string; sr: string }> = {
  good: { icon: "✓", dot: "bg-good text-white", text: "text-good-text", sr: "양호" },
  warning: { icon: "!", dot: "bg-warning text-black", text: "text-warning-text", sr: "주의" },
  critical: { icon: "✕", dot: "bg-critical text-white", text: "text-critical-text", sr: "위험" },
  neutral: { icon: "·", dot: "bg-muted text-white", text: "text-ink-2", sr: "정보" },
};

/** 상태는 색만으로 전달하지 않는다: 아이콘 + 라벨을 함께 쓴다 */
export function StatusBadge({ status, label }: { status: Status | "neutral"; label: string }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${s.text}`}>
      <span aria-hidden className={`inline-flex size-4 items-center justify-center rounded-full text-[10px] font-bold leading-none ${s.dot}`}>
        {s.icon}
      </span>
      {label || <span className="sr-only">{s.sr}</span>}
    </span>
  );
}

/** 증감 표시. lowerIsBetter면 감소가 좋은 방향, neutral이면 좋고 나쁨을 칠하지 않는다(예: 광고비). */
export function Delta({ value, lowerIsBetter = false, neutral = false }: { value: number | null; lowerIsBetter?: boolean; neutral?: boolean }) {
  if (value == null) return <span className="text-xs text-muted">비교 불가</span>;
  if (Math.abs(value) < 0.005) return <span className="text-xs text-muted">변동 없음</span>;
  const up = value > 0;
  const good = up !== lowerIsBetter;
  return (
    <span className={`tabular text-xs font-medium ${neutral ? "text-ink-2" : good ? "text-good-text" : "text-critical-text"}`}>
      {up ? "▲" : "▼"} {Math.abs(value * 100).toFixed(1)}%
    </span>
  );
}

export function Meter({ value, marker, status }: { value: number; marker?: number; status: Status }) {
  const fill = { good: "bg-good", warning: "bg-warning", critical: "bg-critical" }[status];
  return (
    <div className="relative h-2 w-full rounded-full bg-surface-2" role="presentation">
      <div className={`h-2 rounded-full ${fill}`} style={{ width: `${Math.min(100, value * 100)}%` }} />
      {marker != null && (
        <div className="absolute -top-1 h-4 w-0.5 rounded bg-ink-2" style={{ left: `${Math.min(100, marker * 100)}%` }} title="월말 예상" />
      )}
    </div>
  );
}
