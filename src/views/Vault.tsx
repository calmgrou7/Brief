import { useEffect, useRef, useState } from "react";
import { ACC_CAT, type Account } from "../../shared/model.ts";
import type { Ctx } from "../App";
import { api, errorText } from "../api";
import { Badge, SafeLink, fmtD, newId, toast } from "../ui";
import * as vault from "../vault";
import { accountFields } from "./forms";

const IDLE_MS = 10 * 60 * 1000;

export default function Vault({ ctx }: { ctx: Ctx }) {
  const { s } = ctx;
  const [session, setSession] = useState<vault.VaultSession | null>(null);
  const [items, setItems] = useState<Account[]>([]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const timer = useRef<number>(0);

  const lock = (msg?: string) => {
    setSession(null);
    setItems([]);
    setRevealed(new Set());
    clearTimeout(timer.current);
    if (msg) toast(msg);
  };
  const touch = () => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => lock("10분 동안 사용하지 않아 보관함을 잠갔습니다."),
      IDLE_MS,
    );
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  // 서버의 보관함이 사라지면(초기화·복원) 잠금
  useEffect(() => {
    if (!s.vault && session) lock();
  }, [s.vault]);

  const persist = async (next: Account[], sess = session!) => {
    const blob = await vault.seal(sess, next);
    try {
      const r = await api<{ vault: any }>("vault", "PUT", { vault: blob });
      ctx.setState({ ...s, vault: r.vault });
      setItems(next);
      toast("암호화하여 저장했습니다.");
    } catch (e) {
      toast(errorText(e));
      throw e;
    }
  };

  if (!window.crypto?.subtle)
    return (
      <div className="card notice">
        이 환경에서는 암호화 기능을 사용할 수 없습니다. HTTPS 주소 또는
        localhost로 접속하세요.
      </div>
    );

  if (!s.vault)
    return (
      <form
        className="card lockbox"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const a = String(f.get("pw1")),
            b = String(f.get("pw2"));
          if (a.length < 10) return toast("10자 이상으로 설정하세요.");
          if (a !== b) return toast("비밀번호 확인이 일치하지 않습니다.");
          const sess = await vault.createSession(a);
          await persist([], sess);
          setSession(sess);
          touch();
        }}
      >
        <div className="big-ico">🔐</div>
        <h3>계정 보관함 만들기</h3>
        <p className="sub small">
          토스 콘솔·도메인·서버·스토어 계정의 아이디/비밀번호를{" "}
          <b>마스터 비밀번호</b>로 암호화해 보관합니다. 서버에는 암호문만
          저장됩니다.
        </p>
        <input
          type="password"
          name="pw1"
          id="vpw1"
          placeholder="마스터 비밀번호 (10자 이상)"
          autoComplete="new-password"
          minLength={10}
          required
        />
        <input
          type="password"
          name="pw2"
          id="vpw2"
          placeholder="마스터 비밀번호 확인"
          autoComplete="new-password"
          required
        />
        <button className="btn primary mt full-w">보관함 생성</button>
        <div className="notice mt left">
          마스터 비밀번호는 서버를 포함해 어디에도 저장되지 않습니다. 잊어버리면{" "}
          <b>복구할 수 없습니다</b>. 관리자 로그인 비밀번호와 다르게 설정하세요.
        </div>
      </form>
    );

  if (!session)
    return (
      <form
        className="card lockbox"
        onSubmit={async (e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem(
            "vpw",
          ) as HTMLInputElement;
          try {
            const r = await vault.open(s.vault!, input.value);
            setSession(r.session);
            setItems(r.items);
            input.value = "";
            touch();
          } catch {
            toast("마스터 비밀번호가 올바르지 않습니다.");
            input.select();
          }
        }}
      >
        <div className="big-ico">🔒</div>
        <h3>보관함이 잠겨 있습니다</h3>
        <input
          type="password"
          name="vpw"
          id="vpw"
          placeholder="마스터 비밀번호"
          autoComplete="current-password"
          required
        />
        <button className="btn primary mt full-w">잠금 해제</button>
      </form>
    );

  const name = (id: string) => s.projects.find((p) => p.id === id)?.name ?? "-";
  const edit = (a?: Account) => {
    touch();
    ctx.openForm({
      title: "계정",
      fields: accountFields(s),
      data: a ?? { category: "toss" },
      extra: (set) => (
        <button
          type="button"
          className="btn sm"
          onClick={() => set("password", vault.strongPassword())}
        >
          🎲 강력한 비밀번호 생성
        </button>
      ),
      onSave: async (out) => {
        const rec = { ...out, id: out.id || newId() } as Account;
        await persist(
          items.some((x) => x.id === rec.id)
            ? items.map((x) => (x.id === rec.id ? rec : x))
            : [...items, rec],
        );
      },
    });
  };
  const copy = async (text: string, label: string) => {
    touch();
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label}를 복사했습니다.`);
    } catch {
      toast("복사 권한이 없습니다.");
    }
  };

  return (
    <div onKeyDown={touch}>
      <div className="section-head">
        <h2>계정 보관함</h2>
        <Badge tone="ok">🔓 잠금 해제됨</Badge>
        <button className="btn" onClick={() => lock("보관함을 잠갔습니다.")}>
          잠그기
        </button>
        <button className="btn primary" id="add-acc" onClick={() => edit()}>
          + 계정
        </button>
      </div>
      <div className="card">
        {items.length ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>분류</th>
                  <th>서비스</th>
                  <th>아이디</th>
                  <th>비밀번호</th>
                  <th>프로젝트</th>
                  <th>메모</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Badge>{ACC_CAT[a.category] ?? "기타"}</Badge>
                    </td>
                    <td className="strong">
                      {a.service}
                      {a.url && (
                        <div className="small">
                          <SafeLink url={a.url} />
                        </div>
                      )}
                    </td>
                    <td className="mono nowrap">
                      {a.username}{" "}
                      <button
                        className="icon-btn"
                        aria-label="아이디 복사"
                        onClick={() => copy(a.username, "아이디")}
                      >
                        ⧉
                      </button>
                    </td>
                    <td className="mono nowrap">
                      <span className={revealed.has(a.id) ? "" : "secret"}>
                        {revealed.has(a.id) ? a.password : "••••••••"}
                      </span>
                      <button
                        className="icon-btn"
                        aria-label="보기/숨기기"
                        onClick={() => {
                          touch();
                          setRevealed((r) => {
                            const n = new Set(r);
                            n.has(a.id) ? n.delete(a.id) : n.add(a.id);
                            return n;
                          });
                        }}
                      >
                        👁
                      </button>
                      <button
                        className="icon-btn"
                        aria-label="비밀번호 복사"
                        onClick={() => copy(a.password, "비밀번호")}
                      >
                        ⧉
                      </button>
                    </td>
                    <td>{name(a.projectId)}</td>
                    <td className="small">
                      {a.memo}
                      {a.changedAt && (
                        <div className="muted">변경 {fmtD(a.changedAt)}</div>
                      )}
                    </td>
                    <td className="nowrap">
                      <button
                        className="icon-btn"
                        aria-label="수정"
                        onClick={() => edit(a)}
                      >
                        ✎
                      </button>
                      <button
                        className="icon-btn"
                        aria-label="삭제"
                        onClick={() =>
                          confirm("이 계정을 삭제할까요?") &&
                          persist(items.filter((x) => x.id !== a.id))
                        }
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            저장된 계정이 없습니다. [+ 계정]으로 추가하세요.
          </div>
        )}
      </div>
      <p className="muted small">
        · 10분간 사용이 없으면 자동으로 잠깁니다. · 서버·백업 파일에는 암호문만
        저장됩니다. · 공용 PC에서는 사용 후 반드시 잠그고 로그아웃하세요.
      </p>
    </div>
  );
}
