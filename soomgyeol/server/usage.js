"use strict";
/*
 * 핵심 기능(호흡 세션)과 이용량.
 *  - 세션 시작 시 서버에서 1회 차감. 한 문장 UPDATE ... WHERE used < limit 로 동시 요청에도 한도를 넘지 않습니다.
 *  - 30초 안에 그만두면 차감을 되돌립니다. 그 뒤로는 끝까지 하지 않아도 1회.
 *  - 브라우저를 닫아 끝을 알리지 못한 세션은 차감된 채로 남습니다.
 */
const config = require("./config");
const billing = require("./billing");
const { HttpError } = require("./http");

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone, year: "numeric", month: "2-digit", day: "2-digit" });
const dayKey = (ts = Date.now()) => dayFmt.format(new Date(ts));

function limitsFor(plan) { return config.plans[plan] || config.plans.free; }

function usageToday(db, userId, plan) {
  const day = dayKey();
  const row = db.one("SELECT used FROM usage_daily WHERE user_id=? AND day=?", userId, day);
  const limit = limitsFor(plan).dailySessions;
  const used = row ? row.used : 0;
  return { day, used, limit, remaining: Math.max(0, limit - used) };
}

function startSession(db, userId, input) {
  const ent = billing.entitlement(db, userId);
  const lim = limitsFor(ent.plan);
  const pattern = String(input.pattern || "");
  const minutes = Number(input.minutes);
  if (!config.patterns.includes(pattern)) throw new HttpError(400, "bad_pattern", "호흡법을 선택해 주세요.");
  if (!lim.patterns.includes(pattern)) {
    throw new HttpError(402, "pattern_locked", "프리미엄에서 이용할 수 있는 호흡법입니다.", { plan: ent.plan });
  }
  if (!Number.isFinite(minutes) || minutes <= 0) throw new HttpError(400, "bad_minutes", "세션 길이를 선택해 주세요.");
  if (minutes > lim.maxMinutes) {
    throw new HttpError(402, "minutes_locked", `${lim.label} 요금제는 한 번에 ${lim.maxMinutes}분까지 이용할 수 있습니다.`, { plan: ent.plan });
  }
  const plannedSec = Math.max(1, Math.min(lim.maxMinutes * 60 + 120, Math.round(Number(input.plannedSec) || minutes * 60)));
  const mood = typeof input.mood === "string" ? input.mood.slice(0, 20) : null;
  const before = Number.isInteger(input.feelingBefore) && input.feelingBefore >= 1 && input.feelingBefore <= 5 ? input.feelingBefore : null;
  const day = dayKey(), now = Date.now();

  return db.tx(() => {
    db.run("INSERT OR IGNORE INTO usage_daily(user_id,day,used) VALUES(?,?,0)", userId, day);
    const r = db.run("UPDATE usage_daily SET used=used+1 WHERE user_id=? AND day=? AND used<?", userId, day, lim.dailySessions);
    if (r.changes === 0) {
      throw new HttpError(429, "daily_limit", `오늘 이용 가능한 ${lim.dailySessions}회를 모두 사용했어요. 내일 자정에 다시 채워집니다.`, { plan: ent.plan });
    }
    const ins = db.run(
      `INSERT INTO breath_sessions(user_id,pattern,mood,planned_sec,status,counted,usage_day,feeling_before,started_at)
       VALUES(?,?,?,?,?,1,?,?,?)`, userId, pattern, mood, plannedSec, "started", day, before, now);
    db.run("INSERT INTO events(user_id,type,created_at) VALUES(?,?,?)", userId, "session_start", now);
    return { id: Number(ins.lastInsertRowid), plannedSec, usage: usageToday(db, userId, ent.plan) };
  });
}

function finishSession(db, userId, id, input) {
  const now = Date.now();
  return db.tx(() => {
    const s = db.one("SELECT * FROM breath_sessions WHERE id=? AND user_id=?", id, userId);
    if (!s) throw new HttpError(404, "not_found", "기록을 찾을 수 없습니다.");
    if (s.status !== "started") return { session: s, alreadyFinished: true };
    const wall = Math.ceil((now - s.started_at) / 1000) + 5;
    const actual = Math.max(0, Math.min(Number(input.actualSec) || 0, wall, s.planned_sec + 60));
    const cycles = Math.max(0, Math.min(1000, Number.parseInt(input.cycles, 10) || 0));
    let status = input.completed ? "completed" : "stopped";
    let counted = 1;
    if (!input.completed && actual < config.usage.restoreIfUnderSec) {
      status = "aborted"; counted = 0;
      db.run("UPDATE usage_daily SET used=MAX(0, used-1) WHERE user_id=? AND day=?", userId, s.usage_day);
    }
    db.run("UPDATE breath_sessions SET status=?, counted=?, actual_sec=?, cycles=?, ended_at=? WHERE id=?",
      status, counted, actual, cycles, now, id);
    if (status === "completed") db.run("INSERT INTO events(user_id,type,created_at) VALUES(?,?,?)", userId, "session_complete", now);
    return { session: db.one("SELECT * FROM breath_sessions WHERE id=?", id), restored: counted === 0 };
  });
}

function publicSession(s) {
  return {
    id: s.id, pattern: s.pattern, mood: s.mood, status: s.status,
    plannedSec: s.planned_sec, actualSec: s.actual_sec, cycles: s.cycles,
    feelingBefore: s.feeling_before, feelingAfter: s.feeling_after, note: s.note || "",
    startedAt: s.started_at, endedAt: s.ended_at,
  };
}

module.exports = { dayKey, limitsFor, usageToday, startSession, finishSession, publicSession };
