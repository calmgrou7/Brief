import { useEffect } from "react";
import type { AnalysisResponse } from "../../contracts/analysis.ts";
import { track } from "../platform/host.ts";
import { FixtureBadge, Header, METRIC_LABEL, formatValue } from "../ui.tsx";

export function CompareScreen({ data, onBack, onSave }: { data: AnalysisResponse; onBack: () => void; onSave: () => void }) {
  useEffect(() => track("comparison_viewed"), [data.analysis_id]);
  const unitOf = (m: string) => data.evidence.find((e) => e.metric === m)?.unit ?? "stores";
  const statusOf = (k: "A" | "B", m: string) => data.evidence.find((e) => e.candidate === k && e.metric === m)?.status ?? "not_loaded";
  const [a, b] = data.candidates;

  return (
    <div className="screen">
      <Header title="후보 비교" onBack={onBack} />
      <p className="pad muted small">
        같은 자료·같은 반경으로 계산한 값만 차이를 보여줘요. {data.is_fixture && <FixtureBadge />}
      </p>
      <table className="cmp">
        <thead>
          <tr>
            <th scope="col">지표</th>
            <th scope="col">A<br /><span className="xs muted">{a.label}</span></th>
            <th scope="col">B<br /><span className="xs muted">{b.label}</span></th>
            <th scope="col">차이 (A−B)</th>
          </tr>
        </thead>
        <tbody>
          {(data.comparison ?? []).map((r) => {
            const u = unitOf(r.metric);
            return (
              <tr key={r.metric}>
                <th scope="row">{METRIC_LABEL[r.metric]}</th>
                <td>{formatValue(r.a, u, statusOf("A", r.metric), r.metric)}</td>
                <td>{formatValue(r.b, u, statusOf("B", r.metric), r.metric)}</td>
                <td>
                  {r.status === "ok" && r.diff !== null ? (
                    <>
                      {r.diff > 0 ? "+" : ""}
                      {formatValue(r.diff, u)}
                      {r.relative_pct !== null && <span className="xs muted"> ({r.relative_pct > 0 ? "+" : ""}{r.relative_pct}%)</span>}
                    </>
                  ) : (
                    <span className="xs muted">{r.reason ?? "비교 불가"}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="notice small">
        경쟁 카페가 적다고 좋은 입지라는 뜻은 아니에요. 수요가 적을 수도 있어요. 두 곳 모두 직접 걸어보며 확인해 보세요.
      </div>
      <div className="bottom">
        <button className="btn" onClick={onSave}>
          답사 준비하기
        </button>
      </div>
    </div>
  );
}
