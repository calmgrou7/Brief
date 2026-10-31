import { won } from "../../shared/model.ts";
import type { Ctx } from "../App";
import { Badge, DDay, fmtD, newId } from "../ui";
import { domainFields, serverFields } from "./forms";

export default function Infra({ ctx }: { ctx: Ctx }) {
  const { s } = ctx;
  const name = (id: string) => s.projects.find((p) => p.id === id)?.name ?? "-";
  const doms = [...s.domains].sort((a, b) =>
    (a.expiresAt || "9").localeCompare(b.expiresAt || "9"),
  );
  const svs = [...s.servers].sort((a, b) =>
    (a.renewAt || "9").localeCompare(b.renewAt || "9"),
  );
  const total = s.servers.reduce((a, v) => a + (v.cost || 0), 0);
  const editDomain = (d: Record<string, any>) =>
    ctx.openForm({
      title: "도메인",
      fields: domainFields(s),
      data: d,
      onSave: (out) =>
        ctx.save(
          "domains",
          { ...out, id: out.id || newId() },
          "도메인을 저장했습니다.",
        ),
    });
  const editServer = (v: Record<string, any>) =>
    ctx.openForm({
      title: "서버·호스팅",
      fields: serverFields(s),
      data: v,
      onSave: (out) =>
        ctx.save(
          "servers",
          { ...out, id: out.id || newId() },
          "서버를 저장했습니다.",
        ),
    });

  return (
    <>
      <div className="section-head">
        <h2>도메인</h2>
        <button
          className="btn primary"
          onClick={() => editDomain({ autoRenew: false })}
        >
          + 도메인
        </button>
      </div>
      <div className="card">
        {doms.length ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>도메인</th>
                  <th>등록기관</th>
                  <th>만료일</th>
                  <th>남은기간</th>
                  <th>자동갱신</th>
                  <th>SSL</th>
                  <th>프로젝트</th>
                  <th>DNS</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {doms.map((d) => (
                  <tr key={d.id}>
                    <td className="strong mono">{d.name}</td>
                    <td className="nowrap">{d.registrar || "-"}</td>
                    <td className="nowrap">{fmtD(d.expiresAt)}</td>
                    <td className="nowrap">
                      <DDay date={d.expiresAt} />
                    </td>
                    <td className="nowrap">
                      {d.autoRenew ? (
                        <Badge tone="ok">ON</Badge>
                      ) : (
                        <Badge>OFF</Badge>
                      )}
                    </td>
                    <td className="nowrap">
                      {d.sslExpiresAt ? (
                        <DDay date={d.sslExpiresAt} warn={30} bad={14} />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{name(d.projectId)}</td>
                    <td className="nowrap">{d.dns || "-"}</td>
                    <td className="nowrap">
                      <button
                        className="icon-btn"
                        aria-label="수정"
                        onClick={() => editDomain(d)}
                      >
                        ✎
                      </button>
                      <button
                        className="icon-btn"
                        aria-label="삭제"
                        onClick={() =>
                          ctx.remove("domains", d.id, "이 도메인을 삭제할까요?")
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
          <div className="empty">등록된 도메인이 없습니다.</div>
        )}
        <p className="muted small mb0">
          60일 이내 노랑 · 30일 이내 빨강. 개요의 [다음 절차]에 자동 표시됩니다.
        </p>
      </div>

      <div className="section-head mt">
        <h2>서버·호스팅</h2>
        <span className="muted">월 합계 {won(total)}</span>
        <button className="btn primary" onClick={() => editServer({})}>
          + 서버
        </button>
      </div>
      <div className="card">
        {svs.length ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>제공사</th>
                  <th>호스트/IP</th>
                  <th>용도/플랜</th>
                  <th>월 비용</th>
                  <th>결제·갱신일</th>
                  <th>프로젝트</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {svs.map((v) => (
                  <tr key={v.id}>
                    <td className="strong">{v.name}</td>
                    <td className="nowrap">{v.provider || "-"}</td>
                    <td className="mono">
                      {v.host || "-"}
                      {v.ip && <div className="muted">{v.ip}</div>}
                    </td>
                    <td>
                      {v.purpose || "-"}
                      <div className="muted small">{v.plan}</div>
                    </td>
                    <td className="nowrap">{won(v.cost)}</td>
                    <td className="nowrap">
                      {fmtD(v.renewAt)}{" "}
                      {v.renewAt && <DDay date={v.renewAt} warn={14} bad={7} />}
                    </td>
                    <td>{name(v.projectId)}</td>
                    <td className="nowrap">
                      {/^https?:\/\//.test(v.consoleUrl) && (
                        <a
                          href={v.consoleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          콘솔
                        </a>
                      )}
                      <button
                        className="icon-btn"
                        aria-label="수정"
                        onClick={() => editServer(v)}
                      >
                        ✎
                      </button>
                      <button
                        className="icon-btn"
                        aria-label="삭제"
                        onClick={() =>
                          ctx.remove("servers", v.id, "이 서버를 삭제할까요?")
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
          <div className="empty">등록된 서버가 없습니다.</div>
        )}
      </div>
    </>
  );
}
