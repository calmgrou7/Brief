import { useState } from "react";
import type { SavedCandidate } from "../data/notebook.ts";
import { Header } from "../ui.tsx";

export function NotebookScreen({
  items,
  onChange,
  onBack,
  error,
}: {
  items: SavedCandidate[];
  onChange: (next: SavedCandidate[]) => void;
  onBack: () => void;
  error: string | null;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const update = (id: string, patch: Partial<SavedCandidate>) =>
    onChange(items.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <div className="screen">
      <Header title="답사 보관함" onBack={onBack} />
      <p className="pad muted small">이 기기에 저장돼요. 앱 데이터를 지우면 사라질 수 있어요.</p>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {items.length === 0 && <p className="pad muted">저장한 후보가 없어요. 분석 결과에서 ‘답사 목록에 저장’을 눌러 보세요.</p>}
      {items.map((it) => {
        const done = it.checklist.filter((c) => c.done).length;
        return (
          <section key={it.id} className="nb">
            <div className="nb-hdr">
              <span>
                <strong>{it.label}</strong>
                <br />
                <span className="muted xs">
                  {it.address} · 체크 {done}/{it.checklist.length}
                </span>
              </span>
              {confirmId === it.id ? (
                <span>
                  <button className="text-btn danger" onClick={() => onChange(items.filter((x) => x.id !== it.id))}>
                    삭제
                  </button>
                  <button className="text-btn" onClick={() => setConfirmId(null)}>
                    취소
                  </button>
                </span>
              ) : (
                <button className="text-btn" onClick={() => setConfirmId(it.id)}>
                  삭제
                </button>
              )}
            </div>
            <ul className="checks">
              {it.checklist.map((c, i) => (
                <li key={i}>
                  <label>
                    <input
                      type="checkbox"
                      checked={c.done}
                      onChange={() =>
                        update(it.id, { checklist: it.checklist.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) })
                      }
                    />
                    <span>{c.text}</span>
                  </label>
                </li>
              ))}
            </ul>
            <label className="field">
              <span className="xs muted">메모 (기기에만 저장)</span>
              <textarea
                rows={2}
                maxLength={500}
                value={it.note}
                onChange={(e) => update(it.id, { note: e.target.value })}
                placeholder="예: 점심 대기줄 있음, 언덕 경사 심함"
              />
            </label>
          </section>
        );
      })}
    </div>
  );
}
