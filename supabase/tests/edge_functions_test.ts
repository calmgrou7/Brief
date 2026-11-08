// 실행: deno test supabase/tests/  (네트워크·실DB 불필요 — 가짜 DB / 가짜 PortOne·FCM 서버 사용)
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import type { Db, DispatchTarget, PaymentRow, RequestRow } from "../functions/_shared/types.ts";
import { createPortOne, requestIdFromPaymentId } from "../functions/_shared/portone.ts";
import { createFcm, signServiceAccountJwt, type Push, type PushMessage } from "../functions/_shared/fcm.ts";
import { signStandardWebhook, verifyStandardWebhook } from "../functions/_shared/webhook.ts";
import { confirmPaidPayment } from "../functions/_shared/payment.ts";
import { dispatchRequest, matchingTick } from "../functions/_shared/dispatch.ts";
import { processRefunds } from "../functions/_shared/refunds.ts";
import { buildNotifications } from "../functions/_shared/notify.ts";
import { AppError } from "../functions/_shared/http.ts";

// ---------------------------------------------------------------- 가짜 구현
const CUSTOMER = "c-1", E1 = "e-1", E2 = "e-2";

function fakeDb(init: { requests?: RequestRow[]; payments?: PaymentRow[]; targets?: DispatchTarget[] } = {}) {
  const requests = new Map((init.requests ?? []).map((r) => [r.id, { ...r }]));
  const payments: PaymentRow[] = (init.payments ?? []).map((p) => ({ ...p }));
  const dispatched = new Set<string>();
  const tokens = new Map<string, string>([["tok-e1", E1], ["tok-e2", E2], ["tok-c", CUSTOMER], ["tok-dead", E2]]);
  const log: string[] = [];
  const db: Db = {
    getUserIdFromJwt: async (jwt) => jwt === "jwt-customer" ? CUSTOMER : jwt === "jwt-other" ? "x-9" : null,
    getRequest: async (id) => requests.get(id) ?? null,
    getPaymentByRequest: async (id) => payments.find((p) => p.request_id === id) ?? null,
    getPaymentByPgId: async (pg) => payments.find((p) => p.pg_payment_id === pg) ?? null,
    confirmPayment: async (id, pg, amount) => {
      const r = requests.get(id)!;
      if (r.status !== "pending_payment") throw new Error("결제 대기 상태가 아닙니다");
      if (amount !== r.total_fee) throw new Error("결제 금액 불일치");
      payments.push({ id: payments.length + 1, request_id: id, amount, pg_payment_id: pg, status: "paid",
                      refund_amount: 0, refund_reason: null, refund_attempts: 0 });
      r.status = "matching"; r.match_radius_km = 3; log.push(`confirm:${id}`);
      return r;
    },
    pickTargets: async (id) => (init.targets ?? []).filter((t) => !dispatched.has(`${id}:${t.expert_id}`)),
    recordDispatches: async (id, _r, targets) => {
      let n = 0;
      for (const t of targets) { const k = `${id}:${t.expert_id}`; if (!dispatched.has(k)) { dispatched.add(k); n++; } }
      return n;
    },
    getTokens: async (ids) => [...tokens].filter(([, u]) => ids.includes(u)).map(([token, user_id]) => ({ token, user_id })),
    deleteTokens: async (ts) => { ts.forEach((t) => tokens.delete(t)); log.push(`deleteTokens:${ts.join(",")}`); },
    getCategoryName: async () => "열쇠·도어락",
    processMatchingQueue: async () => ({ expanded: 1, expired: 0 }),
    requestsNeedingDispatch: async () => [...requests.values()].filter((r) => r.status === "matching")
      .map((r) => ({ request_id: r.id, type: r.type, radius_km: r.match_radius_km ?? 3, target_expert_id: r.target_expert_id })),
    claimRefunds: async () => {
      const c = payments.filter((p) => p.status === "refund_requested");
      c.forEach((p) => { p.status = "refund_processing"; p.refund_attempts++; });
      return c.map((p) => ({ ...p }));
    },
    releaseStuckRefunds: async () => 0,
    completeRefund: async (id, ok, _c, err) => {
      const p = payments.find((x) => x.id === id)!;
      p.status = ok ? (p.refund_amount >= p.amount ? "refunded" : "partial_refunded") : "refund_requested";
      log.push(`refund:${id}:${ok}:${err ?? ""}`);
    },
  };
  return { db, requests, payments, tokens, log, dispatched };
}

function fakePush(): Push & { sent: { tokens: string[]; msg: PushMessage }[] } {
  const sent: { tokens: string[]; msg: PushMessage }[] = [];
  return {
    sent,
    async sendMany(tokens, msg) {
      sent.push({ tokens, msg });
      return tokens.map((t) => ({ token: t, ok: t !== "tok-dead", unregistered: t === "tok-dead" }));
    },
  };
}

/** 가짜 PortOne 서버 (실제 REST 형식 그대로) */
function fakePortOneServer(payments: Record<string, { status: string; total: number; cancelled?: number }>,
                           opts: { failCancel?: string } = {}) {
  const calls: { method: string; path: string; body?: unknown; auth: string | null }[] = [];
  const fetchFn = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method: init?.method ?? "GET", path: url.pathname, body, auth: new Headers(init?.headers).get("Authorization") });
    const m = /^\/payments\/([^/]+)(\/cancel)?$/.exec(url.pathname)!;
    const p = payments[decodeURIComponent(m[1])];
    if (!p) return new Response(JSON.stringify({ type: "PAYMENT_NOT_FOUND" }), { status: 404 });
    if (m[2]) {
      if (opts.failCancel) return new Response(JSON.stringify({ type: opts.failCancel, message: "fail" }), { status: 409 });
      const cancelled = (p.cancelled ?? 0) + body.amount;
      p.cancelled = cancelled;
      p.status = cancelled >= p.total ? "CANCELLED" : "PARTIAL_CANCELLED";
      return Response.json({ cancellation: { id: "cancel-1", status: "SUCCEEDED" } });
    }
    return Response.json({ id: m[1], status: p.status, amount: { total: p.total, cancelled: p.cancelled ?? 0 } });
  }) as typeof fetch;
  return { portone: createPortOne("secret-key", fetchFn), calls, payments };
}

const req = (o: Partial<RequestRow> = {}): RequestRow => ({
  id: 1, customer_id: CUSTOMER, category_id: 1, type: "broadcast", target_expert_id: null, expert_id: null,
  status: "pending_payment", total_fee: 15000, match_radius_km: null, region_code: "busan-busanjin",
  symptom: "현관 도어락 잠김", ...o,
});
const PAY = "req_1_abc123XYZ";

// ---------------------------------------------------------------- 결제ID 규칙
Deno.test("결제ID ↔ 요청ID 매핑", () => {
  assertEquals(requestIdFromPaymentId("req_42_a1b2c3d4"), 42);
  assertEquals(requestIdFromPaymentId("req_42_x"), null);       // 랜덤부분 너무 짧음
  assertEquals(requestIdFromPaymentId("order_42_a1b2c3d4"), null);
});

// ---------------------------------------------------------------- 결제 확인
Deno.test("결제 확인: 정상 → 매칭대기 전환 + 1차 콜 발송 + 죽은 토큰 정리", async () => {
  const f = fakeDb({ requests: [req()], targets: [{ expert_id: E1, level: 1, distance_km: 0.1 }, { expert_id: E2, level: 3, distance_km: 1.1 }] });
  const pg = fakePortOneServer({ [PAY]: { status: "PAID", total: 15000 } });
  const push = fakePush();

  const res = await confirmPaidPayment({ db: f.db, portone: pg.portone }, PAY, { expectedCustomerId: CUSTOMER });
  assertEquals(res.alreadyProcessed, false);
  assertEquals(res.request.status, "matching");
  assertEquals(pg.calls[0].auth, "PortOne secret-key");

  const d = await dispatchRequest({ db: f.db, push }, 1);
  assertEquals(d.targets, 2);
  assertEquals(d.delivered, 2);                                 // tok-e1, tok-e2 성공 / tok-dead 실패
  assertEquals(push.sent[0].msg.channel, "calls");
  assert(push.sent[0].msg.title.includes("새 콜"));
  assert(f.log.includes("deleteTokens:tok-dead"));

  // 같은 요청 재발송 시 중복 푸시 없음
  assertEquals((await dispatchRequest({ db: f.db, push }, 1)).targets, 0);
});

Deno.test("결제 확인: 앱+웹훅 중복 호출은 한 번만 처리 (멱등)", async () => {
  const f = fakeDb({ requests: [req()] });
  const pg = fakePortOneServer({ [PAY]: { status: "PAID", total: 15000 } });
  await confirmPaidPayment({ db: f.db, portone: pg.portone }, PAY);
  const again = await confirmPaidPayment({ db: f.db, portone: pg.portone }, PAY);
  assertEquals(again.alreadyProcessed, true);
  assertEquals(f.log.filter((l) => l.startsWith("confirm")).length, 1);
});

Deno.test("결제 확인: 금액 불일치 → PG 자동 전액취소 + 오류", async () => {
  const f = fakeDb({ requests: [req()] });
  const pg = fakePortOneServer({ [PAY]: { status: "PAID", total: 1000 } });
  const e = await assertRejects(() => confirmPaidPayment({ db: f.db, portone: pg.portone }, PAY), AppError);
  assertEquals(e.code, "AMOUNT_MISMATCH");
  const cancel = pg.calls.find((c) => c.path.endsWith("/cancel"))!;
  assertEquals(cancel.body, { amount: 1000, reason: "결제 금액 불일치 자동취소", currentCancellableAmount: 1000 });
  assertEquals(f.requests.get(1)!.status, "pending_payment");
});

Deno.test("결제 확인: 결제 중 요청이 취소됨 → 자동 취소", async () => {
  const f = fakeDb({ requests: [req({ status: "cancelled_by_customer" })] });
  const pg = fakePortOneServer({ [PAY]: { status: "PAID", total: 15000 } });
  const e = await assertRejects(() => confirmPaidPayment({ db: f.db, portone: pg.portone }, PAY), AppError);
  assertEquals(e.code, "INVALID_STATE");
  assertEquals(pg.payments[PAY].status, "CANCELLED");
});

Deno.test("결제 확인: 미결제·타인 요청·다른 결제 재사용 차단", async () => {
  const f = fakeDb({ requests: [req()] });
  const pg = fakePortOneServer({ [PAY]: { status: "READY", total: 15000 }, req_1_otherPAY1: { status: "PAID", total: 15000 } });
  assertEquals((await assertRejects(() => confirmPaidPayment({ db: f.db, portone: pg.portone }, PAY), AppError)).code, "NOT_PAID");
  assertEquals((await assertRejects(() =>
    confirmPaidPayment({ db: f.db, portone: pg.portone }, PAY, { expectedCustomerId: "x-9" }), AppError)).code, "FORBIDDEN");
  pg.payments[PAY].status = "PAID";
  await confirmPaidPayment({ db: f.db, portone: pg.portone }, PAY);
  assertEquals((await assertRejects(() =>
    confirmPaidPayment({ db: f.db, portone: pg.portone }, "req_1_otherPAY1"), AppError)).code, "ALREADY_PAID");
});

// ---------------------------------------------------------------- 콜 발송
Deno.test("지정콜: 지정 전문가에게만 발송", async () => {
  const f = fakeDb({ requests: [req({ status: "matching", type: "direct", target_expert_id: E1, match_radius_km: 3 })],
                     targets: [{ expert_id: E2, level: 3, distance_km: 1 }] });
  const push = fakePush();
  const d = await dispatchRequest({ db: f.db, push }, 1);
  assertEquals(d.targets, 1);
  assertEquals(push.sent[0].tokens, ["tok-e1"]);
  assert(push.sent[0].msg.title.includes("지정 콜"));
});

Deno.test("매칭 tick: 대기 중 요청에 추가 발송, 매칭 끝난 요청은 무시", async () => {
  const f = fakeDb({
    requests: [req({ id: 1, status: "matching", match_radius_km: 5 }), req({ id: 2, status: "matched" })],
    targets: [{ expert_id: E2, level: 2, distance_km: 4 }],
  });
  const res = await matchingTick({ db: f.db, push: fakePush() });
  assertEquals(res, { expanded: 1, expired: 0, dispatched_requests: 1, pushed_experts: 1 });
});

// ---------------------------------------------------------------- 환불
const paid = (o: Partial<PaymentRow> = {}): PaymentRow => ({
  id: 1, request_id: 1, amount: 15000, pg_payment_id: PAY, status: "refund_requested",
  refund_amount: 15000, refund_reason: "미매칭 자동환불", refund_attempts: 0, ...o,
});

Deno.test("환불: PG 취소 성공 → 환불완료 + 고객 알림", async () => {
  const f = fakeDb({ requests: [req({ status: "expired" })], payments: [paid()] });
  const pg = fakePortOneServer({ [PAY]: { status: "PAID", total: 15000 } });
  const push = fakePush();
  const r = await processRefunds({ db: f.db, portone: pg.portone, push });
  assertEquals(r, { released: 0, claimed: 1, refunded: 1, failed: 0 });
  assertEquals(f.payments[0].status, "refunded");
  assertEquals(pg.calls[0].body, { amount: 15000, reason: "미매칭 자동환불", currentCancellableAmount: 15000 });
  assert(push.sent[0].msg.body.includes("15,000원"));
});

Deno.test("환불: 부분 환불", async () => {
  const f = fakeDb({ payments: [paid({ refund_amount: 5000, refund_reason: "관리자 부분환불" })] });
  const pg = fakePortOneServer({ [PAY]: { status: "PAID", total: 15000 } });
  await processRefunds({ db: f.db, portone: pg.portone });
  assertEquals(f.payments[0].status, "partial_refunded");
  assertEquals(pg.payments[PAY].status, "PARTIAL_CANCELLED");
});

Deno.test("환불: PG는 이미 취소됨(이전 실행 성공) → 중복 환불 없이 성공 기록", async () => {
  const f = fakeDb({ payments: [paid()] });
  const pg = fakePortOneServer({ [PAY]: { status: "CANCELLED", total: 15000, cancelled: 15000 } },
                               { failCancel: "PAYMENT_ALREADY_CANCELLED" });
  const r = await processRefunds({ db: f.db, portone: pg.portone });
  assertEquals(r.refunded, 1);
  assertEquals(f.payments[0].status, "refunded");
});

Deno.test("환불: PG 실패 → 재시도 대기로 되돌림", async () => {
  const f = fakeDb({ payments: [paid()] });
  const pg = fakePortOneServer({ [PAY]: { status: "PAID", total: 15000 } }, { failCancel: "PG_PROVIDER_ERROR" });
  const r = await processRefunds({ db: f.db, portone: pg.portone });
  assertEquals(r.failed, 1);
  assertEquals(f.payments[0].status, "refund_requested");
  assert(f.log.some((l) => l.includes("PG_PROVIDER_ERROR")));
});

// ---------------------------------------------------------------- 웹훅 서명
Deno.test("PortOne 웹훅 서명 검증 (Standard Webhooks)", async () => {
  const secret = "whsec_" + btoa("super-secret-key-1234567890");
  const body = JSON.stringify({ type: "Transaction.Paid", data: { paymentId: PAY } });
  const now = 1_800_000_000;
  const sig = await signStandardWebhook(secret, "wh_1", String(now), body);
  const h = (s: string, ts = now) => new Headers({ "webhook-id": "wh_1", "webhook-timestamp": String(ts), "webhook-signature": s });

  assert(await verifyStandardWebhook(secret, h(sig), body, now));
  assert(await verifyStandardWebhook(secret, h("v1,old " + sig), body, now));        // 키 교체 중 여러 서명
  assert(!(await verifyStandardWebhook(secret, h(sig), body + " ", now)));          // 본문 변조
  assert(!(await verifyStandardWebhook(secret, h(sig), body, now + 600)));          // 10분 지난 재전송
  assert(!(await verifyStandardWebhook("whsec_" + btoa("other"), h(sig), body, now)));
});

// ---------------------------------------------------------------- FCM
Deno.test("FCM: 서비스계정 JWT RS256 서명 + v1 발송 형식 + 토큰 캐시", async () => {
  const kp = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey));
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----\n`;
  const sa = { project_id: "dongne-test", client_email: "push@dongne-test.iam.gserviceaccount.com", private_key: pem };

  // JWT 서명 검증
  const jwt = await signServiceAccountJwt(sa, 1000);
  const [h, p, s] = jwt.split(".");
  const dec = (x: string) => Uint8Array.from(atob(x.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  assert(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", kp.publicKey, dec(s), new TextEncoder().encode(`${h}.${p}`)));
  const claims = JSON.parse(new TextDecoder().decode(dec(p)));
  assertEquals(claims.scope, "https://www.googleapis.com/auth/firebase.messaging");
  assertEquals(claims.exp - claims.iat, 3600);

  // 발송 형식
  let tokenCalls = 0;
  const sends: Record<string, unknown>[] = [];
  const fetchFn = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith("https://oauth2.googleapis.com")) {
      tokenCalls++;
      return Response.json({ access_token: "ya29.test", expires_in: 3600 });
    }
    assertEquals(url, "https://fcm.googleapis.com/v1/projects/dongne-test/messages:send");
    assertEquals(new Headers(init?.headers).get("Authorization"), "Bearer ya29.test");
    const body = JSON.parse(String(init!.body));
    sends.push(body.message);
    if (body.message.token === "gone") {
      return Response.json({ error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } }, { status: 404 });
    }
    return Response.json({ name: "projects/dongne-test/messages/1" });
  }) as typeof fetch;

  const fcm = createFcm(sa, fetchFn);
  const msg = { title: "🔔 새 콜", body: "테스트", data: { request_id: "1" }, channel: "calls" as const };
  const r1 = await fcm.sendMany(["a", "gone"], msg);
  await fcm.sendMany(["b"], msg);
  assertEquals(tokenCalls, 1);                                   // 액세스 토큰 재사용
  assertEquals(r1.map((r) => [r.ok, r.unregistered]), [[true, false], [false, true]]);
  const m = sends[0] as { android: { priority: string; notification: { channel_id: string } }; apns: { headers: Record<string, string> } };
  assertEquals(m.android.priority, "HIGH");
  assertEquals(m.android.notification.channel_id, "calls");
  assertEquals(m.apns.headers["apns-priority"], "10");
});

// ---------------------------------------------------------------- 상태 알림
Deno.test("상태 알림 문구·대상", () => {
  const r = { id: 7, customer_id: CUSTOMER, expert_id: E1 };
  const matched = buildNotifications(r, "matching", "matched", "열쇠·도어락");
  assertEquals(matched.length, 1);
  assertEquals(matched[0].userId, CUSTOMER);
  assert(matched[0].msg.body.includes("열쇠·도어락"));

  const noShow = buildNotifications(r, "matched", "no_show", "열쇠");
  assertEquals(noShow.map((n) => n.userId).sort(), [CUSTOMER, E1].sort());
  assertEquals(buildNotifications(r, "expired", "expired", "열쇠"), []);           // 환불완료 메모 이벤트
  assertEquals(buildNotifications({ ...r, expert_id: null }, "matching", "confirmed", "x"), []);
});
