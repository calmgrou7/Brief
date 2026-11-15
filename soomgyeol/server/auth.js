"use strict";
const crypto = require("node:crypto");
const config = require("./config");

const DAY = 86400000;

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyPassword(pw, stored) {
  const [alg, saltHex, hashHex] = String(stored).split("$");
  if (alg !== "scrypt" || !saltHex || !hashHex) return false;
  const hash = crypto.scryptSync(pw, Buffer.from(saltHex, "hex"), 64, { N: 16384, r: 8, p: 1 });
  const want = Buffer.from(hashHex, "hex");
  return want.length === hash.length && crypto.timingSafeEqual(want, hash);
}

const sha256 = s => crypto.createHash("sha256").update(s).digest("hex");
const token = (n = 32) => crypto.randomBytes(n).toString("base64url");

function createSession(db, userId) {
  const t = token();
  const now = Date.now();
  db.run("INSERT INTO auth_sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)",
    sha256(t), userId, now, now + config.auth.sessionDays * DAY);
  return t;
}

function userFromToken(db, t) {
  if (!t) return null;
  const row = db.one(
    `SELECT u.* FROM auth_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`, sha256(t), Date.now());
  if (!row || row.status !== "active") return null;
  return row;
}

function destroySession(db, t) {
  if (t) db.run("DELETE FROM auth_sessions WHERE token_hash=?", sha256(t));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function normalizeEmail(e) { return String(e || "").trim().toLowerCase(); }
function validEmail(e) { return EMAIL_RE.test(e) && e.length <= 254; }
function validPassword(p) { return typeof p === "string" && p.length >= 8 && p.length <= 200; }

/* 간단한 로그인 시도 제한: 15분에 10회 */
const attempts = new Map();
function rateLimited(key, max = 10, windowMs = 15 * 60000) {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter(t => now - t < windowMs);
  list.push(now);
  attempts.set(key, list);
  return list.length > max;
}

function sixDigit() { return String(crypto.randomInt(0, 1e6)).padStart(6, "0"); }

module.exports = {
  hashPassword, verifyPassword, sha256, token, createSession, userFromToken, destroySession,
  normalizeEmail, validEmail, validPassword, rateLimited, sixDigit,
};
