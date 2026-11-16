'use strict';
const express = require('express');
const { db, getSettings } = require('../db');
const { clip, rateLimit, notifyWebhook, excerpt } = require('../util');

const router = express.Router();

const CLINIC_TYPES = ['의원', '병원', '치과', '한의원', '검진센터', '약국', '동물병원', '기타'];
const TAX_BRACKETS = ['6%', '15%', '24%', '35%', '38%', '40%', '42%', '45%', '모름', '법인'];
const PURPOSES = ['기존 대출 상환', '임대보증금 증액', '의료장비 도입', '확장·이전 개원', '운영자금', '절세 구조 검토', '기타'];

function latest(board, n) {
  return db.prepare('SELECT id, board, title, body, created_at FROM posts WHERE board = ? AND published = 1 ORDER BY is_pinned DESC, id DESC LIMIT ?').all(board, n)
    .map((p) => ({ ...p, excerpt: excerpt(p.body, 70) }));
}

router.get('/', (req, res) => {
  res.render('index', {
    title: null,
    columns: latest('column', 4),
    notices: latest('notice', 1),
    form: {}, errors: {},
    CLINIC_TYPES, TAX_BRACKETS, PURPOSES,
  });
});

router.get('/consult', (req, res) => {
  res.render('consult', { title: '자금 진단 신청', form: {}, errors: {}, CLINIC_TYPES, TAX_BRACKETS, PURPOSES });
});

router.post('/consult', async (req, res) => {
  const b = req.body || {};
  // 스팸 방지: 사람에게 보이지 않는 칸에 값이 있으면 조용히 완료 화면으로
  if (b.website) return res.redirect(`${req.app.locals.base}/consult/done`);
  if (!rateLimit(`consult:${req.ip}`, 5, 10 * 60 * 1000)) {
    return res.status(429).render('error', { title: '신청이 너무 잦습니다', message: '10분 뒤 다시 시도하시거나 전화로 연락 주세요.' });
  }
  const purposes = [].concat(b.purposes || []).filter((p) => PURPOSES.includes(p));
  const form = {
    clinic_name: clip(b.clinic_name, 80), clinic_type: CLINIC_TYPES.includes(b.clinic_type) ? b.clinic_type : '',
    contact_name: clip(b.contact_name, 40), phone: clip(b.phone, 30), email: clip(b.email, 120), region: clip(b.region, 60),
    annual_revenue: clip(b.annual_revenue, 40), net_income: clip(b.net_income, 40), card_monthly: clip(b.card_monthly, 40),
    nhis_monthly: clip(b.nhis_monthly, 40), tax_bracket: TAX_BRACKETS.includes(b.tax_bracket) ? b.tax_bracket : '',
    need_amount: clip(b.need_amount, 40), purposes: purposes.join(', '), purpose_detail: clip(b.purpose_detail, 2000),
    need_by: clip(b.need_by, 40), equipment_5y: clip(b.equipment_5y, 40), kcb: clip(b.kcb, 10), nice: clip(b.nice, 10),
    contact_time: clip(b.contact_time, 40), source: clip(b.source, 40),
  };
  const errors = {};
  if (!form.clinic_name) errors.clinic_name = '병원(약국)명을 적어 주세요.';
  if (!form.contact_name) errors.contact_name = '성함을 적어 주세요.';
  if (!/^[0-9\-+\s()]{9,}$/.test(form.phone)) errors.phone = '연락 가능한 번호를 적어 주세요. 예: 010-1234-5678';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = '이메일 형식을 확인해 주세요.';
  if (b.agree !== 'yes') errors.agree = '개인정보 수집·이용에 동의하셔야 접수됩니다.';
  if (Object.keys(errors).length) {
    const view = form.source === 'home' ? 'index' : 'consult';
    const extra = view === 'index' ? { columns: latest('column', 4), notices: latest('notice', 1) } : {};
    return res.status(422).render(view, { title: view === 'index' ? null : '자금 진단 신청', form: { ...form, purposesArr: purposes }, errors, CLINIC_TYPES, TAX_BRACKETS, PURPOSES, ...extra });
  }
  const cols = Object.keys(form);
  const r = db.prepare(`INSERT INTO leads (${cols.join(', ')}, ip, user_agent) VALUES (${cols.map(() => '?').join(', ')}, ?, ?)`)
    .run(...cols.map((c) => form[c]), req.ip, clip(req.headers['user-agent'], 200));

  const s = getSettings();
  notifyWebhook(s.webhook_url, {
    text: `[채움파트너스] 새 자금 진단 신청 #${r.lastInsertRowid}: ${form.clinic_name} ${form.contact_name} (${form.phone}) 필요자금 ${form.need_amount || '-'}`,
    type: 'lead', id: Number(r.lastInsertRowid), ...form,
  });
  res.redirect(`${req.app.locals.base}/consult/done`);
});

router.get('/consult/done', (req, res) => res.render('consult-done', { title: '접수되었습니다' }));
router.get('/privacy', (req, res) => res.render('privacy', { title: '개인정보 처리방침' }));

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nDisallow: ${req.app.locals.base}/admin\n`);
});

module.exports = router;
