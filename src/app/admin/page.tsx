"use client";
import { useCallback, useEffect, useState } from "react";

type Lead = Record<string, unknown> & { id: string };
type Data = { leads: Lead[]; funnel: { name: string; count: number }[]; byChannel: Record<string, number>; privacyPending: Record<string, unknown>[]; storage: string };
type Q = { total: number; byTopic: Record<string, number>; recent: { content: string; topic: string; channel: string }[] };

const STATUS = { new: "신규", contacted: "연락함", consulting: "상담중", contracted: "계약", lost: "종료" } as const;
const FUNNEL = { page_view: "방문", check_start: "점검 시작", check_complete: "점검 완료", lead_form_view: "폼 노출", lead_submit: "신청" } as Record<string, string>;
const CH = { web: "웹", toss: "미니앱", android: "앱", kakao: "카카오" } as Record<string, string>;

export default function Admin() {
  const [data, setData] = useState<Data | null>(null);
  const [qs, setQs] = useState<Q | null>(null);
  const [pw, setPw] = useState("");
  const [needLogin, setNeedLogin] = useState(false);
  const [grade, setGrade] = useState("");
  const [tab, setTab] = useState<"leads" | "questions">("leads");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/leads");
    if (r.status === 401) return setNeedLogin(true);
    setData(await r.json()); setNeedLogin(false);
    const q = await fetch("/api/admin/questions"); if (q.ok) setQs(await q.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (r.ok) load(); else alert("비밀번호가 틀렸어요 (ADMIN_PASSWORD 환경변수 확인)");
  };
  const patch = async (id: string, body: Record<string, unknown>) => {
    await fetch(`/api/admin/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load();
  };

  if (needLogin) return (
    <form onSubmit={login} style={{ marginTop: 40 }}>
      <h1>관리자 로그인</h1>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="관리자 비밀번호" />
      <button className="btn btn-primary" style={{ marginTop: 12 }}>로그인</button>
    </form>
  );
  if (!data) return <p className="muted">불러오는 중...</p>;

  const leads = data.leads.filter((l) => !grade || l.grade === grade);
  const counts = { HOT: 0, WARM: 0, COLD: 0 } as Record<string, number>;
  data.leads.forEach((l) => { counts[String(l.grade)] = (counts[String(l.grade)] || 0) + 1; });

  return (
    <main style={{ maxWidth: "100%" }}>
      <h1>리드 대시보드</h1>
      <p className="small">저장소: {data.storage === "supabase" ? "Supabase" : "로컬 파일 (개발용 — 운영 전 Supabase 연결 필요)"}</p>

      <div className="stat" style={{ margin: "12px 0" }}>
        <div><b>{data.leads.length}</b><span className="small">전체 리드</span></div>
        <div><b style={{ color: "var(--warn)" }}>{counts.HOT}</b><span className="small">HOT</span></div>
        <div><b>{data.leads.filter((l) => l.status === "new").length}</b><span className="small">미연락</span></div>
      </div>

      <div className="card">
        <h3>전환 퍼널 (고유 방문자)</h3>
        {data.funnel.map((f, i) => (
          <p key={f.name} className="muted">{FUNNEL[f.name]}: <b>{f.count}</b>{i > 0 && data.funnel[i - 1].count ? ` (${Math.round((f.count / data.funnel[i - 1].count) * 100)}%)` : ""}</p>
        ))}
        <p className="small">채널별 리드: {Object.entries(data.byChannel).map(([k, v]) => `${CH[k] || k} ${v}`).join(" · ") || "-"}</p>
      </div>

      {data.privacyPending.length > 0 && (
        <div className="card" style={{ borderColor: "var(--warn)" }}>
          <h3>⚠ 처리 대기 중인 개인정보 요청 {data.privacyPending.length}건</h3>
          <p className="small">법정 처리기한(10일) 안에 DB에서 처리하세요.</p>
          {data.privacyPending.map((p, i) => <p key={i} className="small">{String(p.phone)} · {String(p.type)} · {String(p.created_at).slice(0, 10)}</p>)}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
        <button className={`chip ${tab === "leads" ? "on" : ""}`} onClick={() => setTab("leads")}>리드</button>
        <button className="chip" onClick={() => setTab("questions")}>AI 질문 모음 ({qs?.total ?? 0})</button>
        {tab === "leads" && ["", "HOT", "WARM", "COLD"].map((g) => (
          <button key={g} className="chip" style={grade === g ? { borderColor: "var(--primary)" } : {}} onClick={() => setGrade(g)}>{g || "전체"}</button>
        ))}
        <a href="/api/admin/export" className="chip">CSV 다운로드</a>
      </div>

      {tab === "leads" ? (
        <div className="card" style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>등급</th><th>이름/연락처</th><th>관심</th><th>채널</th><th>상태</th><th>메모</th><th>접수</th></tr></thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td><b style={{ color: l.grade === "HOT" ? "var(--warn)" : undefined }}>{String(l.grade)}</b><br /><span className="small">{String(l.score)}점</span></td>
                  <td>{String(l.name)}<br /><a href={`tel:${l.phone}`}>{String(l.phone)}</a>{l.phone_verified ? " ✓" : ""}</td>
                  <td>{String(l.interest)}{l.memo_customer ? <><br /><span className="small">{String(l.memo_customer)}</span></> : null}</td>
                  <td>{((l.channels as string[]) || []).map((c) => CH[c] || c).join(", ")}</td>
                  <td>
                    <select value={String(l.status)} onChange={(e) => patch(l.id, { status: e.target.value })} style={{ padding: 6, marginTop: 0 }}>
                      {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td><textarea defaultValue={String(l.memo || "")} rows={2} style={{ padding: 6, marginTop: 0, minWidth: 140 }} onBlur={(e) => e.target.value !== String(l.memo || "") && patch(l.id, { memo: e.target.value })} /></td>
                  <td className="small">{String(l.created_at).slice(5, 16).replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!leads.length && <p className="muted">아직 리드가 없어요.</p>}
        </div>
      ) : (
        <div className="card">
          <p className="small">주제별: {Object.entries(qs?.byTopic || {}).map(([k, v]) => `${k} ${v}`).join(" · ")}</p>
          <p className="small">→ 자주 나오는 질문을 청구 가이드·블로그 글·커뮤니티 초기 콘텐츠로 만드세요.</p>
          {qs?.recent.map((q, i) => <p key={i} style={{ borderBottom: "1px solid var(--line)", padding: "8px 0" }}><span className="badge b-check">{q.topic}</span>{q.content}</p>)}
        </div>
      )}
    </main>
  );
}
