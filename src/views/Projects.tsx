import { useState } from "react";
import {
  TRACKS,
  PROJECT_STATUS,
  REL_STATUS,
  progress,
  projectStatus,
  currentStage,
  currentVersion,
  updateLabel,
  projectReleases,
  releasedCount,
  stagesFor,
  todayStr,
  type Project,
  type TrackKey,
} from "../../shared/model.ts";
import type { Ctx } from "../App";
import { Badge, DDay, Dot, SafeLink, fmtD, newId } from "../ui";
import { projectFields, releaseFields } from "./forms";

export function editProject(ctx: Ctx, p?: Partial<Project>) {
  ctx.openForm({
    title: "프로젝트",
    fields: projectFields(),
    data: p ?? { type: "toss", startDate: todayStr() },
    onSave: async (out) => {
      const prev = ctx.s.projects.find((x) => x.id === out.id);
      // 구분이 바뀌면 단계 템플릿을 새로 만들되 완료 개수는 유지
      const stages =
        prev && prev.type === out.type
          ? prev.stages
          : stagesFor(
              out.type as TrackKey,
              prev ? prev.stages.filter((x) => x.done).length : 0,
            );
      await ctx.save(
        "projects",
        { ...out, id: out.id || newId(), stages },
        "프로젝트를 저장했습니다.",
      );
    },
  });
}
export function addRelease(ctx: Ctx, projectId?: string) {
  if (!ctx.s.projects.length) return alert("프로젝트를 먼저 등록하세요.");
  const pid = projectId || ctx.s.projects[0].id;
  ctx.openForm({
    title: "출시/업데이트 기록",
    fields: releaseFields(ctx.s),
    data: {
      projectId: pid,
      kind: releasedCount(ctx.s.releases, pid) ? "update" : "first",
      status: "prep",
      date: todayStr(),
    },
    onSave: (out) =>
      ctx.save(
        "releases",
        { ...out, id: out.id || newId() },
        "기록을 저장했습니다.",
      ),
  });
}

export default function Projects({ ctx }: { ctx: Ctx }) {
  const { s } = ctx;
  const [filter, setFilter] = useState<"all" | TrackKey>("all");
  const list = s.projects.filter((p) => filter === "all" || p.type === filter);
  const toggle = (p: Project, i: number) =>
    ctx.save("projects", {
      ...p,
      stages: p.stages.map((x, j) => (j === i ? { ...x, done: !x.done } : x)),
    });

  return (
    <>
      <div className="section-head">
        <h2>프로젝트</h2>
        <div className="filters">
          {(
            [
              ["all", "전체"],
              ...Object.entries(TRACKS).map(([k, t]) => [k, t.label]),
            ] as [string, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              className="chip"
              aria-pressed={filter === k}
              onClick={() => setFilter(k as any)}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          className="btn primary"
          onClick={() =>
            editProject(ctx, {
              type: filter === "all" ? "toss" : filter,
              startDate: todayStr(),
            })
          }
        >
          + 프로젝트
        </button>
      </div>
      <p className="muted small mb">
        단계 버튼을 눌러 완료 처리하면 진행률·상태가 자동으로 계산됩니다.
      </p>
      {list.length ? (
        <div className="grid g2">
          {list.map((p) => {
            const t = TRACKS[p.type];
            const st = PROJECT_STATUS[projectStatus(p, s.releases)];
            const pct = progress(p);
            const lr = projectReleases(s.releases, p.id)[0];
            const ver = currentVersion(s.releases, p.id);
            return (
              <div className="card proj-card" key={p.id}>
                <div className="top">
                  <Dot color={t.color} />
                  <div className="grow">
                    <div className="ttl">{p.name}</div>
                    <div className="muted small">
                      {t.label} · {p.client || "고객 미지정"}
                    </div>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  <button
                    className="icon-btn"
                    title="수정"
                    aria-label="수정"
                    onClick={() => editProject(ctx, p)}
                  >
                    ✎
                  </button>
                  <button
                    className="icon-btn"
                    title="삭제"
                    aria-label="삭제"
                    onClick={() =>
                      ctx.remove(
                        "projects",
                        p.id,
                        `'${p.name}' 프로젝트와 출시 이력을 삭제할까요?`,
                      )
                    }
                  >
                    🗑
                  </button>
                </div>
                <div className="row between mt-s">
                  <span className="muted small">
                    진행률 · 현재 단계: <b className="sub">{currentStage(p)}</b>
                  </span>
                  <b>{pct}%</b>
                </div>
                <div className="bar mt-s">
                  <i style={{ width: `${pct}%`, background: t.color }} />
                </div>
                <div className="stages">
                  {p.stages.map((x, i) => (
                    <button
                      key={i}
                      className={`stage ${x.done ? "on" : ""}`}
                      onClick={() => toggle(p, i)}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
                {p.nextStep && (
                  <div className="next">
                    <b>다음 절차</b> · {p.nextStep}
                  </div>
                )}
                <dl className="kv">
                  <dt>기간</dt>
                  <dd>
                    {fmtD(p.startDate)} ~ {fmtD(p.dueDate)}{" "}
                    {p.dueDate && <DDay date={p.dueDate} warn={14} bad={7} />}
                  </dd>
                  <dt>버전</dt>
                  <dd>
                    {ver ? `v${ver}` : "-"} · {updateLabel(s.releases, p.id)}
                    {lr && lr.status !== "released" && (
                      <>
                        {" "}
                        · 최근 v{lr.version}{" "}
                        <Badge tone={REL_STATUS[lr.status].tone}>
                          {REL_STATUS[lr.status].label}
                        </Badge>
                      </>
                    )}
                  </dd>
                  <dt>서비스</dt>
                  <dd>
                    <SafeLink url={p.serviceUrl} />
                  </dd>
                  {p.repoUrl && (
                    <>
                      <dt>저장소</dt>
                      <dd>
                        <SafeLink url={p.repoUrl} />
                      </dd>
                    </>
                  )}
                  {p.memo && (
                    <>
                      <dt>메모</dt>
                      <dd className="pre">{p.memo}</dd>
                    </>
                  )}
                </dl>
                <div className="row mt-s">
                  <button
                    className="btn sm"
                    onClick={() => addRelease(ctx, p.id)}
                  >
                    + 출시/업데이트 기록
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card empty">해당 구분의 프로젝트가 없습니다.</div>
      )}
    </>
  );
}
