import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../server/store.mjs";
import { createApp } from "../server/index.mjs";

const PASSWORD = "test-password-123";
async function withServer(fn) {
  const store = new Store();
  const server = createApp(store, { password: PASSWORD, secureCookie: false });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = "";
  const call = async (method, path, body, headers = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(body !== undefined || method !== "GET"
          ? { "Content-Type": "application/json", "X-BN-Request": "1" }
          : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return { status: res.status, headers: res.headers, data: await res.json() };
  };
  try {
    await fn({
      call,
      store,
      login: () => call("POST", "/api/login", { password: PASSWORD }),
    });
  } finally {
    server.close();
    store.close();
  }
}

test("로그인 전에는 데이터 접근 불가", () =>
  withServer(async ({ call }) => {
    assert.equal((await call("GET", "/api/health")).status, 200);
    assert.equal((await call("GET", "/api/state")).status, 401);
    assert.equal((await call("GET", "/api/export")).status, 401);
    assert.equal(
      (await call("PUT", "/api/vault", { vault: null })).status,
      401,
    );
  }));

test("잘못된 비밀번호 거부, 5회 실패 후 잠금", () =>
  withServer(async ({ call }) => {
    for (let i = 0; i < 5; i++)
      assert.equal(
        (await call("POST", "/api/login", { password: "wrong-password-x" }))
          .status,
        401,
      );
    assert.equal(
      (await call("POST", "/api/login", { password: PASSWORD })).status,
      429,
    );
  }));

test("로그인 쿠키는 HttpOnly·SameSite=Strict, 로그아웃 시 무효화", () =>
  withServer(async ({ call, login }) => {
    const r = await login();
    assert.equal(r.status, 200);
    assert.match(r.headers.get("set-cookie"), /HttpOnly/);
    assert.match(r.headers.get("set-cookie"), /SameSite=Strict/);
    assert.equal((await call("GET", "/api/state")).status, 200);
    await call("POST", "/api/logout");
    assert.equal((await call("GET", "/api/state")).status, 401);
  }));

test("변경 요청은 X-BN-Request 헤더 필수 (CSRF)", () =>
  withServer(async ({ call, login }) => {
    await login();
    const r = await call(
      "PUT",
      "/api/records/projects/abc",
      { name: "x" },
      { "X-BN-Request": "" },
    );
    assert.equal(r.status, 400);
  }));

test("레코드 저장·삭제, 프로젝트 삭제 시 출시 이력 정리", () =>
  withServer(async ({ call, login }) => {
    await login();
    const p = await call("PUT", "/api/records/projects/p-1", {
      name: "새 프로젝트",
      type: "mini",
      stages: [{ done: true }],
    });
    assert.equal(p.data.stages.length, 6);
    assert.equal(
      (
        await call("PUT", "/api/records/releases/r-1", {
          projectId: "p-1",
          version: "1.0.0",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await call("PUT", "/api/records/releases/r-2", {
          projectId: "nope",
          version: "1.0.0",
        })
      ).status,
      400,
    );
    assert.equal((await call("PUT", "/api/records/hackers/x", {})).status, 404);
    await call("DELETE", "/api/records/projects/p-1");
    const s = (await call("GET", "/api/state")).data;
    assert.ok(!s.releases.some((r) => r.projectId === "p-1"));
    assert.equal(s.meta.sample, false);
  }));

test("보관함: 평문 저장 거부, 암호문만 저장", () =>
  withServer(async ({ call, login, store }) => {
    await login();
    assert.equal(
      (
        await call("PUT", "/api/vault", {
          vault: [{ username: "u", password: "p" }],
        })
      ).status,
      400,
    );
    const blob = {
      v: 1,
      kdf: "PBKDF2-SHA256",
      iter: 310000,
      salt: "c2FsdA==",
      iv: "aXY=",
      ct: "Y3Q=",
    };
    assert.equal(
      (await call("PUT", "/api/vault", { vault: blob })).status,
      200,
    );
    assert.deepEqual(store.state().vault, blob);
    assert.ok(!JSON.stringify(store.auditLog()).includes("Y3Q="));
  }));

test("가져오기: 출시 이력 병합과 전체 복원", () =>
  withServer(async ({ call, login }) => {
    await login();
    const m = await call("POST", "/api/import", {
      releases: [
        { projectName: "동네가게 예약", version: "1.2.1", status: "requested" },
      ],
    });
    assert.equal(m.data.mode, "merge");
    assert.equal(m.data.added, 1);
    const exported = (await call("GET", "/api/export")).data;
    await call("POST", "/api/reset", { mode: "empty" });
    assert.equal((await call("GET", "/api/state")).data.projects.length, 0);
    const r = await call("POST", "/api/import", exported);
    assert.equal(r.data.mode, "restore");
    assert.equal(r.data.state.releases.length, exported.releases.length);
  }));

test("정적 파일 경로 탈출 차단", () =>
  withServer(async ({ call }) => {
    const r = await call("GET", "/..%2f..%2fpackage.json");
    assert.notEqual(r.data?.name, "bridgenode-dashboard");
  }));
