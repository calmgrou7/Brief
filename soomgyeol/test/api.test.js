"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.ADMIN_EMAIL = "admin@test.local";
const { createApp } = require("../server/index");
const billing = require("../server/billing");

let server, db, base;

test.before(async () => {
  ({ server, db } = createApp({ dbPath: ":memory:" }));
  await new Promise(r => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

/* 쿠키를 들고 다니는 간단한 클라이언트 */
function client() {
  let cookie = "";
  async function call(method, path, body, headers = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", "X-Requested-With": "fetch", ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const sc = res.headers.get("set-cookie");
    if (sc) cookie = sc.split(";")[0];
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, json };
  }
  return {
    get: p => call("GET", p), post: (p, b = {}, h) => call("POST", p, b, h), patch: (p, b) => call("PATCH", p, b), del: (p, b = {}) => call("DELETE", p, b),
  };
}
async function signup(email) {
  const c = client();
  const r = await c.post("/api/auth/signup", { email, password: "password123", agree: true });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  c.id = r.json.user.id;
  return c;
}

test("소개 웹사이트와 SEO 파일이 열린다", async () => {
  for (const p of ["/", "/features", "/pricing", "/support", "/terms", "/privacy", "/refund"]) {
    const r = await fetch(base + p);
    assert.equal(r.status, 200, p);
    const html = await r.text();
    assert.match(html, /<title>[^<]*숨결/);
    assert.match(html, /og:image/);
  }
  assert.match(await (await fetch(base + "/sitemap.xml")).text(), /<loc>.*\/pricing<\/loc>/);
  assert.match(await (await fetch(base + "/robots.txt")).text(), /Disallow: \/admin/);
  assert.equal((await fetch(base + "/app")).status, 200);
  assert.equal((await fetch(base + "/account-deletion")).status, 200);
  const links = await (await fetch(base + "/.well-known/assetlinks.json")).json();
  assert.ok(Array.isArray(links));
});

test("가입·로그인·로그아웃·비밀번호 재설정", async () => {
  const c = await signup("a@test.local");
  assert.equal((await c.get("/api/me")).json.entitlement.plan, "free");
  const dup = await client().post("/api/auth/signup", { email: "a@test.local", password: "password123", agree: true });
  assert.equal(dup.status, 409);
  await c.post("/api/auth/logout");
  assert.equal((await c.get("/api/me")).status, 401);
  assert.equal((await c.post("/api/auth/login", { email: "a@test.local", password: "wrong-pass" })).status, 401);
  assert.equal((await c.post("/api/auth/login", { email: "A@test.local", password: "password123" })).status, 200);

  await client().post("/api/auth/forgot", { email: "a@test.local" });
  const mail = db.one("SELECT body FROM outbox WHERE to_email='a@test.local' ORDER BY id DESC");
  const code = mail.body.match(/(\d{6})/)[1];
  const fresh = client();
  assert.equal((await fresh.post("/api/auth/reset", { email: "a@test.local", code: "000000" === code ? "111111" : "000000", password: "newpassword1" })).status, 400);
  assert.equal((await fresh.post("/api/auth/reset", { email: "a@test.local", code, password: "newpassword1" })).status, 200);
  assert.equal((await c.get("/api/me")).status, 401, "기존 세션은 재설정 후 끊김");
  assert.equal((await client().post("/api/auth/login", { email: "a@test.local", password: "newpassword1" })).status, 200);
});

test("CSRF 헤더 없는 상태 변경 요청은 거절", async () => {
  const r = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(r.status, 403);
});

test("무료 요금제: 잠긴 호흡법·시간 제한·하루 3회 한도와 30초 이내 복원", async () => {
  const c = await signup("free@test.local");
  assert.equal((await c.post("/api/sessions/start", { pattern: "lava", minutes: 1 })).json.error.code, "pattern_locked");
  assert.equal((await c.post("/api/sessions/start", { pattern: "box", minutes: 5 })).json.error.code, "minutes_locked");

  const s1 = await c.post("/api/sessions/start", { pattern: "box", minutes: 1 });
  assert.equal(s1.status, 200);
  assert.equal(s1.json.usage.remaining, 2);
  // 10초 만에 중단 → 복원
  const f1 = await c.post(`/api/sessions/${s1.json.id}/finish`, { actualSec: 10, completed: false });
  assert.equal(f1.json.restored, true);
  assert.equal(f1.json.usage.remaining, 3);
  // 같은 세션을 다시 끝내도 두 번 복원되지 않음
  const again = await c.post(`/api/sessions/${s1.json.id}/finish`, { actualSec: 5, completed: false });
  assert.equal(again.json.usage.remaining, 3);

  const ids = [];
  for (let i = 0; i < 3; i++) ids.push((await c.post("/api/sessions/start", { pattern: "coherent", minutes: 1 })).json.id);
  const over = await c.post("/api/sessions/start", { pattern: "coherent", minutes: 1 });
  assert.equal(over.status, 429);
  assert.equal(over.json.error.code, "daily_limit");

  // 완료 기록 저장과 재조회
  db.run("UPDATE breath_sessions SET started_at=started_at-60000 WHERE id=?", ids[0]);
  const fin = await c.post(`/api/sessions/${ids[0]}/finish`, { actualSec: 60, cycles: 5, completed: true });
  assert.equal(fin.json.session.status, "completed");
  await c.patch(`/api/sessions/${ids[0]}`, { feelingAfter: 4, note: "어깨가 풀렸다" });
  const list = await c.get("/api/sessions?q=" + encodeURIComponent("어깨"));
  assert.equal(list.json.items.length, 1);
  assert.equal(list.json.items[0].note, "어깨가 풀렸다");
  const csv = await fetch(base + "/api/sessions/export.csv", { headers: { Cookie: "" } });
  assert.equal(csv.status, 401);
});

test("동시 요청에도 하루 한도를 넘지 않는다", async () => {
  const c = await signup("race@test.local");
  const results = await Promise.all(Array.from({ length: 12 }, () => c.post("/api/sessions/start", { pattern: "sigh", minutes: 1 })));
  assert.equal(results.filter(r => r.status === 200).length, 3);
  assert.equal(db.one("SELECT used FROM usage_daily WHERE user_id=?", c.id).used, 3);
});

test("다른 사용자의 기록과 관리자 기능에 접근할 수 없다", async () => {
  const a = await signup("owner@test.local");
  const b = await signup("intruder@test.local");
  const s = await a.post("/api/sessions/start", { pattern: "box", minutes: 1 });
  assert.equal((await b.get(`/api/sessions/${s.json.id}`)).status, 404);
  assert.equal((await b.del(`/api/sessions/${s.json.id}`)).status, 404);
  assert.equal((await b.patch(`/api/sessions/${s.json.id}`, { note: "x" })).status, 404);
  assert.equal((await b.post(`/api/sessions/${s.json.id}/finish`, { actualSec: 1 })).status, 404);
  assert.equal((await b.get("/api/admin/overview")).status, 403);
  assert.equal((await client().get("/api/admin/users")).status, 401);
});

test("테스트 결제: 성공 화면만으로는 권한 없음, 웹훅으로 지급, 중복 알림 무시", async () => {
  const c = await signup("buyer@test.local");
  const co = await c.post("/api/billing/checkout", { cycle: "monthly" });
  assert.equal(co.status, 200);
  assert.equal((await c.get("/api/me")).json.entitlement.plan, "free", "결제 대기 상태에선 무료");

  const fail = await c.post("/api/billing/checkout", { cycle: "monthly" });
  const failed = await c.post("/api/billing/test/complete", { orderId: fail.json.orderId, outcome: "fail" });
  assert.equal(failed.json.result, "applied");
  assert.equal((await c.get("/api/me")).json.entitlement.plan, "free", "실패 결제는 권한 없음");

  const ok = await c.post("/api/billing/test/complete", { orderId: co.json.orderId, outcome: "success", duplicate: true });
  assert.equal(ok.json.result, "applied");
  assert.equal(ok.json.duplicateResult, "duplicate");
  const me = (await c.get("/api/me")).json;
  assert.equal(me.entitlement.plan, "premium");
  assert.equal(db.one("SELECT COUNT(*) n FROM subscriptions WHERE user_id=?", c.id).n, 1, "중복 알림에도 구독은 하나");
  assert.equal((await c.post("/api/sessions/start", { pattern: "lava", minutes: 10 })).status, 200);
  assert.equal((await c.post("/api/billing/checkout", { cycle: "yearly" })).status, 409, "이중 구독 방지");
});

test("위조된 웹훅 서명과 금액 불일치는 거절", async () => {
  const c = await signup("forge@test.local");
  const co = await c.post("/api/billing/checkout", { cycle: "monthly" });
  const ev = JSON.stringify({ id: "evt_forged", type: "payment.paid", occurredAt: Date.now(), data: { orderId: co.json.orderId, amount: 4900 } });
  const r = await fetch(base + "/api/webhooks/billing", { method: "POST", headers: { "x-sg-signature": "0".repeat(64) }, body: ev });
  assert.equal(r.status, 401);
  const bad = JSON.stringify({ id: "evt_amount", type: "payment.paid", occurredAt: Date.now(), data: { orderId: co.json.orderId, amount: 100 } });
  const r2 = await fetch(base + "/api/webhooks/billing", { method: "POST", headers: { "x-sg-signature": billing.sign(bad) }, body: bad });
  assert.equal((await r2.json()).result, "rejected:amount_mismatch");
  assert.equal((await c.get("/api/me")).json.entitlement.plan, "free");
});

async function premiumUser(email) {
  const c = await signup(email);
  const co = await c.post("/api/billing/checkout", { cycle: "monthly" });
  await c.post("/api/billing/test/complete", { orderId: co.json.orderId, outcome: "success" });
  c.sub = db.one("SELECT * FROM subscriptions WHERE user_id=?", c.id);
  return c;
}

test("해지 예약은 기간 끝까지 유지, 기간이 지나면 만료", async () => {
  const c = await premiumUser("cancel@test.local");
  const can = await c.post("/api/billing/cancel");
  assert.equal(can.json.subscription.status, "canceled");
  assert.equal(can.json.entitlement.plan, "premium", "해지 예약 중에는 프리미엄 유지");
  assert.equal((await c.post("/api/billing/resume")).json.subscription.status, "active");
  await c.post("/api/billing/cancel");
  db.run("UPDATE subscriptions SET current_period_end=? WHERE id=?", Date.now() - 1000, c.sub.id);
  assert.equal((await c.get("/api/me")).json.entitlement.plan, "free", "기간 종료 후 무료");
  billing.sweep(db);
  assert.equal(db.one("SELECT status FROM subscriptions WHERE id=?", c.sub.id).status, "expired");
  assert.equal((await c.post("/api/billing/resume")).status, 409);
});

test("갱신 실패 → 유예 → 갱신 성공, 순서가 뒤바뀐 알림은 무시", async () => {
  const c = await premiumUser("renew@test.local");
  const t0 = Date.now();
  const end2 = billing.addMonths(c.sub.current_period_end, 1);
  // 갱신 성공 알림이 먼저 도착하고, 그보다 이전에 발생한 실패 알림이 늦게 도착
  billing.testProviderEmit(db, "subscription.renewed", { subId: c.sub.provider_sub_id, orderId: "ord_r1", amount: 4900, periodEnd: end2 }, t0 + 2000);
  const stale = billing.testProviderEmit(db, "subscription.renewal_failed", { subId: c.sub.provider_sub_id }, t0 + 1000);
  assert.equal(stale.result, "ignored:stale");
  let s = db.one("SELECT * FROM subscriptions WHERE id=?", c.sub.id);
  assert.equal(s.status, "active");
  assert.equal(s.current_period_end, end2);

  billing.testProviderEmit(db, "subscription.renewal_failed", { subId: c.sub.provider_sub_id }, t0 + 3000);
  s = db.one("SELECT * FROM subscriptions WHERE id=?", c.sub.id);
  assert.equal(s.status, "past_due");
  // 기간이 끝났어도 유예 3일 동안은 프리미엄
  db.run("UPDATE subscriptions SET current_period_end=? WHERE id=?", Date.now() - 86400000, c.sub.id);
  assert.equal((await c.get("/api/me")).json.entitlement.plan, "premium");
  db.run("UPDATE subscriptions SET current_period_end=? WHERE id=?", Date.now() - 4 * 86400000, c.sub.id);
  assert.equal((await c.get("/api/me")).json.entitlement.plan, "free");
});

test("관리자: 환불 시 권한 즉시 종료, 수동 이용권과 사유 기록", async () => {
  const admin = await signup("admin@test.local");
  const c = await premiumUser("refund@test.local");
  const pay = db.one("SELECT * FROM payments WHERE user_id=? AND status='paid'", c.id);
  assert.equal((await admin.post(`/api/admin/payments/${pay.id}/refund`, {})).json.error.code, "reason_required");
  const rf = await admin.post(`/api/admin/payments/${pay.id}/refund`, { reason: "고객 요청 테스트" });
  assert.equal(rf.json.result, "applied");
  assert.equal((await c.get("/api/me")).json.entitlement.plan, "free");
  assert.equal((await admin.post(`/api/admin/payments/${pay.id}/refund`, { reason: "다시" })).status, 409);

  await admin.post(`/api/admin/users/${c.id}/grant`, { days: 7, reason: "불편 보상" });
  const me = (await c.get("/api/me")).json;
  assert.equal(me.entitlement.plan, "premium");
  assert.equal(me.entitlement.source, "grant");
  const log = (await admin.get("/api/admin/audit")).json.items;
  assert.ok(log.some(l => l.action === "grant_premium" && l.reason === "불편 보상"));
  assert.ok(log.some(l => l.action === "refund"));
  const ov = (await admin.get("/api/admin/overview")).json;
  assert.ok(ov.users >= 2 && Array.isArray(ov.series));
  const detail = (await admin.get(`/api/admin/users/${c.id}`)).json;
  assert.ok(!("note" in (detail.sessions[0] || {})), "관리자 화면에 메모 비노출");
});

test("탈퇴하면 계정과 기록이 삭제되고 결제 기록은 남는다", async () => {
  const c = await premiumUser("bye@test.local");
  await c.post("/api/sessions/start", { pattern: "box", minutes: 1 });
  assert.equal((await c.del("/api/me", { password: "wrong" })).status, 400);
  assert.equal((await c.del("/api/me", { password: "password123" })).status, 200);
  assert.equal(db.one("SELECT COUNT(*) n FROM users WHERE id=?", c.id).n, 0);
  assert.equal(db.one("SELECT COUNT(*) n FROM breath_sessions WHERE user_id=?", c.id).n, 0);
  assert.equal(db.one("SELECT COUNT(*) n FROM payments WHERE order_id LIKE 'ord_%' AND user_id IS NULL").n >= 1, true);
});
