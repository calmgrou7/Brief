import {
  TRACKS,
  PROJECT_STATUS,
  average,
  progress,
  projectStatus,
  currentStage,
  currentVersion,
  updateLabel,
  nextActions,
  daysUntil,
  won,
  type TrackKey,
  type ProjectStatusKey,
} from "../../shared/model.ts";
import type { Ctx } from "../App";
import { Badge, DDay, Dot, fmtD } from "../ui";

export default function Overview({ ctx }: { ctx: Ctx }) {
  const { s } = ctx;
  const active = s.projects.filter((p) => !p.hold);
  const overall = average(active.map(progress));
  const statusOf = (p: (typeof s.projects)[number]) =>
    projectStatus(p, s.releases);
  const inReview = s.projects.filter((p) => statusOf(p) === "review").length;
  const live = s.projects.filter((p) => statusOf(p) === "live").length;
  const domSoon = s.domains.filter((d) => {
    const n = daysUntil(d.expiresAt);
    return n != null && n <= 60;
  }).length;
  const monthly = s.servers.reduce((a, v) => a + (v.cost || 0), 0);
  const actions = nextActions(s);

  return (
    <>
      {s.meta.sample && (
        <div className="notice info mb">
          지금 보이는 데이터는 <b>예시</b>입니다. [백업·설정] 탭에서 비우고 실제
          프로젝트를 등록하세요.
        </div>
      )}
      <div className="grid g4">
        <div className="card center-row">
          <div className="ring" style={{ ["--p" as any]: overall }}>
            <div>
              <div>
                <b>{overall}%</b>
                <small>전체 진행률</small>
              </div>
            </div>
          </div>
        </div>
        <Kpi
          label="진행 프로젝트"
          value={
            <>
              {active.length}
              <small className="muted"> / {s.projects.length}</small>
            </>
          }
          sub={`출시·운영중 ${live}건`}
        />
        <Kpi
          label="검수(심사) 중"
          value={inReview}
          color="var(--warn)"
          sub="토스 콘솔·플랫폼 심사 대기"
        />
        <Kpi
          label="갱신 임박 도메인 (60일)"
          value={domSoon}
          color={domSoon ? "var(--bad)" : "var(--ok)"}
          sub={`서버 월 고정비 ${won(monthly)}`}
        />
      </div>

      <div className="grid g3 mt">
        {(Object.keys(TRACKS) as TrackKey[]).map((k) => {
          const t = TRACKS[k];
          const list = s.projects.filter((p) => p.type === k);
          const pct = average(list.filter((p) => !p.hold).map(progress));
          const cnt = (key: ProjectStatusKey) =>
            list.filter((p) => statusOf(p) === key).length;
          return (
            <div className="card" key={k}>
              <div className="track-head">
                <Dot color={t.color} />
                {t.label}
                <span className="muted push">{list.length}건</span>
              </div>
              <div className="big mt-s">{pct}%</div>
              <div className="bar">
                <i style={{ width: `${pct}%`, background: t.color }} />
              </div>
              <div className="stat-row">
                {(
                  [
                    "planning",
                    "progress",
                    "review",
                    "live",
                    "rejected",
                    "hold",
                  ] as ProjectStatusKey[]
                )
                  .filter(
                    (key) =>
                      cnt(key) > 0 ||
                      ["planning", "progress", "review", "live"].includes(key),
                  )
                  .map((key) => (
                    <Badge key={key} tone={PROJECT_STATUS[key].tone}>
                      {PROJECT_STATUS[key].label.replace("·운영중", "")}{" "}
                      {cnt(key)}
                    </Badge>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card mt">
        <div className="section-head">
          <h3>다음 절차</h3>
          <span className="muted small">
            프로젝트·검수·도메인·서버 일정 자동 집계
          </span>
        </div>
        {actions.length ? (
          <ul className="list">
            {actions.slice(0, 12).map((a, i) => (
              <li key={i}>
                <span className="ico">{a.icon}</span>
                <div className="grow">
                  <div className="strong">{a.title}</div>
                  <div className="muted small">{a.sub}</div>
                </div>
                <div className="when">
                  <Badge tone={a.tone}>{a.tag}</Badge>
                  <div className="muted mt-s">{fmtD(a.date)}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">예정된 절차가 없습니다.</div>
        )}
      </div>

      <div className="card mt">
        <div className="section-head">
          <h3>전체 프로젝트 파이프라인</h3>
          <button className="btn sm" onClick={() => ctx.goto("projects")}>
            관리 →
          </button>
        </div>
        {s.projects.length ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>프로젝트</th>
                  <th>구분</th>
                  <th>단계</th>
                  <th>진행률</th>
                  <th>상태</th>
                  <th>버전</th>
                  <th>마감</th>
                </tr>
              </thead>
              <tbody>
                {s.projects.map((p) => {
                  const t = TRACKS[p.type];
                  const st = PROJECT_STATUS[statusOf(p)];
                  const ver = currentVersion(s.releases, p.id);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="strong">{p.name}</div>
                        <div className="muted small">{p.client}</div>
                      </td>
                      <td className="nowrap">
                        <Dot color={t.color} /> {t.label}
                      </td>
                      <td>
                        <div className="pipe" title={currentStage(p)}>
                          {p.stages.map((x, i) => (
                            <span
                              key={i}
                              style={
                                x.done ? { background: t.color } : undefined
                              }
                            />
                          ))}
                        </div>
                        <div className="muted small mt-xs">
                          {currentStage(p)}
                        </div>
                      </td>
                      <td className="nowrap strong">{progress(p)}%</td>
                      <td>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                      <td className="nowrap">
                        {ver ? `v${ver}` : "-"}
                        <div className="muted small">
                          {updateLabel(s.releases, p.id)}
                        </div>
                      </td>
                      <td className="nowrap">
                        <DDay date={p.dueDate} warn={14} bad={7} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">등록된 프로젝트가 없습니다.</div>
        )}
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  color?: string;
}) {
  return (
    <div className="card">
      <div className="muted">{label}</div>
      <div className="big" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="muted small">{sub}</div>
    </div>
  );
}
