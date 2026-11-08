import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import express from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import cron from 'node-cron';
import { getDb, json, parseJson } from './db.js';
import { diagnose, validateAnswers, programMatches } from './matcher.js';
import { INDUSTRIES, REGIONS } from './catalog.js';
import { listOpenPrograms, collectPrograms, CATEGORY_CODES } from './bizinfo.js';
import { validateLead, createLead, notifyWebhook, leadRow, HELP_TYPES, STATUSES, POLICY_VERSION, fmtPhone } from './leads.js';
import { saveSubscription, removeSubscription, runWeekly, sendTest, pushEnabled } from './push.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 간단한 IP 기반 요청 제한 (스팸 신청 방지)
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' });
    arr.push(now);
    hits.set(key, arr);
    next();
  };
}

function requireAdmin(req, res, next) {
  const token = process.env.ADMIN_TOKEN;
  const given = (req.get('authorization') || '').replace(/^Bearer\s+/i, '') || req.query.token;
  if (!token) return res.status(503).json({ error: 'ADMIN_TOKEN 이 설정되지 않았습니다 (.env)' });
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(token);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: '인증 실패' });
  next();
}

export function createApp() {
  getDb();
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(path.join(__dirname, '../public'), { extensions: ['html'] }));

  // ── 공개 API ──────────────────────────────────────────────
  app.get('/api/config', (req, res) => {
    res.json({
      appName: process.env.APP_NAME || '(가칭)기업정책지원사업',
      vapidPublicKey: pushEnabled() ? process.env.VAPID_PUBLIC_KEY : null,
      regions: REGIONS,
      industries: INDUSTRIES,
      helpTypes: HELP_TYPES,
      categories: Object.values(CATEGORY_CODES),
      policyVersion: POLICY_VERSION,
      operator: {
        name: process.env.OPERATOR_NAME || '정책지원마스터',
        phone: process.env.OPERATOR_PHONE || '',
        email: process.env.OPERATOR_EMAIL || '',
      },
    });
  });

  // 1) 기업상태 진단 → 맞춤 자금 매칭
  app.post('/api/diagnosis', rateLimit({ windowMs: 60_000, max: 20 }), (req, res) => {
    const { deviceId, answers } = req.body || {};
    const errors = validateAnswers(answers);
    if (errors.length) return res.status(400).json({ errors });
    const result = diagnose(answers);
    const interest = { regions: [answers.region], categories: ['금융'] };
    const programs = listOpenPrograms({ limit: 100 }).filter((p) => programMatches(p, interest)).slice(0, 10);
    const { lastInsertRowid } = getDb().prepare(
      'INSERT INTO diagnoses (device_id, answers_json, result_json, risk_flags) VALUES (?, ?, ?, ?)',
    ).run(String(deviceId || 'anon').slice(0, 64), json(answers), json(result), json(result.flags.map((f) => f.code)));
    res.json({ id: Number(lastInsertRowid), ...result, programs });
  });

  // 2) 진행 중 공고 (지역/분야 필터)
  app.get('/api/programs', (req, res) => {
    const regions = String(req.query.regions || '').split(',').filter(Boolean);
    const categories = String(req.query.categories || '').split(',').filter(Boolean);
    res.json(listOpenPrograms({ limit: 200 }).filter((p) => programMatches(p, { regions, categories })));
  });

  // 3) 정책지원마스터 상담 신청 (DB 수집)
  app.post('/api/leads', rateLimit({ windowMs: 10 * 60_000, max: 5 }), async (req, res) => {
    if (req.body?.website) return res.json({ ok: true }); // honeypot: 봇이면 조용히 무시
    const { lead, errors } = validateLead(req.body || {});
    if (errors.length) return res.status(400).json({ errors });
    const id = createLead(lead, { ip: req.ip, userAgent: req.get('user-agent') });
    notifyWebhook(id, lead); // 비동기 — 응답 지연 없음
    res.status(201).json({ ok: true, id });
  });

  // 4) 주간 알림 구독
  app.post('/api/push/subscribe', (req, res) => {
    const { deviceId, subscription, regions, categories } = req.body || {};
    if (!subscription?.endpoint || !subscription?.keys) return res.status(400).json({ error: '구독 정보가 없습니다.' });
    const r = (Array.isArray(regions) ? regions : []).filter((x) => REGIONS.includes(x));
    const c = (Array.isArray(categories) ? categories : []).filter((x) => Object.values(CATEGORY_CODES).includes(x));
    saveSubscription({ deviceId: String(deviceId || 'anon').slice(0, 64), subscription, regions: r, categories: c });
    getDb().prepare('INSERT INTO consents (device_id, consent_type, agreed, policy_version, ip, user_agent) VALUES (?, ?, 1, ?, ?, ?)')
      .run(String(deviceId || '').slice(0, 64), 'push', POLICY_VERSION, req.ip, String(req.get('user-agent') || '').slice(0, 300));
    res.json({ ok: true });
  });
  app.post('/api/push/unsubscribe', (req, res) => {
    if (req.body?.endpoint) removeSubscription(req.body.endpoint);
    res.json({ ok: true });
  });
  app.post('/api/push/test', rateLimit({ windowMs: 60_000, max: 3 }), async (req, res) => {
    res.json({ result: await sendTest(req.body?.endpoint) });
  });

  // ── 관리자 API (정책지원마스터용) ─────────────────────────
  const admin = express.Router();
  admin.use(requireAdmin);

  admin.get('/stats', (req, res) => {
    const db = getDb();
    const one = (sql) => Object.values(db.prepare(sql).get())[0];
    res.json({
      diagnoses: one('SELECT COUNT(*) FROM diagnoses'),
      diagnoses7d: one("SELECT COUNT(*) FROM diagnoses WHERE created_at >= datetime('now','-7 days')"),
      leads: one('SELECT COUNT(*) FROM leads'),
      leads7d: one("SELECT COUNT(*) FROM leads WHERE created_at >= datetime('now','-7 days')"),
      newLeads: one("SELECT COUNT(*) FROM leads WHERE status = 'new'"),
      subscribers: one('SELECT COUNT(*) FROM push_subscriptions WHERE active = 1'),
      programs: one('SELECT COUNT(*) FROM programs'),
      byStatus: db.prepare('SELECT status, COUNT(*) AS n FROM leads GROUP BY status').all(),
    });
  });

  admin.get('/leads', (req, res) => {
    const { status, q } = req.query;
    const where = [];
    const args = [];
    if (status && STATUSES.includes(status)) { where.push('status = ?'); args.push(status); }
    if (q) { where.push('(name LIKE ? OR company_name LIKE ? OR phone LIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    const sql = `SELECT * FROM leads ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 500`;
    res.json(getDb().prepare(sql).all(...args).map(leadRow));
  });

  admin.get('/leads/:id', (req, res) => {
    const db = getDb();
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) return res.status(404).json({ error: 'not found' });
    const diag = lead.diagnosis_id ? db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(lead.diagnosis_id) : null;
    res.json({
      ...leadRow(lead),
      diagnosis: diag ? { answers: parseJson(diag.answers_json), result: parseJson(diag.result_json) } : null,
      consents: db.prepare('SELECT consent_type, agreed, policy_version, created_at FROM consents WHERE lead_id = ?').all(lead.id),
    });
  });

  admin.patch('/leads/:id', (req, res) => {
    const { status, admin_memo } = req.body || {};
    if (status && !STATUSES.includes(status)) return res.status(400).json({ error: 'invalid status' });
    const r = getDb().prepare(`UPDATE leads SET status = COALESCE(?, status), admin_memo = COALESCE(?, admin_memo),
      updated_at = datetime('now') WHERE id = ?`).run(status || null, admin_memo ?? null, req.params.id);
    if (!r.changes) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  });

  // 엑셀에서 바로 열리는 CSV (UTF-8 BOM)
  admin.get('/leads.csv', (req, res) => {
    const rows = getDb().prepare('SELECT * FROM leads ORDER BY created_at DESC').all().map(leadRow);
    const head = ['번호', '신청일시', '상태', '성함', '연락처', '이메일', '상호', '사업자번호', '지역', '도움항목', '관심자금', '희망금액(만원)', '연락희망', '문의내용', '관리메모'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map((r) => [r.id, r.created_at, r.status, r.name, fmtPhone(r.phone), r.email, r.company_name, r.biz_no, r.region,
      r.help_types.map((h) => HELP_TYPES[h] || h).join('/'), r.desired_funds.join('/'), r.desired_amount, r.contact_time, r.message, r.admin_memo].map(esc).join(','));
    res.set('content-type', 'text/csv; charset=utf-8');
    res.set('content-disposition', `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('﻿' + [head.map(esc).join(','), ...lines].join('\r\n'));
  });

  admin.post('/collect', async (req, res, next) => {
    try { res.json({ collected: (await collectPrograms()).length }); } catch (e) { next(e); }
  });
  admin.post('/weekly', async (req, res, next) => {
    try { res.json(await runWeekly()); } catch (e) { next(e); }
  });

  app.use('/api/admin', admin);

  app.use((err, req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  });
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const app = createApp();
  app.listen(port, async () => {
    console.log(`▶ http://localhost:${port}  (관리자: /admin)`);
    try {
      const n = (await collectPrograms()).length;
      if (n) console.log(`  공고 ${n}건 수집${process.env.BIZINFO_API_KEY ? '' : ' (mock 데이터 — BIZINFO_API_KEY 설정 시 실데이터)'}`);
    } catch (e) { console.warn('  공고 수집 실패:', e.message); }
  });
  // 매주 월요일 09:00 (KST) 자동 수집·발송
  if (process.env.ENABLE_CRON !== 'false') {
    cron.schedule(process.env.WEEKLY_CRON || '0 9 * * 1', async () => {
      try { console.log('[weekly]', await runWeekly()); } catch (e) { console.error('[weekly] 실패', e); }
    }, { timezone: 'Asia/Seoul' });
  }
}
