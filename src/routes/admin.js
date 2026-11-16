'use strict';
const express = require('express');
const { db, getSettings, setSetting, DEFAULT_SETTINGS } = require('../db');
const { clip, rateLimit, hashPassword, verifyPassword, excerpt } = require('../util');
const { createSession, destroySession, requireAdmin } = require('../auth');
const { BOARDS } = require('./board');

const router = express.Router();
const STATUSES = ['신규', '상담중', '서류접수', '심사중', '실행완료', '보류', '종결'];
const LEAD_FIELDS = [
  ['clinic_name', '병원명'], ['clinic_type', '업종'], ['contact_name', '담당자'], ['phone', '연락처'], ['email', '이메일'], ['region', '지역'],
  ['annual_revenue', '연매출'], ['net_income', '당기순이익'], ['card_monthly', '월평균 카드매출'], ['nhis_monthly', '월평균 공단매출'],
  ['tax_bracket', '종소세 구간'], ['need_amount', '필요 자금'], ['purposes', '자금 사용처'], ['purpose_detail', '사용처 상세'],
  ['need_by', '필요 시점'], ['equipment_5y', '5년 이내 의료장비'], ['kcb', 'KCB'], ['nice', 'NICE'], ['contact_time', '통화 가능 시간'],
];

router.get('/login', (req, res) => {
  if (req.admin) return res.redirect(`${req.app.locals.base}/admin`);
  res.render('admin/login', { title: '관리자 로그인', error: '' });
});
router.post('/login', (req, res) => {
  if (!rateLimit(`login:${req.ip}`, 8, 15 * 60 * 1000)) {
    return res.status(429).render('admin/login', { title: '관리자 로그인', error: '시도가 너무 많습니다. 15분 뒤 다시 해 주세요.' });
  }
  const a = db.prepare('SELECT * FROM admins WHERE username = ?').get(clip(req.body?.username, 40));
  if (!a || !verifyPassword(req.body?.password || '', a.pass_hash)) {
    return res.status(401).render('admin/login', { title: '관리자 로그인', error: '아이디 또는 비밀번호가 맞지 않습니다.' });
  }
  createSession(req, res, a.id);
  res.redirect(`${req.app.locals.base}/admin`);
});
router.post('/logout', (req, res) => { destroySession(req, res); res.redirect(`${req.app.locals.base}/admin/login`); });

router.use(requireAdmin);
router.use((req, res, next) => {
  res.locals.STATUSES = STATUSES;
  res.locals.BOARDS = BOARDS;
  res.locals.flash = req.query.ok ? String(req.query.ok) : '';
  next();
});

// ── 대시보드
router.get('/', (req, res) => {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of db.prepare('SELECT status, COUNT(*) n FROM leads GROUP BY status').all()) counts[r.status] = r.n;
  const week = db.prepare("SELECT COUNT(*) n FROM leads WHERE created_at >= datetime('now','localtime','-7 days')").get().n;
  const recent = db.prepare('SELECT id, created_at, status, clinic_name, clinic_type, contact_name, phone, need_amount, need_by FROM leads ORDER BY id DESC LIMIT 8').all();
  const openQna = db.prepare("SELECT id, title, author, created_at FROM posts WHERE board = 'qna' AND (answer IS NULL OR answer = '') ORDER BY id DESC LIMIT 6").all();
  res.render('admin/dashboard', { title: '대시보드', counts, week, recent, openQna });
});

// ── 상담 신청
function leadQuery(q) {
  const where = [];
  const args = [];
  if (q.status && STATUSES.includes(q.status)) { where.push('status = ?'); args.push(q.status); }
  if (q.q) { where.push('(clinic_name LIKE ? OR contact_name LIKE ? OR phone LIKE ? OR region LIKE ?)'); const k = `%${clip(q.q, 40)}%`; args.push(k, k, k, k); }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', args };
}
router.get('/leads', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const { sql, args } = leadQuery(req.query);
  const total = db.prepare(`SELECT COUNT(*) n FROM leads ${sql}`).get(...args).n;
  const leads = db.prepare(`SELECT * FROM leads ${sql} ORDER BY id DESC LIMIT 30 OFFSET ?`).all(...args, (page - 1) * 30);
  res.render('admin/leads', { title: '상담 신청', leads, total, page, pages: Math.max(1, Math.ceil(total / 30)), q: clip(req.query.q, 40), status: req.query.status || '' });
});
router.get('/leads.csv', (req, res) => {
  const { sql, args } = leadQuery(req.query);
  const rows = db.prepare(`SELECT * FROM leads ${sql} ORDER BY id DESC`).all(...args);
  const cols = [['id', '번호'], ['created_at', '접수일시'], ['status', '상태'], ...LEAD_FIELDS];
  const cell = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = `'${s}`; // 엑셀 수식 주입 방지
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = '﻿' + [cols.map((c) => cell(c[1])).join(','), ...rows.map((r) => cols.map((c) => cell(r[c[0]])).join(','))].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});
router.get('/leads/:id(\\d+)', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.redirect(`${req.app.locals.base}/admin/leads`);
  const notes = db.prepare('SELECT * FROM lead_notes WHERE lead_id = ? ORDER BY id DESC').all(lead.id);
  res.render('admin/lead', { title: `${lead.clinic_name} 상담`, lead, notes, LEAD_FIELDS });
});
router.post('/leads/:id(\\d+)/status', (req, res) => {
  const status = req.body.status;
  if (STATUSES.includes(status)) {
    const prev = db.prepare('SELECT status FROM leads WHERE id = ?').get(req.params.id);
    db.prepare("UPDATE leads SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(status, req.params.id);
    if (prev && prev.status !== status) db.prepare('INSERT INTO lead_notes (lead_id, body) VALUES (?, ?)').run(req.params.id, `상태 변경: ${prev.status} → ${status}`);
  }
  res.redirect(`${req.app.locals.base}/admin/leads/${req.params.id}?ok=${encodeURIComponent('상태를 바꿨습니다')}`);
});
router.post('/leads/:id(\\d+)/note', (req, res) => {
  const body = clip(req.body.body, 3000);
  if (body) {
    db.prepare('INSERT INTO lead_notes (lead_id, body) VALUES (?, ?)').run(req.params.id, body);
    db.prepare("UPDATE leads SET updated_at = datetime('now','localtime') WHERE id = ?").run(req.params.id);
  }
  res.redirect(`${req.app.locals.base}/admin/leads/${req.params.id}`);
});
router.post('/leads/:id(\\d+)/delete', (req, res) => {
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.redirect(`${req.app.locals.base}/admin/leads?ok=${encodeURIComponent('삭제했습니다')}`);
});

// ── 게시글
router.get('/posts', (req, res) => {
  const board = BOARDS[req.query.board] ? req.query.board : '';
  const posts = db.prepare(`SELECT id, board, title, author, is_secret, is_pinned, published, answer, views, created_at FROM posts ${board ? 'WHERE board = ?' : ''} ORDER BY id DESC LIMIT 200`).all(...(board ? [board] : []));
  res.render('admin/posts', { title: '게시글', posts, boardFilter: board });
});
router.get('/posts/new', (req, res) => {
  const board = BOARDS[req.query.board] && req.query.board !== 'qna' ? req.query.board : 'column';
  res.render('admin/post-edit', { title: '새 글', post: { board, title: '', body: '', author: getSettings().company_name, is_pinned: 0, published: 1 } });
});
router.get('/posts/:id(\\d+)', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.redirect(`${req.app.locals.base}/admin/posts`);
  res.render('admin/post-edit', { title: '글 수정', post });
});
router.post('/posts/save', (req, res) => {
  const b = req.body;
  const id = parseInt(b.id, 10) || 0;
  const existing = id ? db.prepare('SELECT * FROM posts WHERE id = ?').get(id) : null;
  const board = existing ? existing.board : (BOARDS[b.board] ? b.board : 'column');
  const data = {
    title: clip(b.title, 160), body: clip(b.body, 50000), author: clip(b.author, 40) || '채움파트너스',
    is_pinned: b.is_pinned === '1' ? 1 : 0, published: b.published === '1' ? 1 : 0,
  };
  if (!data.title || !data.body) {
    return res.status(422).render('admin/post-edit', { title: id ? '글 수정' : '새 글', post: { ...(existing || {}), ...data, board, id }, error: '제목과 본문을 채워 주세요.' });
  }
  let postId = id;
  if (existing) {
    db.prepare("UPDATE posts SET title = ?, body = ?, author = ?, is_pinned = ?, published = ?, updated_at = datetime('now','localtime') WHERE id = ?")
      .run(data.title, data.body, data.author, data.is_pinned, data.published, id);
    if (board === 'qna' && typeof b.answer === 'string') {
      const answer = clip(b.answer, 20000);
      db.prepare("UPDATE posts SET answer = ?, answered_at = CASE WHEN ? = '' THEN NULL ELSE datetime('now','localtime') END WHERE id = ?").run(answer, answer, id);
    }
  } else {
    postId = db.prepare('INSERT INTO posts (board, title, body, author, is_pinned, published) VALUES (?, ?, ?, ?, ?, ?)')
      .run(board, data.title, data.body, data.author, data.is_pinned, data.published).lastInsertRowid;
  }
  res.redirect(`${req.app.locals.base}/admin/posts/${postId}?ok=${encodeURIComponent('저장했습니다')}`);
});
router.post('/posts/:id(\\d+)/delete', (req, res) => {
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.redirect(`${req.app.locals.base}/admin/posts?ok=${encodeURIComponent('삭제했습니다')}`);
});

// ── 설정
const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);
router.get('/settings', (req, res) => res.render('admin/settings', { title: '사이트 설정', error: '' }));
router.post('/settings', (req, res) => {
  for (const k of SETTING_KEYS) if (typeof req.body[k] === 'string') setSetting(k, clip(req.body[k], 500));
  res.redirect(`${req.app.locals.base}/admin/settings?ok=${encodeURIComponent('저장했습니다')}`);
});
router.post('/password', (req, res) => {
  const a = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
  const { current, next, confirm } = req.body;
  let error = '';
  if (!verifyPassword(current || '', a.pass_hash)) error = '현재 비밀번호가 맞지 않습니다.';
  else if (!next || next.length < 8) error = '새 비밀번호는 8자 이상으로 해 주세요.';
  else if (next !== confirm) error = '새 비밀번호 두 칸이 다릅니다.';
  if (error) return res.status(422).render('admin/settings', { title: '사이트 설정', error });
  db.prepare('UPDATE admins SET pass_hash = ? WHERE id = ?').run(hashPassword(next), a.id);
  res.redirect(`${req.app.locals.base}/admin/settings?ok=${encodeURIComponent('비밀번호를 바꿨습니다')}`);
});

module.exports = router;
module.exports.excerpt = excerpt;
