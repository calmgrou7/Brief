import { useEffect, useRef, useState, type ReactNode } from "react";
import { daysUntil, dday, ddayTone, type Tone } from "../shared/model.ts";

export const fmtD = (s?: string) => (s ? s.replace(/-/g, ".") : "-");
export const newId = () => crypto.randomUUID();

export function Badge({
  tone = "mute",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return <span className={`badge b-${tone}`}>{children}</span>;
}
export function DDay({
  date,
  warn = 60,
  bad = 30,
}: {
  date?: string;
  warn?: number;
  bad?: number;
}) {
  const n = daysUntil(date || "");
  if (n == null) return <span className="muted">-</span>;
  return (
    <Badge tone={ddayTone(n, warn, bad)}>
      {n < 0 ? "만료 " : ""}
      {dday(n)}
    </Badge>
  );
}
export function SafeLink({ url }: { url?: string }) {
  if (!url) return <>-</>;
  if (!/^https?:\/\//i.test(url)) return <>{url}</>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {url.replace(/^https?:\/\//, "")}
    </a>
  );
}
export function Dot({ color }: { color: string }) {
  return <span className="dot" style={{ background: color }} />;
}

/* ---------- 토스트 ---------- */
let pushToast: (msg: string) => void = () => {};
export const toast = (msg: string) => pushToast(msg);
export function Toaster() {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<number>(0);
  useEffect(() => {
    pushToast = (m) => {
      setMsg(m);
      setShow(true);
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setShow(false), 2400);
    };
  }, []);
  return (
    <div
      className={`toast ${show ? "show" : ""}`}
      role="status"
      aria-live="polite"
    >
      {msg}
    </div>
  );
}

/* ---------- 범용 입력 모달 ---------- */
export type FieldType =
  "text" | "date" | "number" | "select" | "area" | "check" | "password";
export interface Field {
  k: string;
  l: string;
  t?: FieldType;
  o?: [string, string][];
  req?: boolean;
  full?: boolean;
  ph?: string;
}
export interface FormSpec {
  title: string;
  fields: Field[];
  data: Record<string, any>;
  extra?: (set: (k: string, v: any) => void) => ReactNode;
  onSave: (out: Record<string, any>) => Promise<void> | void;
}
export function FormModal({
  spec,
  onClose,
}: {
  spec: FormSpec | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [vals, setVals] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  useEffect(() => {
    if (!spec) return;
    setVals({ ...spec.data });
    setShowPw(false);
    ref.current?.showModal();
  }, [spec]);
  if (!spec) return null;
  const set = (k: string, v: any) => setVals((s) => ({ ...s, [k]: v }));
  const close = () => {
    ref.current?.close();
    onClose();
  };
  return (
    <dialog ref={ref} onClose={onClose} onCancel={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const out: Record<string, any> = { ...vals };
            for (const f of spec.fields) {
              if (f.t === "number")
                out[f.k] =
                  out[f.k] === "" || out[f.k] == null ? 0 : Number(out[f.k]);
              else if (f.t !== "check" && typeof out[f.k] === "string")
                out[f.k] = out[f.k].trim();
            }
            await spec.onSave(out);
            close();
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="dlg-h">
          <h3>{(spec.data.id ? "수정 · " : "추가 · ") + spec.title}</h3>
          <button
            type="button"
            className="icon-btn"
            onClick={close}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="dlg-b">
          {spec.fields.map((f) => {
            const id = "f_" + f.k;
            const v = vals[f.k] ?? "";
            if (f.t === "check")
              return (
                <div className="fld chk" key={f.k}>
                  <input
                    type="checkbox"
                    id={id}
                    checked={!!vals[f.k]}
                    onChange={(e) => set(f.k, e.target.checked)}
                  />
                  <label htmlFor={id}>{f.l}</label>
                </div>
              );
            return (
              <div className={`fld ${f.full ? "full" : ""}`} key={f.k}>
                <label htmlFor={id}>
                  {f.l}
                  {f.req ? " *" : ""}
                </label>
                {f.t === "select" ? (
                  <select
                    id={id}
                    value={v}
                    required={f.req}
                    onChange={(e) => set(f.k, e.target.value)}
                  >
                    {f.o!.map(([ov, ol]) => (
                      <option key={ov} value={ov}>
                        {ol}
                      </option>
                    ))}
                  </select>
                ) : f.t === "area" ? (
                  <textarea
                    id={id}
                    value={v}
                    onChange={(e) => set(f.k, e.target.value)}
                  />
                ) : (
                  <input
                    id={id}
                    type={
                      f.t === "password"
                        ? showPw
                          ? "text"
                          : "password"
                        : f.t || "text"
                    }
                    value={v}
                    placeholder={f.ph}
                    required={f.req}
                    autoComplete={f.t === "password" ? "new-password" : "off"}
                    onChange={(e) => set(f.k, e.target.value)}
                  />
                )}
              </div>
            );
          })}
          {spec.extra && (
            <div className="fld full">
              {spec.extra((k, v) => {
                set(k, v);
                setShowPw(true);
              })}
            </div>
          )}
        </div>
        <div className="dlg-f">
          <button type="button" className="btn" onClick={close}>
            취소
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
