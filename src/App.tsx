import { useCallback, useEffect, useState } from "react";
import type { AnalysisResponse } from "../contracts/analysis.ts";
import { CAFE_FIELD_CHECKS } from "./ai-guard.ts";
import { analyze, type Place } from "./data/api.ts";
import { loadNotebook, saveNotebook, type SavedCandidate } from "./data/notebook.ts";
import { track } from "./platform/host.ts";
import { CompareScreen } from "./screens/Compare.tsx";
import { ConfirmScreen } from "./screens/Confirm.tsx";
import { NotebookScreen } from "./screens/Notebook.tsx";
import { ResultScreen } from "./screens/Result.tsx";
import { SearchScreen } from "./screens/Search.tsx";

type Screen = "search" | "searchB" | "confirm" | "result" | "compare" | "notebook";

/**
 * 화면 전환은 history 스택을 사용한다. 토스 내비게이션 바의 뒤로가기와
 * 안드로이드 하드웨어 뒤로가기가 그대로 이전 화면으로 돌아오고, 입력 상태는 유지된다.
 */
function useHistoryScreen(initial: Screen) {
  const [screen, setScreen] = useState<Screen>(() => (history.state?.screen as Screen) ?? initial);
  useEffect(() => {
    if (!history.state?.screen) history.replaceState({ screen: initial }, "");
    const onPop = (e: PopStateEvent) => setScreen((e.state?.screen as Screen) ?? initial);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [initial]);
  const go = useCallback((s: Screen) => {
    history.pushState({ screen: s }, "");
    setScreen(s);
    window.scrollTo(0, 0);
  }, []);
  const back = useCallback(() => history.back(), []);
  /** 현재 화면을 스택에서 교체 (뒤로가기 시 중복 화면이 생기지 않게) */
  const replace = useCallback((s: Screen) => {
    history.replaceState({ screen: s }, "");
    setScreen(s);
    window.scrollTo(0, 0);
  }, []);
  return { screen, go, back, replace };
}

export function App() {
  const { screen, go, back, replace } = useHistoryScreen("search");
  const [bOrigin, setBOrigin] = useState<Screen>("confirm");
  const [places, setPlaces] = useState<Place[]>([]);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notebook, setNotebook] = useState<SavedCandidate[]>([]);
  const [nbError, setNbError] = useState<string | null>(null);

  useEffect(() => {
    loadNotebook().then(setNotebook);
  }, []);

  // 결과가 없는 상태로 결과/비교 화면에 돌아오면(새로고침 등) 첫 화면으로
  const safeScreen: Screen = (screen === "result" || screen === "compare") && !result ? "search" : screen;

  const runAnalysis = async (ps: Place[]) => {
    setLoading(true);
    setError(null);
    track("analysis_started", { candidates: ps.length });
    try {
      const r = await analyze(ps);
      setResult(r);
      go("result");
    } catch (e) {
      setError((e as Error).message || "자료를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const persist = async (next: SavedCandidate[]) => {
    setNotebook(next);
    try {
      await saveNotebook(next);
      setNbError(null);
    } catch {
      setNbError("저장하지 못했어요. 저장 공간을 확인해 주세요.");
    }
  };

  const saveToNotebook = async () => {
    if (!result) return;
    const checks = result.ai?.field_checks.map((f) => f.text) ?? CAFE_FIELD_CHECKS.slice(0, 3);
    const now = new Date().toISOString();
    const added: SavedCandidate[] = places.map((p) => ({
      id: `${p.id}:${result.analysis_id}`,
      label: p.label,
      address: p.address,
      checklist: checks.map((text) => ({ text, done: false })),
      note: "",
      analysis_id: result.analysis_id,
      metric_version: result.metric_version,
      saved_at: now,
    }));
    const ids = new Set(added.map((a) => a.id));
    await persist([...added, ...notebook.filter((n) => !ids.has(n.id))]);
    track("checklist_saved", { candidates: added.length });
    go("notebook");
  };

  switch (safeScreen) {
    case "search":
      return (
        <SearchScreen
          title="상권첫걸음"
          onOpenNotebook={() => go("notebook")}
          onPick={(p) => {
            setPlaces([p]);
            setResult(null);
            setError(null);
            go("confirm");
          }}
        />
      );
    case "searchB":
      return (
        <SearchScreen
          title="후보 B 선택"
          onBack={back}
          excludeId={places[0]?.id}
          onPick={(p) => {
            setPlaces([places[0], p]);
            setResult(null);
            setError(null);
            // 확인 화면에서 왔으면 되돌아가고, 결과 화면에서 왔으면 검색 화면을 확인 화면으로 교체
            if (bOrigin === "confirm") back();
            else replace("confirm");
          }}
        />
      );
    case "confirm":
      return (
        <>
          <ConfirmScreen
            places={places}
            loading={loading}
            onBack={back}
            onAddB={() => {
              setBOrigin("confirm");
              go("searchB");
            }}
            onRemoveB={() => setPlaces(places.slice(0, 1))}
            onAnalyze={() => runAnalysis(places)}
          />
          {error && <div className="toast" role="alert">{error}</div>}
        </>
      );
    case "result":
      return (
        <ResultScreen
          data={result!}
          onBack={back}
          onCompare={() => go("compare")}
          onAddB={() => {
            setBOrigin("result");
            go("searchB");
          }}
          onSave={saveToNotebook}
        />
      );
    case "compare":
      return <CompareScreen data={result!} onBack={back} onSave={saveToNotebook} />;
    case "notebook":
      return <NotebookScreen items={notebook} onChange={persist} onBack={back} error={nbError} />;
  }
}
