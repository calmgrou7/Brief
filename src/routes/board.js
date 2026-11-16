'use strict';
const express = require('express');
const { db, getSettings } = require('../db');
const crypto = require('node:crypto');
const { clip, rateLimit, hashPassword, verifyPassword, formatBody, excerpt, notifyWebhook, token } = require('../util');

// 방금 쓴 비밀글을 작성자에게 한 번 보여 주기 위한 서명값
function secretKey() {
  let row = db.prepare("SELECT value FROM settings WHERE key = 'app_secret'").get();
  if (!row) { db.prepare("INSERT INTO settings (key, value) VALUES ('app_secret', ?)").run(token()); row = db.prepare("SELECT value FROM settings WHERE key = 'app_secret'").get(); }
  return row.value;
}
const writtenSig = (id) => crypto.createHmac('sha256', secretKey()).update(`written:${id}`).digest('hex').slice(0, 20);

const router = express.Router();

const BOARDS = {
  notice: { name: '공지사항', line: '상담 일정과 운영 안내를 올립니다.', publicWrite: false },
  column: { name: '자금 칼럼', line: '원장님들이 실제로 물어보신 내용을 정리해 둡니다.', publicWrite: false },
  qna: { name: '상담 문의', line: '전화가 부담스러우시면 여기에 남겨 주세요. 비밀글로 쓰시면 담당자만 봅니다.', publicWrite: true },
};
const PER_PAGE = 12;

router.param('board', (req, res, next, board) => {
  if (!BOARDS[board]) return res.status(404).render('error', { title: '없는 게시판입니다', message: '주소를 확인해 주세요.' });
  req.board = board;
  res.locals.board = board;
  res.locals.boardInfo = BOARDS[board];
  res.locals.BOARDS = BOARDS;
  next();
});

router.get('/', (req, res) => res.redirect(`${req.app.locals.base}/board/column`));

router.get('/:board', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const q = clip(req.query.q, 50);
  const where = ['board = ?', 'published = 1'];
  const args = [req.board];
  if (q) { where.push('(title LIKE ? OR body LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  const total = db.prepare(`SELECT COUNT(*) n FROM posts WHERE ${where.join(' AND ')}`).get(...args).n;
  const posts = db.prepare(`SELECT id, title, body, author, is_secret, is_pinned, answer, views, created_at FROM posts WHERE ${where.join(' AND ')} ORDER BY is_pinned DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...args, PER_PAGE, (page - 1) * PER_PAGE)
    .map((p) => ({ ...p, excerpt: p.is_secret ? '' : excerpt(p.body, 80) }));
  res.render('board/list', { title: BOARDS[req.board].name, posts, page, pages: Math.max(1, Math.ceil(total / PER_PAGE)), total, q });
});

router.get('/:board/write', (req, res) => {
  if (!BOARDS[req.board].publicWrite) return res.redirect(`${req.app.locals.base}/board/${req.board}`);
  res.render('board/write', { title: '문의 남기기', form: {}, errors: {} });
});

router.post('/:board/write', async (req, res) => {
  if (!BOARDS[req.board].publicWrite) return res.redirect(`${req.app.locals.base}/board/${req.board}`);
  const b = req.body || {};
  if (b.website) return res.redirect(`${req.app.locals.base}/board/${req.board}`);
  if (!rateLimit(`qna:${req.ip}`, 5, 10 * 60 * 1000)) {
    return res.status(429).render('error', { title: '글쓰기가 너무 잦습니다', message: '10분 뒤 다시 시도해 주세요.' });
  }
  const form = { author: clip(b.author, 30), title: clip(b.title, 120), body: clip(b.body, 5000), is_secret: b.is_secret === '1' ? 1 : 0 };
  const errors = {};
  if (!form.author) errors.author = '이름(또는 병원명)을 적어 주세요.';
  if (!form.title) errors.title = '제목을 적어 주세요.';
  if (form.body.length < 5) errors.body = '내용을 조금 더 적어 주세요.';
  if (!b.password || String(b.password).length < 4) errors.password = '비밀번호는 4자 이상입니다.';
  if (b.agree !== 'yes') errors.agree = '개인정보 수집·이용에 동의해 주세요.';
  if (Object.keys(errors).length) return res.status(422).render('board/write', { title: '문의 남기기', form, errors });
  const r = db.prepare('INSERT INTO posts (board, title, body, author, password_hash, is_secret) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.board, form.title, form.body, form.author, hashPassword(b.password), form.is_secret);
  notifyWebhook(getSettings().webhook_url, { text: `[채움파트너스] 상담 문의 게시판 새 글 #${r.lastInsertRowid}: ${form.title} (${form.author})`, type: 'qna', id: Number(r.lastInsertRowid) });
  res.redirect(`${req.app.locals.base}/board/${req.board}/${r.lastInsertRowid}?w=${writtenSig(r.lastInsertRowid)}`);
});

function findPost(req) {
  const id = parseInt(req.params.id, 10);
  return db.prepare('SELECT * FROM posts WHERE id = ? AND board = ? AND published = 1').get(id, req.board);
}
function neighbours(post) {
  const prev = db.prepare('SELECT id, title, is_secret FROM posts WHERE board = ? AND published = 1 AND id < ? ORDER BY id DESC LIMIT 1').get(post.board, post.id);
  const next = db.prepare('SELECT id, title, is_secret FROM posts WHERE board = ? AND published = 1 AND id > ? ORDER BY id ASC LIMIT 1').get(post.board, post.id);
  return { prev, next };
}
function renderPost(req, res, post) {
  res.render('board/view', {
    title: post.title, post, html: formatBody(post.body), answerHtml: post.answer ? formatBody(post.answer) : '',
    ...neighbours(post), written: req.query.w === writtenSig(post.id),
  });
}

router.get('/:board/:id(\\d+)', (req, res) => {
  const post = findPost(req);
  if (!post) return res.status(404).render('error', { title: '글을 찾을 수 없습니다', message: '삭제되었거나 주소가 잘못되었습니다.' });
  if (post.is_secret && !req.admin && req.query.w !== writtenSig(post.id)) {
    return res.render('board/locked', { title: '비밀글', post, error: '' });
  }
  db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(post.id);
  renderPost(req, res, post);
});

router.post('/:board/:id(\\d+)/unlock', (req, res) => {
  const post = findPost(req);
  if (!post) return res.status(404).render('error', { title: '글을 찾을 수 없습니다', message: '삭제되었거나 주소가 잘못되었습니다.' });
  if (!rateLimit(`unlock:${req.ip}`, 10, 10 * 60 * 1000)) return res.status(429).render('board/locked', { title: '비밀글', post, error: '시도가 너무 많습니다. 잠시 뒤 다시 해 주세요.' });
  if (!verifyPassword(req.body?.password || '', post.password_hash)) {
    return res.status(403).render('board/locked', { title: '비밀글', post, error: '비밀번호가 맞지 않습니다.' });
  }
  renderPost(req, res, post);
});

module.exports = router;
module.exports.BOARDS = BOARDS;
