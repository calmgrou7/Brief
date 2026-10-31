import { useCallback, useEffect, useState } from "react";
import type { DashboardState, RecordKind } from "../shared/model.ts";
import { api, ApiError, errorText } from "./api";
import { FormModal, Toaster, toast, type FormSpec } from "./ui";
import Overview from "./views/Overview";
import Projects from "./views/Projects";
import Releases from "./views/Releases";
import Infra from "./views/Infra";
import Vault from "./views/Vault";
import Settings from "./views/Settings";

export type Tab =
  "overview" | "projects" | "releases" | "infra" | "vault" | "settings";
const TABS: [Tab, string][] = [
  ["overview", "개요"],
  ["projects", "프로젝트"],
  ["releases", "출시·업데이트"],
  ["infra", "도메인·서버"],
  ["vault", "계정 보관함"],
  ["settings", "백업·설정"],
];

export interface Ctx {
  s: DashboardState;
  setState: (s: DashboardState) => void;
  save: (
    kind: RecordKind,
    rec: { id: string } & Record<string, any>,
    msg?: string,
  ) => Promise<void>;
  remove: (kind: RecordKind, id: string, confirmText: string) => Promise<void>;
  openForm: (spec: FormSpec) => void;
  goto: (t: Tab) => void;
  reload: () => Promise<void>;
}

function readTab(): Tab {
  try {
    const t = localStorage.getItem("bridgenode-tab") as Tab;
    if (TABS.some(([k]) => k === t)) return t;
  } catch {}
  return "overview";
}

export default function App() {
  const [auth, setAuth] = useState<"loading" | "out" | "in">("loading");
  const [s, setState] = useState<DashboardState | null>(null);
  const [tab, setTab] = useState<Tab>(readTab);
  const [form, setForm] = useState<FormSpec | null>(null);

  const reload = useCallback(async () => {
    try {
      setState(await api<DashboardState>("state"));
      setAuth("in");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setAuth("out");
      else toast(errorText(e));
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  useEffect(() => {
    try {
      localStorage.setItem("bridgenode-tab", tab);
    } catch {}
  }, [tab]);

  const guard = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setAuth("out");
      toast(errorText(e));
      throw e;
    }
  };

  if (auth === "loading")
    return <div className="center muted">불러오는 중…</div>;
  if (auth === "out") return <Login onDone={reload} />;
  if (!s) return null;

  const ctx: Ctx = {
    s,
    setState,
    reload,
    openForm: setForm,
    goto: (t) => {
      setTab(t);
      window.scrollTo({ top: 0 });
    },
    save: (kind, rec, msg) =>
      guard(async () => {
        await api(`records/${kind}/${rec.id}`, "PUT", rec);
        await reload();
        if (msg) toast(msg);
      }),
    remove: async (kind, id, confirmText) => {
      if (!confirm(confirmText)) return;
      await guard(async () => {
        await api(`records/${kind}/${id}`, "DELETE");
        await reload();
        toast("삭제했습니다.");
      });
    },
  };

  return (
    <>
      <header>
        <div className="wrap">
          <div className="hdr">
            <div className="brand">
              <div className="logo">BN</div>
              <div>
                <b>브릿지노드 · 총괄 관리 대시보드</b>
                <small>
                  {new Date().toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}{" "}
                  기준
                </small>
              </div>
            </div>
            <ThemeButton />
            <a className="btn sm" href="/api/export">
              ⬇ 백업
            </a>
            <button
              className="btn sm"
              onClick={async () => {
                await api("logout", "POST").catch(() => {});
                setAuth("out");
                setState(null);
              }}
            >
              로그아웃
            </button>
          </div>
          <nav className="tabs" role="tablist">
            {TABS.map(([k, l]) => (
              <button
                key={k}
                className="tab"
                role="tab"
                aria-selected={tab === k}
                onClick={() => ctx.goto(k)}
              >
                {l}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="wrap">
        {tab === "overview" && <Overview ctx={ctx} />}
        {tab === "projects" && <Projects ctx={ctx} />}
        {tab === "releases" && <Releases ctx={ctx} />}
        {tab === "infra" && <Infra ctx={ctx} />}
        {/* 보관함은 탭 이동 시에도 잠금 상태 유지를 위해 항상 마운트 */}
        <div hidden={tab !== "vault"}>
          <Vault ctx={ctx} />
        </div>
        {tab === "settings" && <Settings ctx={ctx} />}
      </main>
      <FormModal spec={form} onClose={() => setForm(null)} />
      <Toaster />
    </>
  );
}

function Login({ onDone }: { onDone: () => Promise<void> }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="login">
      <form
        className="card lockbox"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr("");
          try {
            await api("login", "POST", { password: pw });
            setPw("");
            await onDone();
          } catch (e) {
            setErr(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="logo lg">BN</div>
        <h3>브릿지노드 총괄 대시보드</h3>
        <p className="muted small">관리자 비밀번호를 입력하세요.</p>
        <input
          type="password"
          id="login-pw"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="관리자 비밀번호"
          autoComplete="current-password"
          required
          autoFocus
        />
        {err && <div className="notice mt-s">{err}</div>}
        <button className="btn primary mt full-w" disabled={busy}>
          {busy ? "확인 중…" : "로그인"}
        </button>
      </form>
      <Toaster />
    </div>
  );
}

function ThemeButton() {
  return (
    <button
      className="btn sm"
      title="테마 전환"
      onClick={() => {
        const root = document.documentElement;
        const cur =
          root.dataset.theme ||
          (matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light");
        root.dataset.theme = cur === "dark" ? "light" : "dark";
        try {
          localStorage.setItem("bridgenode-theme", root.dataset.theme);
        } catch {}
      }}
    >
      🌓 테마
    </button>
  );
}
