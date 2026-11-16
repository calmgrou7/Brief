'use strict';
const { db } = require('./db');
const { token, parseCookies } = require('./util');

const COOKIE = 'cp_admin';
const TTL = 1000 * 60 * 60 * 12; // 12시간

function cookieOpts(req) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return `Path=${req.app.locals.base || '/'}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

function createSession(req, res, adminId) {
  const t = token();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  db.prepare('INSERT INTO sessions (token, admin_id, csrf, expires_at) VALUES (?, ?, ?, ?)').run(t, adminId, token(16), Date.now() + TTL);
  res.setHeader('Set-Cookie', `${COOKIE}=${t}; Max-Age=${TTL / 1000}; ${cookieOpts(req)}`);
}
function destroySession(req, res) {
  const t = parseCookies(req.headers.cookie)[COOKIE];
  if (t) db.prepare('DELETE FROM sessions WHERE token = ?').run(t);
  res.setHeader('Set-Cookie', `${COOKIE}=; Max-Age=0; ${cookieOpts(req)}`);
}
function loadSession(req, _res, next) {
  const t = parseCookies(req.headers.cookie)[COOKIE];
  if (t) {
    const s = db.prepare('SELECT s.csrf, s.expires_at, a.id, a.username FROM sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token = ?').get(t);
    if (s && s.expires_at > Date.now()) req.admin = { id: s.id, username: s.username, csrf: s.csrf };
  }
  next();
}
function requireAdmin(req, res, next) {
  if (!req.admin) return res.redirect(`${req.app.locals.base}/admin/login`);
  res.locals.admin = req.admin;
  res.locals.csrf = req.admin.csrf;
  if (req.method === 'POST' && req.body?._csrf !== req.admin.csrf) {
    return res.status(403).send('요청이 만료되었습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
  }
  next();
}

module.exports = { createSession, destroySession, loadSession, requireAdmin };
