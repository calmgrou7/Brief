"use strict";
/*
 * 이용권(권한)과 결제를 분리해서 관리합니다.
 *  - payments: 결제사 기준 결제 상태
 *  - subscriptions: 구독 기간과 해지·갱신 상태
 *  - entitlement(): 위 두 가지 + 관리자 수동 이용권으로 "지금 쓸 수 있는 요금제"를 계산
 * 권한은 결제 완료 화면이 아니라, 서명 검증된 결제 알림(웹훅)을 처리할 때만 지급됩니다.
 * 테스트 모드에서는 가짜 결제사가 같은 웹훅 경로로 알림을 보냅니다.
 */
const crypto = require("node:crypto");
const config = require("./config");
const { HttpError } = require("./http");

const DAY = 86400000;

function addMonths(ts, months) {
  const d = new Date(ts);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0); // 1/31 + 1개월 → 2월 말일
  return d.getTime();
}

const rid = p => `${p}_${crypto.randomBytes(9).toString("base64url")}`;

/* ───────── 이용권 계산 ───────── */
function currentSubscription(db, userId) {
  return db.one("SELECT * FROM subscriptions WHERE user_id=? ORDER BY current_period_end DESC, id DESC LIMIT 1", userId);
}

function entitlement(db, userId, now = Date.now()) {
  const sub = currentSubscription(db, userId);
  let source = null, until = null;
  if (sub) {
    const grace = sub.status === "past_due" ? config.billing.graceDays * DAY : 0;
    if (["active", "canceled", "past_due"].includes(sub.status) && sub.current_period_end + grace > now) {
      source = "subscription"; until = sub.current_period_end + grace;
    }
  }
  const g = db.one(
    `SELECT * FROM grants WHERE user_id=? AND revoked_at IS NULL AND starts_at<=? AND ends_at>?
     ORDER BY ends_at DESC LIMIT 1`, userId, now, now);
  if (g) { if (!source) source = "grant"; until = Math.max(until || 0, g.ends_at); }
  return {
    plan: source ? "premium" : "free",
    source,
    until,
    subscription: sub ? publicSub(sub) : null,
  };
}

function publicSub(s) {
  return {
    id: s.id, cycle: s.cycle, status: s.status, isTest: !!s.is_test,
    periodStart: s.current_period_start, periodEnd: s.current_period_end,
    cancelAtPeriodEnd: !!s.cancel_at_period_end,
  };
}

/* ───────── 웹훅 서명 ───────── */
function sign(raw) {
  return crypto.createHmac("sha256", config.billing.webhookSecret).update(raw).digest("hex");
}
function verify(raw, sig) {
  if (typeof sig !== "string" || !/^[0-9a-f]{64}$/.test(sig)) return false;
  const want = Buffer.from(sign(raw), "hex");
  return crypto.timingSafeEqual(want, Buffer.from(sig, "hex"));
}

/* ───────── 웹훅 처리 (중복·지연·순서 바뀜 대비) ───────── */
const handlers = {
  "payment.paid"(db, ev) {
    const { orderId, paymentKey, amount } = ev.data;
    const p = db.one("SELECT * FROM payments WHERE order_id=?", orderId);
    if (!p) return "ignored:unknown_order";
    if (p.status === "paid") return "noop:already_paid";
    if (p.status === "refunded") return "noop:already_refunded";
    if (Number(amount) !== p.amount) {
      db.run("UPDATE payments SET status='failed', updated_at=? WHERE id=?", Date.now(), p.id);
      return "rejected:amount_mismatch";
    }
    const now = Date.now();
    db.run("UPDATE payments SET status='paid', provider_payment_key=?, updated_at=? WHERE id=?", paymentKey, now, p.id);
    if (p.kind === "initial") {
      const months = config.prices[p.cycle].months;
      const start = ev.occurredAt;
      const r = db.run(
        `INSERT INTO subscriptions(user_id,plan,cycle,status,provider,provider_sub_id,current_period_start,current_period_end,
          last_event_at,is_test,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
        p.user_id, "premium", p.cycle, "active", p.provider, `sub_${orderId}`, start, addMonths(start, months),
        ev.occurredAt, p.is_test, now, now);
      db.run("UPDATE payments SET subscription_id=? WHERE id=?", Number(r.lastInsertRowid), p.id);
      db.run("INSERT INTO events(user_id,type,created_at) VALUES(?,?,?)", p.user_id, "paid", now);
    }
    return "applied";
  },

  "payment.failed"(db, ev) {
    const p = db.one("SELECT * FROM payments WHERE order_id=?", ev.data.orderId);
    if (!p) return "ignored:unknown_order";
    if (p.status !== "pending") return `noop:${p.status}`;
    db.run("UPDATE payments SET status='failed', updated_at=? WHERE id=?", Date.now(), p.id);
    return "applied";
  },

  "subscription.renewed"(db, ev) {
    const s = db.one("SELECT * FROM subscriptions WHERE provider_sub_id=?", ev.data.subId);
    if (!s) return "ignored:unknown_subscription";
    const now = Date.now();
    const exists = db.one("SELECT id FROM payments WHERE order_id=?", ev.data.orderId);
    if (!exists) {
      db.run(`INSERT INTO payments(user_id,subscription_id,order_id,kind,cycle,amount,status,provider,provider_payment_key,is_test,created_at,updated_at)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
        s.user_id, s.id, ev.data.orderId, "renewal", s.cycle, ev.data.amount, "paid", s.provider, ev.data.paymentKey || null, s.is_test, now, now);
    }
    if (["refunded", "expired"].includes(s.status)) return "noop:subscription_closed";
    const newEnd = Math.max(s.current_period_end, ev.data.periodEnd);
    const newer = ev.occurredAt >= s.last_event_at;
    db.run(`UPDATE subscriptions SET current_period_start=?, current_period_end=?, status=?, last_event_at=?, updated_at=? WHERE id=?`,
      newer ? s.current_period_end : s.current_period_start, newEnd,
      newer ? (s.cancel_at_period_end ? "canceled" : "active") : s.status,
      Math.max(s.last_event_at, ev.occurredAt), now, s.id);
    return "applied";
  },

  "subscription.renewal_failed"(db, ev) {
    const s = db.one("SELECT * FROM subscriptions WHERE provider_sub_id=?", ev.data.subId);
    if (!s) return "ignored:unknown_subscription";
    if (ev.occurredAt < s.last_event_at) return "ignored:stale";
    if (s.status !== "active") return `noop:${s.status}`;
    db.run("UPDATE subscriptions SET status='past_due', last_event_at=?, updated_at=? WHERE id=?", ev.occurredAt, Date.now(), s.id);
    return "applied";
  },

  "subscription.expired"(db, ev) {
    const s = db.one("SELECT * FROM subscriptions WHERE provider_sub_id=?", ev.data.subId);
    if (!s) return "ignored:unknown_subscription";
    if (ev.occurredAt < s.last_event_at) return "ignored:stale";
    if (["refunded", "expired"].includes(s.status)) return `noop:${s.status}`;
    db.run("UPDATE subscriptions SET status='expired', current_period_end=MIN(current_period_end, ?), last_event_at=?, updated_at=? WHERE id=?",
      ev.occurredAt, ev.occurredAt, Date.now(), s.id);
    return "applied";
  },

  "payment.refunded"(db, ev) {
    const p = db.one("SELECT * FROM payments WHERE order_id=?", ev.data.orderId);
    if (!p) return "ignored:unknown_order";
    if (p.status === "refunded") return "noop:already_refunded";
    const now = Date.now();
    db.run("UPDATE payments SET status='refunded', updated_at=? WHERE id=?", now, p.id);
    if (p.subscription_id && config.billing.refundRevokesAccess) {
      db.run(`UPDATE subscriptions SET status='refunded', current_period_end=MIN(current_period_end, ?), last_event_at=MAX(last_event_at, ?), updated_at=? WHERE id=?`,
        ev.occurredAt, ev.occurredAt, now, p.subscription_id);
    }
    db.run("INSERT INTO events(user_id,type,created_at) VALUES(?,?,?)", p.user_id, "refund", now);
    return "applied";
  },
};

function processEvent(db, ev) {
  if (!ev || typeof ev.id !== "string" || typeof ev.type !== "string" || !ev.data || !Number.isFinite(ev.occurredAt)) {
    throw new HttpError(400, "bad_event", "결제 알림 형식이 올바르지 않습니다.");
  }
  return db.tx(() => {
    const ins = db.run(
      "INSERT OR IGNORE INTO webhook_events(event_id,type,occurred_at,payload,received_at) VALUES(?,?,?,?,?)",
      ev.id, ev.type, ev.occurredAt, JSON.stringify(ev), Date.now());
    if (ins.changes === 0) return { duplicate: true, result: "duplicate" };
    const h = handlers[ev.type];
    const result = h ? h(db, ev) : "ignored:unknown_type";
    db.run("UPDATE webhook_events SET result=? WHERE event_id=?", result, ev.id);
    return { duplicate: false, result };
  });
}

/* 웹훅 HTTP 경로와 테스트 결제사가 같이 쓰는 입구 */
function receiveWebhook(db, raw, signature) {
  if (!verify(raw, signature)) throw new HttpError(401, "bad_signature", "결제 알림 서명이 올바르지 않습니다.");
  let ev;
  try { ev = JSON.parse(raw); } catch { throw new HttpError(400, "bad_json", "결제 알림을 읽을 수 없습니다."); }
  return processEvent(db, ev);
}

/* ───────── 사용자 동작 ───────── */
function createCheckout(db, userId, cycle) {
  const price = config.prices[cycle];
  if (!price || typeof price !== "object") throw new HttpError(400, "bad_cycle", "결제 주기를 선택해 주세요.");
  const ent = entitlement(db, userId);
  if (ent.source === "subscription" && ent.subscription && ent.subscription.status !== "past_due") {
    throw new HttpError(409, "already_subscribed", "이미 프리미엄을 구독 중입니다.");
  }
  if (config.billing.mode !== "test") throw new HttpError(501, "live_not_configured", "실결제가 아직 연결되지 않았습니다.");
  const now = Date.now(), orderId = rid("ord");
  db.run(`INSERT INTO payments(user_id,order_id,kind,cycle,amount,status,provider,is_test,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,?,?,?)`, userId, orderId, "initial", cycle, price.amount, "pending", "test", 1, now, now);
  db.run("INSERT INTO events(user_id,type,created_at) VALUES(?,?,?)", userId, "checkout_start", now);
  return { orderId, cycle, amount: price.amount, provider: "test" };
}

/* 테스트 결제사: 결제 결과를 서명된 웹훅으로 보냅니다. */
function testProviderEmit(db, type, data, occurredAt = Date.now()) {
  const ev = { id: rid("evt"), type, occurredAt, data };
  const raw = JSON.stringify(ev);
  return { event: ev, ...receiveWebhook(db, raw, sign(raw)) };
}

function testComplete(db, userId, orderId, outcome) {
  const p = db.one("SELECT * FROM payments WHERE order_id=? AND user_id=?", orderId, userId);
  if (!p) throw new HttpError(404, "not_found", "주문을 찾을 수 없습니다.");
  if (p.provider !== "test") throw new HttpError(400, "not_test", "테스트 주문이 아닙니다.");
  if (p.status !== "pending") return { result: `noop:${p.status}` };
  if (outcome === "success") {
    return testProviderEmit(db, "payment.paid", { orderId, paymentKey: rid("pk_test"), amount: p.amount });
  }
  return testProviderEmit(db, "payment.failed", { orderId, reason: "test_declined" });
}

function cancel(db, userId) {
  const s = currentSubscription(db, userId);
  if (!s || !["active", "past_due"].includes(s.status)) throw new HttpError(409, "no_active_subscription", "해지할 구독이 없습니다.");
  // 실결제 연결 시: 결제사 해지 API 호출 후 아래 상태 반영
  db.run("UPDATE subscriptions SET status='canceled', cancel_at_period_end=1, updated_at=? WHERE id=?", Date.now(), s.id);
  db.run("INSERT INTO events(user_id,type,created_at) VALUES(?,?,?)", userId, "cancel", Date.now());
  return publicSub(db.one("SELECT * FROM subscriptions WHERE id=?", s.id));
}

function resume(db, userId) {
  const s = currentSubscription(db, userId);
  if (!s || s.status !== "canceled" || s.current_period_end <= Date.now()) {
    throw new HttpError(409, "cannot_resume", "다시 이어갈 수 있는 구독이 없습니다.");
  }
  db.run("UPDATE subscriptions SET status='active', cancel_at_period_end=0, updated_at=? WHERE id=?", Date.now(), s.id);
  return publicSub(db.one("SELECT * FROM subscriptions WHERE id=?", s.id));
}

/* 시간 경과에 따른 상태 정리 (권한 계산은 시간 기준이라 이 작업이 늦어도 권한은 정확합니다) */
function sweep(db, now = Date.now()) {
  const g = config.billing.graceDays * DAY;
  db.run("UPDATE subscriptions SET status='expired', updated_at=? WHERE status='canceled' AND current_period_end<=?", now, now);
  db.run("UPDATE subscriptions SET status='expired', updated_at=? WHERE status='past_due' AND current_period_end+?<=?", now, g, now);
  db.run("UPDATE subscriptions SET status='expired', updated_at=? WHERE status='active' AND current_period_end+?<=?", now, g, now);
}

/* 관리자 테스트 도구: 갱신 성공/실패, 만료, 환불 */
function adminSimulate(db, subId, action) {
  const s = db.one("SELECT * FROM subscriptions WHERE id=?", subId);
  if (!s) throw new HttpError(404, "not_found", "구독을 찾을 수 없습니다.");
  if (!s.is_test) throw new HttpError(400, "not_test", "실결제 구독에는 시뮬레이션을 쓸 수 없습니다.");
  const months = config.prices[s.cycle].months;
  if (action === "renew") {
    return testProviderEmit(db, "subscription.renewed", {
      subId: s.provider_sub_id, orderId: rid("ord"), paymentKey: rid("pk_test"),
      amount: config.prices[s.cycle].amount, periodEnd: addMonths(s.current_period_end, months),
    });
  }
  if (action === "renew_fail") return testProviderEmit(db, "subscription.renewal_failed", { subId: s.provider_sub_id });
  if (action === "expire") return testProviderEmit(db, "subscription.expired", { subId: s.provider_sub_id });
  throw new HttpError(400, "bad_action", "알 수 없는 동작입니다.");
}

function refund(db, paymentId) {
  const p = db.one("SELECT * FROM payments WHERE id=?", paymentId);
  if (!p) throw new HttpError(404, "not_found", "결제를 찾을 수 없습니다.");
  if (p.status !== "paid") throw new HttpError(409, "not_refundable", "결제 완료 상태만 환불할 수 있습니다.");
  if (!p.is_test) throw new HttpError(501, "live_not_configured", "실결제 환불은 결제사 연결 후 가능합니다.");
  return testProviderEmit(db, "payment.refunded", { orderId: p.order_id, amount: p.amount });
}

module.exports = {
  entitlement, currentSubscription, publicSub, processEvent, receiveWebhook, sign, verify,
  createCheckout, testComplete, testProviderEmit, cancel, resume, sweep, adminSimulate, refund, addMonths,
};
