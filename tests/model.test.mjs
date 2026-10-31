import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  progress,
  projectStatus,
  updateLabel,
  currentVersion,
  nextActions,
  daysUntil,
  dday,
  sanitize,
  validVault,
  planReleaseMerge,
  sampleState,
  stagesFor,
} from "../shared/model.ts";

const base = () => sampleState(randomUUID);

test("진행률은 완료 단계 비율", () => {
  assert.equal(progress({ stages: stagesFor("toss", 3) }), 50);
  assert.equal(progress({ stages: stagesFor("web", 6) }), 100);
  assert.equal(progress({ stages: [] }), 0);
});

test("프로젝트 상태 판정: 검수중 > 반려 > 출시 > 기획 > 진행, 보류 우선", () => {
  const s = base();
  const [p1, p2, , p4] = s.projects;
  assert.equal(projectStatus(p1, s.releases), "review");
  assert.equal(projectStatus(p2, s.releases), "progress");
  assert.equal(
    projectStatus({ ...p4, stages: stagesFor("toss", 0) }, s.releases),
    "planning",
  );
  assert.equal(projectStatus({ ...p1, hold: true }, s.releases), "hold");
  const released = s.releases.map((r) =>
    r.version === "1.2.0" ? { ...r, status: "released" } : r,
  );
  assert.equal(projectStatus(p1, released), "live");
  const rejected = s.releases.map((r) =>
    r.version === "1.2.0" ? { ...r, status: "rejected" } : r,
  );
  assert.equal(projectStatus(p1, rejected), "rejected");
});

test("업데이트 차수와 운영 버전", () => {
  const s = base();
  const p1 = s.projects[0].id;
  assert.equal(updateLabel(s.releases, p1), "1차 업데이트");
  assert.equal(currentVersion(s.releases, p1), "1.1.0");
  assert.equal(updateLabel(s.releases, s.projects[1].id), "미출시");
});

test("D-day 계산", () => {
  assert.equal(daysUntil("2026-11-20", "2026-10-31"), 20);
  assert.equal(daysUntil("2026-10-30", "2026-10-31"), -1);
  assert.equal(daysUntil("", "2026-10-31"), null);
  assert.equal(dday(0), "D-DAY");
  assert.equal(dday(-3), "D+3");
});

test("다음 절차: 검수·도메인 60일·서버 30일 포함, 날짜순", () => {
  const items = nextActions(base(), "2026-10-31");
  const titles = items.map((i) => i.title);
  assert.ok(titles.includes("v1.2.0 검수 결과 확인"));
  assert.ok(titles.includes("도메인 갱신: example-shop.kr"));
  assert.ok(!titles.includes("도메인 갱신: example.com"));
  assert.ok(titles.includes("서버 결제/갱신: Vercel"));
  const dates = items.map((i) => i.date || "9999");
  assert.deepEqual(dates, [...dates].sort());
});

test("sanitize: 모르는 필드 제거, 단계 템플릿 강제, 타입 보정", () => {
  const p = sanitize(
    "projects",
    {
      name: "x",
      type: "web",
      stages: [{ done: true }, { done: true }],
      evil: "<script>",
      hold: "yes",
    },
    "id1",
  );
  assert.equal(p.evil, undefined);
  assert.equal(p.stages.length, 6);
  assert.equal(p.stages[3].label, "서버·도메인 연결");
  assert.equal(p.hold, true);
  const r = sanitize(
    "releases",
    { status: "hacked", date: "not-a-date" },
    "id2",
  );
  assert.equal(r.status, "prep");
  assert.equal(r.date, "");
  assert.equal(sanitize("servers", { cost: "-5" }, "id3").cost, 0);
});

test("보관함은 암호문 형식만 허용", () => {
  const ok = {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iter: 310000,
    salt: "AAAA",
    iv: "BBBB",
    ct: "CCCC",
  };
  assert.ok(validVault(ok));
  assert.ok(!validVault({ ...ok, password: "plain" }));
  assert.ok(!validVault({ ...ok, iter: 10 }));
  assert.ok(!validVault([{ username: "a", password: "b" }]));
});

test("출시 이력 병합: 이름 매칭(예시 접미사 무시), 같은 버전 갱신, 미매칭 건너뜀", () => {
  const s = base();
  const plan = planReleaseMerge(
    s.projects,
    s.releases,
    [
      { projectName: "동네가게 예약", version: "1.2.0", status: "approved" },
      { projectName: "동네가게 예약", version: "1.2.1", status: "requested" },
      { projectName: "없는 프로젝트", version: "1.0.0" },
    ],
    randomUUID,
    "2026-11-01",
  );
  assert.equal(plan.added, 1);
  assert.equal(plan.updated, 1);
  assert.equal(plan.skipped, 1);
  assert.equal(
    plan.upserts.find((r) => r.version === "1.2.1").date,
    "2026-11-01",
  );
});
