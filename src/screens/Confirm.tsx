import { SUPPORTED_GU } from "../../contracts/analysis.ts";
import { type Place } from "../data/api.ts";
import { Header } from "../ui.tsx";

export function ConfirmScreen({
  places,
  onBack,
  onAddB,
  onRemoveB,
  onAnalyze,
  loading,
}: {
  places: Place[];
  onBack: () => void;
  onAddB: () => void;
  onRemoveB: () => void;
  onAnalyze: () => void;
  loading: boolean;
}) {
  const outside = places.filter((p) => !p.supported);
  return (
    <div className="screen">
      <Header title="위치 확인" onBack={onBack} />
      <div className="map-fallback" role="img" aria-label="지도 자리">
        <span>지도는 다음 단계에서 표시돼요</span>
        <span className="muted small">지금은 목록으로 위치를 확인해요</span>
      </div>
      <ul className="list">
        {places.map((p, i) => (
          <li key={p.id} className="row static">
            <span>
              <span className="badge brand">후보 {i === 0 ? "A" : "B"}</span> <strong>{p.label}</strong>
              <br />
              <span className="muted small">{p.address} · 직선 반경 500m</span>
            </span>
            {i === 1 && (
              <button className="text-btn" onClick={onRemoveB}>
                빼기
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="notice small">
        <strong>업종: 카페</strong> — 상가정보의 커피·카페 분류 기준이에요. 제과점 포함 범위는 데이터 확인 후 확정돼요.
      </div>
      {outside.length > 0 && (
        <div className="notice error" role="alert">
          {outside.map((p) => p.label).join(", ")}은(는) 아직 분석할 수 없어요. 지원 지역: {SUPPORTED_GU.join(", ")}
        </div>
      )}
      <div className="bottom">
        {places.length < 2 && (
          <button className="btn secondary" onClick={onAddB}>
            후보 B 추가
          </button>
        )}
        <button className="btn" disabled={outside.length > 0 || loading} onClick={onAnalyze}>
          {loading ? "분석 중…" : "분석하기"}
        </button>
      </div>
    </div>
  );
}
