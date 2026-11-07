import type { ReactNode } from "react";
import type { Evidence, EvidenceStatus, MetricId } from "../contracts/analysis.ts";

export const METRIC_LABEL: Record<MetricId, string> = {
  competitor_count: "경쟁 카페",
  same_industry_share: "카페 비중",
  nearest_competitor_m: "가장 가까운 카페",
  total_store_count: "반경 내 전체 점포",
  dong_population: "행정동 인구",
  dong_age_share: "행정동 연령 구성",
};

export const METRIC_SCOPE_NOTE: Partial<Record<MetricId, string>> = {
  competitor_count: "직선 반경 500m · 등록 점포 기준",
  same_industry_share: "반경 내 수집된 전체 점포 중 · 시장점유율 아님",
  nearest_competitor_m: "직선거리 · 실제 보행거리 아님",
  dong_population: "행정동 전체 · 반경 내 인구 아님",
};

const UNIT: Record<Evidence["unit"], string> = { stores: "곳", percent: "%", m: "m", persons: "명" };

const STATUS_TEXT: Record<Exclude<EvidenceStatus, "ok">, string> = {
  not_loaded: "확인 불가",
  missing: "자료 없음",
  suppressed: "비공개 자료",
  not_comparable: "직접 비교 불가",
};

/** 완전 수집(status=ok)인데 값이 null인 경우: 실패가 아니라 "해당 없음" */
const OK_NULL_TEXT: Partial<Record<MetricId, string>> = {
  nearest_competitor_m: "500m 내 없음",
  same_industry_share: "점포 0곳",
};

export function formatValue(
  value: number | null,
  unit: Evidence["unit"],
  status: EvidenceStatus = "ok",
  metric?: MetricId,
): string {
  if (status !== "ok") return STATUS_TEXT[status];
  if (value === null) return (metric && OK_NULL_TEXT[metric]) ?? "확인 불가";
  return `${value.toLocaleString("ko-KR")}${UNIT[unit]}`;
}

export function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="hdr">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="뒤로">
          ‹
        </button>
      ) : (
        <span className="icon-btn" />
      )}
      <h1>{title}</h1>
      <span className="hdr-right">{right}</span>
    </header>
  );
}

export function FixtureBadge() {
  return <span className="badge warn">가상 데이터</span>;
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="sheet-bg" onClick={onClose} role="presentation">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-hdr">
          <strong>{title}</strong>
          <button className="text-btn" onClick={onClose}>
            닫기
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EvidenceDetail({ e }: { e: Evidence }) {
  const scope =
    e.scope.area_type === "radius" ? `직선 반경 ${e.scope.radius_m}m` : `행정동 ${e.scope.name} (${e.scope.code_version})`;
  const rows: [string, string][] = [
    ["출처", e.source_id === "SEMAS" ? "소상공인시장진흥공단 상가(상권)정보" : e.source_id === "SGIS" ? "통계청 SGIS" : e.source_id],
    ["기준기간", e.source_period ?? "—"],
    ["공간범위", scope],
    ["단위", UNIT[e.unit]],
    ["수집일", e.fetched_at ?? "—"],
    ["상태", e.status === "ok" ? "확인된 자료" : STATUS_TEXT[e.status]],
    ["스냅샷", e.snapshot_id ?? "—"],
  ];
  return (
    <dl className="kv">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
