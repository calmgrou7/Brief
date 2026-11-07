import { useEffect, useState } from "react";
import type { AnalysisResponse, Evidence, MetricId } from "../../contracts/analysis.ts";
import { renderText } from "../ai-guard.ts";
import { track } from "../platform/host.ts";
import { EvidenceDetail, FixtureBadge, Header, METRIC_LABEL, METRIC_SCOPE_NOTE, Sheet, formatValue } from "../ui.tsx";

const CARD_METRICS: MetricId[] = ["competitor_count", "same_industry_share", "nearest_competitor_m", "dong_population"];

export function ResultScreen({
  data,
  onBack,
  onCompare,
  onAddB,
  onSave,
}: {
  data: AnalysisResponse;
  onBack: () => void;
  onCompare: () => void;
  onAddB: () => void;
  onSave: () => void;
}) {
  const [cand, setCand] = useState<"A" | "B">("A");
  const [open, setOpen] = useState<Evidence | null>(null);
  const hasB = data.candidates.length > 1;
  const c = data.candidates.find((x) => x.key === cand)!;
  const ev = (m: MetricId) => data.evidence.find((e) => e.candidate === cand && e.metric === m);
  const period = data.evidence.find((e) => e.status === "ok")?.source_period ?? "—";

  useEffect(() => track("metrics_viewed", { candidates: data.candidates.length }), [data.analysis_id]);

  const openEvidence = (e: Evidence) => {
    setOpen(e);
    track("evidence_opened", { metric: e.metric });
  };

  return (
    <div className="screen">
      <Header title="분석 결과" onBack={onBack} />
      {hasB && (
        <div className="seg" role="tablist">
          {data.candidates.map((x) => (
            <button key={x.key} role="tab" aria-selected={cand === x.key} className={cand === x.key ? "on" : ""} onClick={() => setCand(x.key)}>
              후보 {x.key}
            </button>
          ))}
        </div>
      )}
      <section className="pad">
        <h2 className="h2">{c.label}</h2>
        <p className="muted small">
          카페 · 직선 반경 500m · 자료 기준 {period} {data.is_fixture && <FixtureBadge />}
          {data.status === "partial" && <span className="badge">일부 누락</span>}
        </p>
      </section>

      <div className="cards">
        {CARD_METRICS.map((m) => {
          const e = ev(m);
          if (!e) return null;
          return (
            <button key={m} className="card" onClick={() => openEvidence(e)} aria-label={`${METRIC_LABEL[m]} 근거 보기`}>
              <span className="muted small">{METRIC_LABEL[m]}</span>
              <strong className={e.status === "ok" ? "num" : "num dim"}>{formatValue(e.value, e.unit, e.status, m)}</strong>
              <span className="muted xs">{METRIC_SCOPE_NOTE[m]}</span>
              <span className="link xs">근거 보기</span>
            </button>
          );
        })}
      </div>

      <section className="pad">
        <h3 className="h3">
          해석 {data.ai_status === "fallback" && <span className="badge">규칙형 요약</span>}
        </h3>
        {data.ai ? (
          <>
            <ul className="bullets">
              {[...data.ai.observations, ...data.ai.interpretations].map((o, i) => (
                <li key={i}>{renderText(o.text, data.evidence)}</li>
              ))}
            </ul>
            <h3 className="h3">현장에서 확인할 것</h3>
            <ul className="bullets">
              {data.ai.field_checks.map((f, i) => (
                <li key={i}>{f.text}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="muted">해석을 준비하지 못했어요. 숫자와 체크리스트는 그대로 볼 수 있어요.</p>
        )}
        <h3 className="h3">이 결과의 한계</h3>
        <ul className="bullets muted small">
          {[...data.limitations, ...(data.ai?.limitations ?? [])].map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </section>

      <div className="bottom">
        {hasB ? (
          <button className="btn secondary" onClick={onCompare}>
            두 후보 비교
          </button>
        ) : (
          <button className="btn secondary" onClick={onAddB}>
            후보 B 추가
          </button>
        )}
        <button className="btn" onClick={onSave}>
          답사 목록에 저장
        </button>
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? METRIC_LABEL[open.metric] : ""}>
        {open && <EvidenceDetail e={open} />}
      </Sheet>
    </div>
  );
}
