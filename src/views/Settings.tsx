import { useEffect, useRef, useState } from "react";
import type { Ctx } from "../App";
import { api, errorText } from "../api";
import { toast } from "../ui";

const SAMPLE = `{ "releases": [
  { "projectName": "동네가게 예약", "version": "1.2.1",
    "kind": "update", "status": "requested",
    "date": "2026-11-02", "server": "NCP Prod #1",
    "buildNo": "24", "note": "버그 수정" } ] }`;

export default function Settings({ ctx }: { ctx: Ctx }) {
  const { s } = ctx;
  const file = useRef<HTMLInputElement>(null);
  const [audit, setAudit] = useState<
    { event: string; detail: any; created: string }[]
  >([]);
  useEffect(() => {
    api("audit")
      .then((r) => setAudit(r.items))
      .catch(() => {});
  }, [s]);

  const doImport = async (text: string) => {
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return toast("JSON 형식이 올바르지 않습니다.");
    }
    if (
      Array.isArray(data.projects) &&
      !confirm(
        "현재 데이터를 백업 파일 내용으로 교체할까요? (계정 보관함 포함)",
      )
    )
      return;
    try {
      const r = await api("import", "POST", data);
      ctx.setState(r.state);
      toast(
        r.mode === "merge"
          ? `이력 병합: 추가 ${r.added} · 갱신 ${r.updated}${r.skipped ? ` · 건너뜀 ${r.skipped}` : ""}`
          : "백업을 복원했습니다.",
      );
    } catch (e) {
      toast(errorText(e));
    }
  };
  const reset = async (mode: "empty" | "sample", text: string) => {
    if (!confirm(text)) return;
    try {
      ctx.setState(await api("reset", "POST", { mode }));
      toast(
        mode === "empty"
          ? "비웠습니다. 실제 데이터를 등록하세요."
          : "예시 데이터를 불러왔습니다.",
      );
    } catch (e) {
      toast(errorText(e));
    }
  };
  const updated = s.meta.updatedAt
    ? new Date(s.meta.updatedAt).toLocaleString("ko-KR")
    : "-";
  const EVENT: Record<string, string> = {
    upsert: "저장",
    delete: "삭제",
    "vault.save": "보관함 저장",
    "vault.delete": "보관함 삭제",
    replaceAll: "전체 교체",
    "import.releases": "이력 병합",
    "login.ok": "로그인",
    "login.fail": "로그인 실패",
    export: "백업 내보내기",
  };

  return (
    <>
      <h2>백업·설정</h2>
      <div className="grid g2">
        <div className="card">
          <h3>백업</h3>
          <p className="sub small">
            데이터는 서버 DB에 저장됩니다. 정기적으로 백업 파일을 내려받아
            드라이브 등에 보관하세요. (계정 보관함은 암호문으로 포함)
          </p>
          <div className="row">
            <a className="btn primary" href="/api/export">
              ⬇ 백업 내보내기 (JSON)
            </a>
            <button className="btn" onClick={() => file.current?.click()}>
              ⬆ 가져오기
            </button>
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await doImport(await f.text());
                e.target.value = "";
              }}
            />
          </div>
          <p className="muted small mb0">마지막 변경: {updated}</p>
        </div>
        <div className="card">
          <h3>자동화 연동 (출시 이력 병합)</h3>
          <p className="sub small">
            배포 스크립트나 CI가 아래 형식의 JSON을 만들면 [가져오기]로 출시
            이력만 병합됩니다. 같은 프로젝트·버전이면 상태가 갱신됩니다.
          </p>
          <pre className="mono code">{SAMPLE}</pre>
        </div>
        <div className="card">
          <h3>데이터 초기화</h3>
          <div className="row">
            <button
              className="btn"
              onClick={() =>
                reset(
                  "empty",
                  "프로젝트·출시이력·도메인·서버 데이터를 모두 비울까요? (계정 보관함은 유지)",
                )
              }
            >
              예시 데이터 비우고 시작
            </button>
            <button
              className="btn"
              onClick={() =>
                reset(
                  "sample",
                  "현재 데이터를 예시 데이터로 덮어쓸까요? (계정 보관함은 유지)",
                )
              }
            >
              예시 데이터 다시 불러오기
            </button>
          </div>
          <div className="row mt">
            <button
              className="btn danger"
              disabled={!s.vault}
              onClick={async () => {
                if (
                  !confirm(
                    "계정 보관함을 완전히 삭제합니다. 되돌릴 수 없습니다. 계속할까요?",
                  )
                )
                  return;
                try {
                  await api("vault", "PUT", { vault: null });
                  ctx.setState({ ...s, vault: null });
                  toast("보관함을 삭제했습니다.");
                } catch (e) {
                  toast(errorText(e));
                }
              }}
            >
              계정 보관함 삭제
            </button>
          </div>
        </div>
        <div className="card">
          <h3>최근 활동 기록</h3>
          {audit.length ? (
            <ul className="list compact">
              {audit.slice(0, 8).map((a, i) => (
                <li key={i}>
                  <span>{EVENT[a.event] ?? a.event}</span>
                  <span className="muted small">{a.detail?.kind ?? ""}</span>
                  <span className="when muted">
                    {new Date(a.created).toLocaleString("ko-KR")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">기록이 없습니다.</div>
          )}
        </div>
      </div>
    </>
  );
}
