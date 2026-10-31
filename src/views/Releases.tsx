import {
  TRACKS,
  REL_STATUS,
  REL_KIND,
  currentVersion,
  updateLabel,
  projectReleases,
  type ReleaseStatus,
} from "../../shared/model.ts";
import type { Ctx } from "../App";
import { Badge, fmtD } from "../ui";
import { releaseFields } from "./forms";
import { addRelease } from "./Projects";

export default function Releases({ ctx }: { ctx: Ctx }) {
  const { s } = ctx;
  const rel = [...s.releases].sort((a, b) =>
    (b.date || "").localeCompare(a.date || ""),
  );
  const name = (id: string) => s.projects.find((p) => p.id === id)?.name ?? "-";
  return (
    <>
      <div className="section-head">
        <h2>출시·업데이트 현황</h2>
        <button className="btn primary" onClick={() => addRelease(ctx)}>
          + 기록 추가
        </button>
      </div>
      <div className="notice info mb">
        토스 콘솔(앱인토스)·스토어의 심사 상태와 서버 배포 내역을 버전 단위로
        기록합니다. 배포 스크립트가 만든 JSON을 [백업·설정 → 가져오기]로 넣으면
        이력이 자동 병합됩니다.
      </div>
      <div className="card">
        <h3>프로젝트별 현재 버전</h3>
        {s.projects.length ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>프로젝트</th>
                  <th>구분</th>
                  <th>운영 버전</th>
                  <th>업데이트 차수</th>
                  <th>최근 제출</th>
                  <th>배포 서버</th>
                </tr>
              </thead>
              <tbody>
                {s.projects.map((p) => {
                  const lr = projectReleases(s.releases, p.id)[0];
                  const ver = currentVersion(s.releases, p.id);
                  return (
                    <tr key={p.id}>
                      <td className="strong">{p.name}</td>
                      <td className="nowrap">{TRACKS[p.type].label}</td>
                      <td className="nowrap">{ver ? `v${ver}` : "-"}</td>
                      <td className="nowrap">
                        <Badge>{updateLabel(s.releases, p.id)}</Badge>
                      </td>
                      <td className="nowrap">
                        {lr ? (
                          <>
                            v{lr.version}{" "}
                            <Badge tone={REL_STATUS[lr.status].tone}>
                              {REL_STATUS[lr.status].label}
                            </Badge>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="nowrap">{lr?.server || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">프로젝트를 먼저 등록하세요.</div>
        )}
      </div>
      <div className="card mt">
        <h3>전체 이력</h3>
        {rel.length ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>일자</th>
                  <th>프로젝트</th>
                  <th>버전</th>
                  <th>구분</th>
                  <th>상태</th>
                  <th>배포 서버</th>
                  <th>변경 내용</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rel.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap">{fmtD(r.date)}</td>
                    <td className="strong">{name(r.projectId)}</td>
                    <td className="nowrap mono">
                      v{r.version}
                      {r.buildNo && (
                        <span className="muted"> #{r.buildNo}</span>
                      )}
                    </td>
                    <td className="nowrap">{REL_KIND[r.kind]}</td>
                    <td className="nowrap">
                      <select
                        className="inline-select"
                        aria-label="상태 변경"
                        value={r.status}
                        onChange={(e) =>
                          ctx.save(
                            "releases",
                            { ...r, status: e.target.value as ReleaseStatus },
                            `상태: ${REL_STATUS[e.target.value as ReleaseStatus].label}`,
                          )
                        }
                      >
                        {Object.entries(REL_STATUS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="nowrap">{r.server || "-"}</td>
                    <td>{r.note}</td>
                    <td className="nowrap">
                      <button
                        className="icon-btn"
                        aria-label="수정"
                        onClick={() =>
                          ctx.openForm({
                            title: "출시/업데이트 기록",
                            fields: releaseFields(s),
                            data: r,
                            onSave: (out) =>
                              ctx.save(
                                "releases",
                                { ...r, ...out },
                                "저장했습니다.",
                              ),
                          })
                        }
                      >
                        ✎
                      </button>
                      <button
                        className="icon-btn"
                        aria-label="삭제"
                        onClick={() =>
                          ctx.remove("releases", r.id, "이 기록을 삭제할까요?")
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
          <div className="empty">기록이 없습니다.</div>
        )}
      </div>
    </>
  );
}
