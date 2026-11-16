'use strict';
const crypto = require('node:crypto');

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function verifyPassword(pw, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, salt, hash] = stored.split('$');
  const test = crypto.scryptSync(String(pw), salt, 64);
  const ref = Buffer.from(hash, 'hex');
  return ref.length === test.length && crypto.timingSafeEqual(ref, test);
}
const token = (n = 32) => crypto.randomBytes(n).toString('hex');

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { out[k] = part.slice(i + 1).trim(); }
  }
  return out;
}

// 시간창 기반 요청 제한 (메모리)
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key) || { n: 0, reset: now + windowMs };
  if (now > b.reset) { b.n = 0; b.reset = now + windowMs; }
  b.n += 1;
  buckets.set(key, b);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
  return b.n <= max;
}

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 글 본문 서식: 먼저 전부 이스케이프한 뒤 몇 가지 표기만 태그로 바꾼다.
// ## 소제목 / - 목록 / **굵게** / 빈 줄로 문단
function formatBody(src) {
  const lines = escapeHtml(src).replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let para = [];
  let list = null;
  const inline = (t) => t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const flushPara = () => { if (para.length) { html.push(`<p>${inline(para.join('<br>'))}</p>`); para = []; } };
  const flushList = () => { if (list) { html.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`); list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^##\s+/.test(line)) { flushPara(); flushList(); html.push(`<h3>${inline(line.replace(/^##\s+/, ''))}</h3>`); continue; }
    if (/^-\s+/.test(line)) { flushPara(); (list ||= []).push(line.replace(/^-\s+/, '')); continue; }
    if (!line.trim()) { flushPara(); flushList(); continue; }
    flushList();
    para.push(line);
  }
  flushPara(); flushList();
  return html.join('\n');
}

const clip = (s, n) => String(s ?? '').trim().slice(0, n);
const excerpt = (s, n = 90) => {
  const t = String(s ?? '').replace(/^##\s+/gm, '').replace(/\*\*/g, '').replace(/^-\s+/gm, '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
};

async function notifyWebhook(url, payload) {
  if (!url || !/^https:\/\//.test(url)) return;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
    clearTimeout(t);
  } catch (e) {
    console.warn('[webhook] 전송 실패:', e.message);
  }
}

module.exports = { hashPassword, verifyPassword, token, parseCookies, rateLimit, escapeHtml, formatBody, clip, excerpt, notifyWebhook };
