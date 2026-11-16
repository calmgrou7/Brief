'use strict';
const path = require('node:path');
const express = require('express');
const { db, getSettings } = require('./src/db');
const { hashPassword, token } = require('./src/util');
const { loadSession } = require('./src/auth');
const seed = require('./src/seed');

// BASE_PATH: 브릿지노드 도메인 아래 경로(예: /chaeum)로 붙일 때만 지정. 독립 도메인이면 비워 둔다.
const BASE = (process.env.BASE_PATH || '').replace(/\/+$/, '');
const PORT = Number(process.env.PORT || 3000);

// 첫 실행: 관리자 계정 만들기
if (!db.prepare('SELECT 1 FROM admins LIMIT 1').get()) {
  const user = process.env.ADMIN_USER || 'admin';
  const pw = process.env.ADMIN_PASSWORD || token(6);
  db.prepare('INSERT INTO admins (username, pass_hash) VALUES (?, ?)').run(user, hashPassword(pw));
  console.log('──────────────────────────────────────────');
  console.log(` 관리자 계정이 생성되었습니다: ${user} / ${process.env.ADMIN_PASSWORD ? '(ADMIN_PASSWORD 값)' : pw}`);
  console.log(' 로그인 후 [관리자 > 비밀번호 변경]에서 바로 바꿔 주세요.');
  console.log('──────────────────────────────────────────');
}
seed();

const app = express();
app.locals.base = BASE;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

const router = express.Router();
router.use('/static', express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));
// 한글 서체는 직접 서비스 (외부 CDN이 막혀도 글꼴이 깨지지 않게)
router.use('/static/pretendard', express.static(path.join(__dirname, 'node_modules', 'pretendard', 'dist', 'web', 'variable'), { maxAge: '30d', immutable: true }));
router.use(express.urlencoded({ extended: false, limit: '200kb' }));
router.use(loadSession);
router.use((req, res, next) => {
  res.locals.base = BASE;
  res.locals.site = getSettings();
  res.locals.path = req.path;
  res.locals.isAdmin = Boolean(req.admin);
  res.locals.fmtDate = (s) => String(s || '').slice(0, 10).replace(/-/g, '.');
  next();
});

router.use('/', require('./src/routes/public'));
router.use('/board', require('./src/routes/board'));
router.use('/admin', require('./src/routes/admin'));

router.use((req, res) => res.status(404).render('error', { title: '페이지를 찾을 수 없습니다', message: '주소가 바뀌었거나 삭제된 페이지입니다.' }));
router.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).render('error', { title: '잠시 문제가 생겼습니다', message: '같은 일이 반복되면 전화로 알려 주세요.' });
});

app.use(BASE || '/', router);
if (BASE) app.get('/', (_req, res) => res.redirect(BASE + '/'));

app.listen(PORT, () => console.log(`채움파트너스 사이트: http://localhost:${PORT}${BASE}/`));
