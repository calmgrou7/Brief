import { useEffect, useState } from "react";
import { SUPPORTED_GU } from "../../contracts/analysis.ts";
import { DATA_MODE, searchPlaces, type Place } from "../data/api.ts";
import { FixtureBadge, Header } from "../ui.tsx";

type State = { kind: "idle" } | { kind: "loading" } | { kind: "done"; items: Place[] } | { kind: "error"; message: string };

export function SearchScreen({
  title,
  onPick,
  onBack,
  onOpenNotebook,
  excludeId,
}: {
  title: string;
  onPick: (p: Place) => void;
  onBack?: () => void;
  onOpenNotebook?: () => void;
  excludeId?: string;
}) {
  const [q, setQ] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const t = q.trim();
    if (DATA_MODE === "live" && t.length < 2) {
      setState({ kind: "idle" });
      return;
    }
    const ctl = new AbortController();
    setState({ kind: "loading" });
    const timer = setTimeout(() => {
      searchPlaces(t, ctl.signal)
        .then((items) => setState({ kind: "done", items: items.filter((p) => p.id !== excludeId) }))
        .catch((e) => {
          if ((e as Error).name !== "AbortError") setState({ kind: "error", message: (e as Error).message });
        });
    }, DATA_MODE === "live" ? 350 : 0);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [q, excludeId, retry]);

  return (
    <div className="screen">
      <Header
        title={title}
        onBack={onBack}
        right={onOpenNotebook && <button className="text-btn" onClick={onOpenNotebook}>보관함</button>}
      />
      {!onBack && (
        <section className="hero">
          <h2>카페 후보지,<br />두 곳을 비교해 보세요</h2>
          <p className="muted">경쟁 카페와 주변 점포를 같은 기준으로 보고, 답사할 일을 정리해요.</p>
        </section>
      )}
      <div className="notice">
        <strong>지원 지역</strong> 부산 {SUPPORTED_GU.join(" · ")} {DATA_MODE === "fixture" && <FixtureBadge />}
        <br />
        <span className="muted small">매출 예측이나 성공 점수는 제공하지 않아요.</span>
      </div>
      <label className="field">
        <span className="sr-only">주소 검색</span>
        <input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder={DATA_MODE === "live" ? "도로명·지번 주소 (예: 부산진구 중앙대로 692)" : "주소나 장소 이름 검색"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={60}
          autoFocus={!!onBack}
        />
      </label>
      <ul className="list" aria-live="polite">
        {state.kind === "idle" && <li className="muted pad small">주소를 2글자 이상 입력하세요.</li>}
        {state.kind === "loading" && <li className="muted pad small">검색 중…</li>}
        {state.kind === "error" && (
          <li className="pad">
            <span className="error-text">{state.message}</span>{" "}
            <button className="text-btn" onClick={() => setRetry((n) => n + 1)}>다시 시도</button>
          </li>
        )}
        {state.kind === "done" && state.items.length === 0 && (
          <li className="muted pad small">검색 결과가 없어요. 도로명이나 지번 주소로 찾아보세요.</li>
        )}
        {state.kind === "done" &&
          state.items.map((p) => (
            <li key={p.id}>
              <button className="row" onClick={() => onPick(p)}>
                <span>
                  <strong>{p.label}</strong>
                  {p.label !== p.address && (
                    <>
                      <br />
                      <span className="muted small">{p.address}</span>
                    </>
                  )}
                </span>
                {!p.supported && <span className="badge">지원 지역 밖</span>}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
