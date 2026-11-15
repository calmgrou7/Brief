"use strict";
const config = require("./config");
const auth = require("./auth");
const billing = require("./billing");
const usage = require("./usage");
const { HttpError, str, int } = require("./http");

const DAY = 86400000;
const PATTERN_NAMES = { lava: "용암 호흡", box: "박스 호흡", "478": "달빛 4-7-8", coherent: "공명 호흡", sigh: "한숨 호흡", nadi: "교호 호흡" };

function logEvent(db, userId, type) { db.run("INSERT INTO events(user_id,type,created_at) VALUES(?,?,?)", userId, type, Date.now()); }
function audit(db, adminId, action, targetType, targetId, detail, reason) {
  db.run("INSERT INTO audit_log(admin_id,action,target_type,target_id,detail,reason,created_at) VALUES(?,?,?,?,?,?,?)",
    adminId, action, targetType, String(targetId ?? ""), detail ? JSON.stringify(detail) : null, reason || null, Date.now());
}
function needReason(body) {
  const r = str(body.reason, 300);
  if (r.length < 2) throw new HttpError(400, "reason_required", "변경 사유를 입력해 주세요.");
  return r;
}

function mePayload(db, user) {
  const ent = billing.entitlement(db, user.id);
  const lim = usage.limitsFor(ent.plan);
  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.created_at },
    entitlement: ent,
    limits: { patterns: lim.patterns, dailySessions: lim.dailySessions, maxMinutes: lim.maxMinutes, historyDays: lim.historyDays },
    usage: usage.usageToday(db, user.id, ent.plan),
  };
}

function publicConfig() {
  return {
    app: { name: config.app.name, nameEn: config.app.nameEn },
    billingMode: config.billing.mode,
    prices: { draft: config.prices.draft, monthly: config.prices.monthly, yearly: config.prices.yearly },
    plans: Object.fromEntries(Object.entries(config.plans).map(([k, v]) => [k, {
      label: v.label, patterns: v.patterns, dailySessions: v.dailySessions, maxMinutes: v.maxMinutes, historyDays: v.historyDays,
    }])),
    restoreIfUnderSec: config.usage.restoreIfUnderSec,
  };
}

function register(r, { setSession, clearSession }) {
  /* ───────── 공개 ───────── */
  r.get("/api/config", () => publicConfig());

  r.get("/api/content", ({ db, query }) => {
    const kind = query.get("kind") === "notice" ? "notice" : "faq";
    return { items: db.all("SELECT id,title,body,created_at FROM content WHERE kind=? AND published=1 ORDER BY sort, id DESC", kind) };
  });

  r.post("/api/errors", ({ db, body, req }) => {
    // 오류 메시지만 저장합니다. 사용자 입력 내용은 보내지 않습니다.
    db.run("INSERT INTO error_log(source,message,path,created_at) VALUES(?,?,?,?)",
      "client", str(body.message, 300) || "unknown", str(body.path, 120), Date.now());
    return { ok: true };
  });

  /* ───────── 계정 ───────── */
  r.post("/api/auth/signup", ({ db, body, res, ip }) => {
    const email = auth.normalizeEmail(body.email);
    if (auth.rateLimited(`signup:${ip}`, 20)) throw new HttpError(429, "rate_limited", "잠시 후 다시 시도해 주세요.");
    if (!auth.validEmail(email)) throw new HttpError(400, "bad_email", "이메일 주소를 확인해 주세요.");
    if (!auth.validPassword(body.password)) throw new HttpError(400, "bad_password", "비밀번호는 8자 이상으로 정해 주세요.");
    if (!body.agree) throw new HttpError(400, "agree_required", "이용약관과 개인정보처리방침에 동의해 주세요.");
    if (db.one("SELECT id FROM users WHERE email=?", email)) throw new HttpError(409, "email_taken", "이미 가입된 이메일입니다. 로그인해 주세요.");
    const role = config.auth.adminEmail && email === config.auth.adminEmail ? "admin" : "user";
    const ins = db.run("INSERT INTO users(email,pw_hash,name,role,created_at) VALUES(?,?,?,?,?)",
      email, auth.hashPassword(body.password), str(body.name, 40), role, Date.now());
    const user = db.one("SELECT * FROM users WHERE id=?", Number(ins.lastInsertRowid));
    logEvent(db, user.id, "signup");
    setSession(res, auth.createSession(db, user.id));
    return mePayload(db, user);
  });

  r.post("/api/auth/login", ({ db, body, res, ip }) => {
    const email = auth.normalizeEmail(body.email);
    if (auth.rateLimited(`login:${ip}:${email}`)) throw new HttpError(429, "rate_limited", "로그인 시도가 많아요. 15분 뒤 다시 시도해 주세요.");
    const user = db.one("SELECT * FROM users WHERE email=?", email);
    if (!user || !auth.verifyPassword(String(body.password || ""), user.pw_hash)) {
      throw new HttpError(401, "bad_credentials", "이메일 또는 비밀번호가 맞지 않습니다.");
    }
    if (user.status !== "active") throw new HttpError(403, "suspended", "이용이 제한된 계정입니다. 고객지원으로 문의해 주세요.");
    setSession(res, auth.createSession(db, user.id));
    return mePayload(db, user);
  });

  r.post("/api/auth/logout", ({ db, token, res }) => { auth.destroySession(db, token); clearSession(res); return { ok: true }; });

  r.post("/api/auth/forgot", ({ db, body, ip }) => {
    const email = auth.normalizeEmail(body.email);
    if (auth.rateLimited(`forgot:${ip}`, 5)) throw new HttpError(429, "rate_limited", "잠시 후 다시 시도해 주세요.");
    const user = auth.validEmail(email) && db.one("SELECT * FROM users WHERE email=?", email);
    if (user) {
      const code = auth.sixDigit(), now = Date.now();
      db.run("UPDATE password_resets SET used_at=? WHERE user_id=? AND used_at IS NULL", now, user.id);
      db.run("INSERT INTO password_resets(user_id,code_hash,expires_at) VALUES(?,?,?)", user.id, auth.sha256(code), now + 15 * 60000);
      // 메일 발송 서비스 연결 전: 보낼 메일을 outbox 에 저장합니다.
      db.run("INSERT INTO outbox(to_email,subject,body,created_at) VALUES(?,?,?,?)", email,
        "[숨결] 비밀번호 재설정 코드", `재설정 코드: ${code}\n15분 동안 유효합니다. 요청하지 않았다면 이 메일을 무시하세요.`, now);
    }
    // 가입 여부를 드러내지 않도록 항상 같은 응답
    return { ok: true };
  });

  r.post("/api/auth/reset", ({ db, body, res }) => {
    const email = auth.normalizeEmail(body.email);
    const user = db.one("SELECT * FROM users WHERE email=?", email);
    const fail = new HttpError(400, "bad_code", "코드가 맞지 않거나 만료됐어요. 다시 요청해 주세요.");
    if (!user) throw fail;
    if (!auth.validPassword(body.password)) throw new HttpError(400, "bad_password", "비밀번호는 8자 이상으로 정해 주세요.");
    const pr = db.one("SELECT * FROM password_resets WHERE user_id=? AND used_at IS NULL AND expires_at>? ORDER BY id DESC LIMIT 1", user.id, Date.now());
    if (!pr) throw fail;
    if (pr.attempts >= 5) throw fail;
    if (pr.code_hash !== auth.sha256(String(body.code || "").trim())) {
      db.run("UPDATE password_resets SET attempts=attempts+1 WHERE id=?", pr.id); throw fail;
    }
    db.tx(() => {
      db.run("UPDATE password_resets SET used_at=? WHERE id=?", Date.now(), pr.id);
      db.run("UPDATE users SET pw_hash=? WHERE id=?", auth.hashPassword(body.password), user.id);
      db.run("DELETE FROM auth_sessions WHERE user_id=?", user.id);
    });
    setSession(res, auth.createSession(db, user.id));
    return mePayload(db, db.one("SELECT * FROM users WHERE id=?", user.id));
  });

  r.get("/api/me", ({ db, user }) => mePayload(db, user), { auth: "user" });

  r.patch("/api/me", ({ db, user, body }) => {
    db.run("UPDATE users SET name=? WHERE id=?", str(body.name, 40), user.id);
    return mePayload(db, db.one("SELECT * FROM users WHERE id=?", user.id));
  }, { auth: "user" });

  r.post("/api/me/password", ({ db, user, body, token }) => {
    if (!auth.verifyPassword(String(body.current || ""), user.pw_hash)) throw new HttpError(400, "bad_password", "현재 비밀번호가 맞지 않습니다.");
    if (!auth.validPassword(body.next)) throw new HttpError(400, "bad_password", "새 비밀번호는 8자 이상으로 정해 주세요.");
    db.run("UPDATE users SET pw_hash=? WHERE id=?", auth.hashPassword(body.next), user.id);
    db.run("DELETE FROM auth_sessions WHERE user_id=? AND token_hash<>?", user.id, auth.sha256(token));
    return { ok: true };
  }, { auth: "user" });

  r.del("/api/me", ({ db, user, body, res }) => {
    if (!auth.verifyPassword(String(body.password || ""), user.pw_hash)) throw new HttpError(400, "bad_password", "비밀번호가 맞지 않습니다.");
    db.tx(() => {
      // 구독은 해지 처리, 결제 기록은 법정 보관을 위해 남기되 계정 연결은 끊습니다.
      db.run("UPDATE subscriptions SET status=CASE WHEN status IN ('active','past_due') THEN 'canceled' ELSE status END, cancel_at_period_end=1, updated_at=? WHERE user_id=?", Date.now(), user.id);
      db.run("UPDATE inquiries SET email='(탈퇴 회원)' WHERE user_id=?", user.id);
      db.run("DELETE FROM users WHERE id=?", user.id); // 세션·호흡 기록·이용량은 함께 삭제됨(ON DELETE CASCADE)
    });
    logEvent(db, null, "withdraw");
    clearSession(res);
    return { ok: true };
  }, { auth: "user" });

  /* ───────── 호흡 세션 (핵심 기능) ───────── */
  r.post("/api/sessions/start", ({ db, user, body }) => usage.startSession(db, user.id, body), { auth: "user" });

  r.post("/api/sessions/:id/finish", ({ db, user, params, body }) => {
    const out = usage.finishSession(db, user.id, int(params.id, 1, 1e12, 0), body);
    const ent = billing.entitlement(db, user.id);
    return { session: usage.publicSession(out.session), restored: !!out.restored, usage: usage.usageToday(db, user.id, ent.plan) };
  }, { auth: "user" });

  r.patch("/api/sessions/:id", ({ db, user, params, body }) => {
    const id = int(params.id, 1, 1e12, 0);
    const s = db.one("SELECT * FROM breath_sessions WHERE id=? AND user_id=?", id, user.id);
    if (!s) throw new HttpError(404, "not_found", "기록을 찾을 수 없습니다.");
    const f = v => (Number.isInteger(v) && v >= 1 && v <= 5 ? v : null);
    db.run("UPDATE breath_sessions SET feeling_after=COALESCE(?, feeling_after), feeling_before=COALESCE(?, feeling_before), note=? WHERE id=?",
      f(body.feelingAfter), f(body.feelingBefore), body.note === undefined ? s.note : str(body.note, 500), id);
    return { session: usage.publicSession(db.one("SELECT * FROM breath_sessions WHERE id=?", id)) };
  }, { auth: "user" });

  function historyWindow(db, user) {
    const ent = billing.entitlement(db, user.id);
    const days = usage.limitsFor(ent.plan).historyDays;
    return { since: days ? Date.now() - days * DAY : 0, days };
  }

  r.get("/api/sessions", ({ db, user, query }) => {
    const { since, days } = historyWindow(db, user);
    const q = str(query.get("q"), 50);
    const pattern = str(query.get("pattern"), 20);
    const before = int(query.get("before"), 0, 1e15, 0);
    const where = ["user_id=?", "status<>'started'", "status<>'aborted'", "started_at>=?"];
    const args = [user.id, since];
    if (pattern && config.patterns.includes(pattern)) { where.push("pattern=?"); args.push(pattern); }
    if (q) {
      const matchPatterns = Object.entries(PATTERN_NAMES).filter(([, n]) => n.includes(q)).map(([k]) => k);
      where.push(`(note LIKE ? ${matchPatterns.length ? `OR pattern IN (${matchPatterns.map(() => "?").join(",")})` : ""})`);
      args.push(`%${q}%`, ...matchPatterns);
    }
    if (before) { where.push("started_at<?"); args.push(before); }
    const rows = db.all(`SELECT * FROM breath_sessions WHERE ${where.join(" AND ")} ORDER BY started_at DESC LIMIT 31`, ...args);
    const hidden = days
      ? db.one("SELECT COUNT(*) n FROM breath_sessions WHERE user_id=? AND status IN ('completed','stopped') AND started_at<?", user.id, since).n
      : 0;
    return { items: rows.slice(0, 30).map(usage.publicSession), more: rows.length > 30, hiddenOlder: hidden, historyDays: days };
  }, { auth: "user" });

  r.get("/api/sessions/export.csv", ({ db, user, res }) => {
    const { since } = historyWindow(db, user);
    const rows = db.all("SELECT * FROM breath_sessions WHERE user_id=? AND status IN ('completed','stopped') AND started_at>=? ORDER BY started_at DESC", user.id, since);
    const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["날짜", "호흡법", "상태", "시간(초)", "호흡 수", "전 기분(1-5)", "후 기분(1-5)", "메모"].map(esc).join(",")];
    for (const s of rows) {
      lines.push([new Date(s.started_at).toISOString(), PATTERN_NAMES[s.pattern], s.status === "completed" ? "완료" : "중단",
        s.actual_sec, s.cycles, s.feeling_before, s.feeling_after, s.note].map(esc).join(","));
    }
    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="soomgyeol-records.csv"',
      "Cache-Control": "no-store",
    });
    res.end("﻿" + lines.join("\n"));
    return undefined;
  }, { auth: "user" });

  r.get("/api/sessions/:id", ({ db, user, params }) => {
    const s = db.one("SELECT * FROM breath_sessions WHERE id=? AND user_id=?", int(params.id, 1, 1e12, 0), user.id);
    if (!s) throw new HttpError(404, "not_found", "기록을 찾을 수 없습니다.");
    return { session: usage.publicSession(s) };
  }, { auth: "user" });

  r.del("/api/sessions/:id", ({ db, user, params }) => {
    const r2 = db.run("DELETE FROM breath_sessions WHERE id=? AND user_id=?", int(params.id, 1, 1e12, 0), user.id);
    if (!r2.changes) throw new HttpError(404, "not_found", "기록을 찾을 수 없습니다.");
    return { ok: true };
  }, { auth: "user" });

  r.get("/api/stats", ({ db, user }) => {
    const weekAgo = Date.now() - 7 * DAY;
    const w = db.one("SELECT COUNT(*) n, COALESCE(SUM(actual_sec),0) sec FROM breath_sessions WHERE user_id=? AND status IN ('completed','stopped') AND started_at>=?", user.id, weekAgo);
    const days = db.all("SELECT DISTINCT usage_day d FROM breath_sessions WHERE user_id=? AND status IN ('completed','stopped') ORDER BY d DESC LIMIT 400", user.id).map(x => x.d);
    let streak = 0;
    let cursor = usage.dayKey();
    const set = new Set(days);
    if (!set.has(cursor)) cursor = usage.dayKey(Date.now() - DAY);
    while (set.has(cursor)) { streak++; cursor = usage.dayKey(new Date(cursor + "T12:00:00+09:00").getTime() - DAY); }
    const total = db.one("SELECT COUNT(*) n, COALESCE(SUM(actual_sec),0) sec FROM breath_sessions WHERE user_id=? AND status IN ('completed','stopped')", user.id);
    return { week: { sessions: w.n, minutes: Math.round(w.sec / 60) }, streakDays: streak, total: { sessions: total.n, minutes: Math.round(total.sec / 60) } };
  }, { auth: "user" });

  /* ───────── 결제·구독 ───────── */
  r.get("/api/billing", ({ db, user }) => {
    billing.sweep(db);
    const payments = db.all("SELECT id,order_id,kind,cycle,amount,status,is_test,created_at FROM payments WHERE user_id=? ORDER BY id DESC LIMIT 50", user.id);
    return { entitlement: billing.entitlement(db, user.id), payments, mode: config.billing.mode };
  }, { auth: "user" });

  r.post("/api/billing/checkout", ({ db, user, body }) => billing.createCheckout(db, user.id, String(body.cycle || "")), { auth: "user" });

  r.post("/api/billing/test/complete", ({ db, user, body }) => {
    if (config.billing.mode !== "test") throw new HttpError(404, "not_found", "없는 경로입니다.");
    const out = billing.testComplete(db, user.id, String(body.orderId || ""), body.outcome === "success" ? "success" : "fail");
    // 테스트 도구: 같은 알림을 한 번 더 보내 중복 처리 확인
    if (body.duplicate && out.event) {
      const raw = JSON.stringify(out.event);
      out.duplicateResult = billing.receiveWebhook(db, raw, billing.sign(raw)).result;
    }
    return { result: out.result, duplicateResult: out.duplicateResult };
  }, { auth: "user" });

  r.get("/api/billing/order/:orderId", ({ db, user, params }) => {
    const p = db.one("SELECT order_id,cycle,amount,status,is_test FROM payments WHERE order_id=? AND user_id=?", params.orderId, user.id);
    if (!p) throw new HttpError(404, "not_found", "주문을 찾을 수 없습니다.");
    return { order: p, entitlement: billing.entitlement(db, user.id) };
  }, { auth: "user" });

  r.post("/api/billing/cancel", ({ db, user }) => ({ subscription: billing.cancel(db, user.id), entitlement: billing.entitlement(db, user.id) }), { auth: "user" });
  r.post("/api/billing/resume", ({ db, user }) => ({ subscription: billing.resume(db, user.id), entitlement: billing.entitlement(db, user.id) }), { auth: "user" });
  // 구매 복원/상태 새로고침: 서버 기준 이용권을 다시 계산해 돌려줍니다.
  r.post("/api/billing/sync", ({ db, user }) => { billing.sweep(db); return mePayload(db, user); }, { auth: "user" });

  r.post("/api/webhooks/billing", ({ db, raw, req }) => billing.receiveWebhook(db, raw, req.headers["x-sg-signature"]), { webhook: true });

  /* ───────── 고객 문의 ───────── */
  r.post("/api/inquiries", ({ db, user, body }) => {
    const subject = str(body.subject, 100), text = str(body.body, 2000);
    if (subject.length < 2 || text.length < 5) throw new HttpError(400, "bad_inquiry", "제목과 내용을 입력해 주세요.");
    const now = Date.now();
    const r2 = db.run("INSERT INTO inquiries(user_id,email,subject,body,created_at,updated_at) VALUES(?,?,?,?,?,?)", user.id, user.email, subject, text, now, now);
    return { id: Number(r2.lastInsertRowid) };
  }, { auth: "user" });

  r.get("/api/inquiries", ({ db, user }) => ({
    items: db.all("SELECT id,subject,body,status,answer,created_at,updated_at FROM inquiries WHERE user_id=? ORDER BY id DESC", user.id),
  }), { auth: "user" });

  registerAdmin(r);
}

/* ═════════ 관리자 (모든 경로 서버에서 role=admin 검증) ═════════ */
function registerAdmin(r) {
  const A = { auth: "admin" };

  r.get("/api/admin/overview", ({ db }) => {
    billing.sweep(db);
    const now = Date.now(), d7 = now - 7 * DAY, d30 = now - 30 * DAY;
    const c = (sql, ...a) => db.one(sql, ...a).n;
    const premiumUsers = db.all("SELECT id FROM users").filter(u => billing.entitlement(db, u.id).plan === "premium").length;
    const users = c("SELECT COUNT(*) n FROM users");
    const series = [];
    for (let i = 13; i >= 0; i--) {
      const day = usage.dayKey(now - i * DAY);
      const from = new Date(day + "T00:00:00+09:00").getTime(), to = from + DAY;
      series.push({
        day,
        signups: c("SELECT COUNT(*) n FROM events WHERE type='signup' AND created_at>=? AND created_at<?", from, to),
        sessions: c("SELECT COUNT(*) n FROM events WHERE type='session_complete' AND created_at>=? AND created_at<?", from, to),
      });
    }
    const rev = db.one("SELECT COALESCE(SUM(amount),0) s, COUNT(*) n, COALESCE(SUM(is_test),0) t FROM payments WHERE status IN ('paid','refunded') AND created_at>=?", d30);
    const refunds = db.one("SELECT COALESCE(SUM(amount),0) s, COUNT(*) n FROM payments WHERE status='refunded' AND updated_at>=?", d30);
    return {
      billingMode: config.billing.mode,
      users, signups7: c("SELECT COUNT(*) n FROM events WHERE type='signup' AND created_at>=?", d7),
      activeUsers7: c("SELECT COUNT(DISTINCT user_id) n FROM breath_sessions WHERE started_at>=?", d7),
      sessions7: c("SELECT COUNT(*) n FROM breath_sessions WHERE status='completed' AND started_at>=?", d7),
      premiumUsers, conversion: users ? premiumUsers / users : 0,
      checkouts30: c("SELECT COUNT(*) n FROM events WHERE type='checkout_start' AND created_at>=?", d30),
      revenue30: rev.s - refunds.s, grossRevenue30: rev.s, paidCount30: rev.n, testPayments30: rev.t,
      refunds30: refunds.s, refundCount30: refunds.n,
      errors7: c("SELECT COUNT(*) n FROM error_log WHERE created_at>=?", d7),
      openInquiries: c("SELECT COUNT(*) n FROM inquiries WHERE status='open'"),
      series,
    };
  }, A);

  r.get("/api/admin/users", ({ db, query }) => {
    const q = str(query.get("q"), 80);
    const rows = q
      ? db.all("SELECT id,email,name,role,status,created_at FROM users WHERE email LIKE ? OR name LIKE ? ORDER BY id DESC LIMIT 100", `%${q}%`, `%${q}%`)
      : db.all("SELECT id,email,name,role,status,created_at FROM users ORDER BY id DESC LIMIT 100");
    return {
      items: rows.map(u => {
        const ent = billing.entitlement(db, u.id);
        return { ...u, plan: ent.plan, planSource: ent.source, usedToday: usage.usageToday(db, u.id, ent.plan).used };
      }),
    };
  }, A);

  r.get("/api/admin/users/:id", ({ db, params }) => {
    const u = db.one("SELECT id,email,name,role,status,created_at FROM users WHERE id=?", int(params.id, 1, 1e12, 0));
    if (!u) throw new HttpError(404, "not_found", "회원을 찾을 수 없습니다.");
    const ent = billing.entitlement(db, u.id);
    return {
      user: u, entitlement: ent, usage: usage.usageToday(db, u.id, ent.plan),
      grants: db.all("SELECT * FROM grants WHERE user_id=? ORDER BY id DESC", u.id),
      subscriptions: db.all("SELECT * FROM subscriptions WHERE user_id=? ORDER BY id DESC", u.id),
      payments: db.all("SELECT * FROM payments WHERE user_id=? ORDER BY id DESC", u.id),
      // 개인 메모 내용은 관리자 화면에 노출하지 않습니다.
      sessions: db.all("SELECT id,pattern,status,actual_sec,started_at FROM breath_sessions WHERE user_id=? ORDER BY id DESC LIMIT 20", u.id),
    };
  }, A);

  r.post("/api/admin/users/:id/grant", ({ db, user, params, body }) => {
    const uid = int(params.id, 1, 1e12, 0);
    if (!db.one("SELECT id FROM users WHERE id=?", uid)) throw new HttpError(404, "not_found", "회원을 찾을 수 없습니다.");
    const days = int(body.days, 1, 3650, 0);
    if (!days) throw new HttpError(400, "bad_days", "기간(일)을 입력해 주세요.");
    const reason = needReason(body), now = Date.now();
    const r2 = db.run("INSERT INTO grants(user_id,plan,starts_at,ends_at,reason,admin_id,created_at) VALUES(?,?,?,?,?,?,?)",
      uid, "premium", now, now + days * DAY, reason, user.id, now);
    audit(db, user.id, "grant_premium", "user", uid, { days, grantId: Number(r2.lastInsertRowid) }, reason);
    return { ok: true };
  }, A);

  r.post("/api/admin/grants/:id/revoke", ({ db, user, params, body }) => {
    const g = db.one("SELECT * FROM grants WHERE id=?", int(params.id, 1, 1e12, 0));
    if (!g) throw new HttpError(404, "not_found", "이용권을 찾을 수 없습니다.");
    const reason = needReason(body);
    db.run("UPDATE grants SET revoked_at=? WHERE id=?", Date.now(), g.id);
    audit(db, user.id, "revoke_grant", "user", g.user_id, { grantId: g.id }, reason);
    return { ok: true };
  }, A);

  r.post("/api/admin/users/:id/usage-reset", ({ db, user, params, body }) => {
    const uid = int(params.id, 1, 1e12, 0), reason = needReason(body);
    const day = usage.dayKey();
    const before = db.one("SELECT used FROM usage_daily WHERE user_id=? AND day=?", uid, day);
    db.run("UPDATE usage_daily SET used=0 WHERE user_id=? AND day=?", uid, day);
    audit(db, user.id, "reset_usage", "user", uid, { day, before: before ? before.used : 0 }, reason);
    return { ok: true };
  }, A);

  r.post("/api/admin/users/:id/status", ({ db, user, params, body }) => {
    const uid = int(params.id, 1, 1e12, 0), reason = needReason(body);
    const status = body.status === "suspended" ? "suspended" : "active";
    if (uid === user.id) throw new HttpError(400, "self", "자기 계정은 바꿀 수 없습니다.");
    db.run("UPDATE users SET status=? WHERE id=?", status, uid);
    if (status === "suspended") db.run("DELETE FROM auth_sessions WHERE user_id=?", uid);
    audit(db, user.id, "set_status", "user", uid, { status }, reason);
    return { ok: true };
  }, A);

  r.get("/api/admin/payments", ({ db }) => ({
    payments: db.all(`SELECT p.*, u.email FROM payments p LEFT JOIN users u ON u.id=p.user_id ORDER BY p.id DESC LIMIT 200`),
    subscriptions: db.all(`SELECT s.*, u.email FROM subscriptions s LEFT JOIN users u ON u.id=s.user_id ORDER BY s.id DESC LIMIT 200`),
    webhooks: db.all("SELECT event_id,type,occurred_at,received_at,result FROM webhook_events ORDER BY received_at DESC LIMIT 100"),
  }), A);

  r.post("/api/admin/payments/:id/refund", ({ db, user, params, body }) => {
    const id = int(params.id, 1, 1e12, 0), reason = needReason(body);
    const out = billing.refund(db, id);
    audit(db, user.id, "refund", "payment", id, { result: out.result }, reason);
    return { result: out.result };
  }, A);

  r.post("/api/admin/subscriptions/:id/simulate", ({ db, user, params, body }) => {
    const id = int(params.id, 1, 1e12, 0), reason = needReason(body);
    const out = billing.adminSimulate(db, id, String(body.action || ""));
    audit(db, user.id, `simulate_${body.action}`, "subscription", id, { result: out.result }, reason);
    return { result: out.result };
  }, A);

  r.get("/api/admin/usage", ({ db }) => {
    const d30 = Date.now() - 30 * DAY;
    return {
      byPattern: db.all(`SELECT pattern, COUNT(*) sessions, SUM(status='completed') completed, COALESCE(SUM(actual_sec),0) sec
                         FROM breath_sessions WHERE started_at>=? GROUP BY pattern ORDER BY sessions DESC`, d30),
      limitHits: db.all(`SELECT u.email, d.day, d.used FROM usage_daily d JOIN users u ON u.id=d.user_id
                         WHERE d.day>=? AND d.used>=3 ORDER BY d.day DESC, d.used DESC LIMIT 50`, usage.dayKey(d30)),
      heavy: db.all(`SELECT u.email, d.day, d.used FROM usage_daily d JOIN users u ON u.id=d.user_id
                     WHERE d.used>=? ORDER BY d.used DESC LIMIT 20`, Math.floor(config.plans.premium.dailySessions * 0.8)),
      cost: { perSession: 0, note: "호흡 안내·음성·음악은 모두 사용자 기기에서 실행돼 세션당 외부 처리 비용이 없습니다. 서버·DB·결제 수수료만 발생합니다." },
    };
  }, A);

  r.get("/api/admin/content", ({ db }) => ({ items: db.all("SELECT * FROM content ORDER BY kind, sort, id DESC") }), A);
  r.post("/api/admin/content", ({ db, user, body }) => {
    const kind = body.kind === "notice" ? "notice" : "faq";
    const title = str(body.title, 200), text = str(body.body, 5000);
    if (!title || !text) throw new HttpError(400, "bad_content", "제목과 내용을 입력해 주세요.");
    const now = Date.now();
    let id = int(body.id, 0, 1e12, 0);
    if (id) {
      db.run("UPDATE content SET kind=?, title=?, body=?, published=?, sort=?, updated_at=? WHERE id=?", kind, title, text, body.published ? 1 : 0, int(body.sort, -999, 999, 0), now, id);
    } else {
      id = Number(db.run("INSERT INTO content(kind,title,body,published,sort,created_at,updated_at) VALUES(?,?,?,?,?,?,?)", kind, title, text, body.published ? 1 : 0, int(body.sort, -999, 999, 0), now, now).lastInsertRowid);
    }
    audit(db, user.id, "save_content", "content", id, { kind, title }, null);
    return { id };
  }, A);
  r.del("/api/admin/content/:id", ({ db, user, params }) => {
    const id = int(params.id, 1, 1e12, 0);
    db.run("DELETE FROM content WHERE id=?", id);
    audit(db, user.id, "delete_content", "content", id, null, null);
    return { ok: true };
  }, A);

  r.get("/api/admin/inquiries", ({ db }) => ({ items: db.all("SELECT * FROM inquiries ORDER BY status='open' DESC, id DESC LIMIT 200") }), A);
  r.post("/api/admin/inquiries/:id", ({ db, user, params, body }) => {
    const id = int(params.id, 1, 1e12, 0);
    const q = db.one("SELECT * FROM inquiries WHERE id=?", id);
    if (!q) throw new HttpError(404, "not_found", "문의를 찾을 수 없습니다.");
    const status = ["open", "answered", "closed"].includes(body.status) ? body.status : q.status;
    const answer = body.answer === undefined ? q.answer : str(body.answer, 3000);
    db.run("UPDATE inquiries SET status=?, answer=?, updated_at=? WHERE id=?", status, answer, Date.now(), id);
    if (answer && answer !== q.answer && q.user_id) {
      db.run("INSERT INTO outbox(to_email,subject,body,created_at) VALUES(?,?,?,?)", q.email, `[숨결] 문의에 답변드렸어요: ${q.subject}`, answer, Date.now());
    }
    audit(db, user.id, "update_inquiry", "inquiry", id, { status }, null);
    return { ok: true };
  }, A);

  r.get("/api/admin/audit", ({ db }) => ({
    items: db.all("SELECT a.*, u.email admin_email FROM audit_log a LEFT JOIN users u ON u.id=a.admin_id ORDER BY a.id DESC LIMIT 200"),
  }), A);
  r.get("/api/admin/errors", ({ db }) => ({ items: db.all("SELECT * FROM error_log ORDER BY id DESC LIMIT 200") }), A);
  r.get("/api/admin/outbox", ({ db }) => ({ items: db.all("SELECT * FROM outbox ORDER BY id DESC LIMIT 100") }), A);
}

module.exports = { register, PATTERN_NAMES, publicConfig };
