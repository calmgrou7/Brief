// 정책지원마스터 상담 신청(리드) 수집 + 동의 이력 + 외부 자동화 웹훅
import { getDb, json, parseJson } from './db.js';
import { REGIONS } from './catalog.js';

export const POLICY_VERSION = process.env.PRIVACY_POLICY_VERSION || '2026-11-v1';
export const RETENTION_DAYS = Number(process.env.LEAD_RETENTION_DAYS || 365 * 3); // 기본 3년
export const HELP_TYPES = {
  fund_recommend: '맞춤 자금 추천·전략',
  documents: '신청서류 준비·작성',
  business_plan: '사업계획서 작성',
  guarantee: '보증·대출 연계 상담',
  certification: '벤처·이노비즈 등 인증 준비',
  etc: '기타',
};
export const STATUSES = ['new', 'contacted', 'in_progress', 'done', 'dropped'];

const clean = (v, max = 200) => (v == null ? '' : String(v).trim().slice(0, max));

export function validateLead(b) {
  const errors = [];
  const lead = {
    name: clean(b.name, 30),
    phone: clean(b.phone, 20).replace(/[^\d]/g, ''),
    email: clean(b.email, 100),
    companyName: clean(b.companyName, 60),
    bizNo: clean(b.bizNo, 12).replace(/[^\d]/g, ''),
    region: clean(b.region, 10),
    helpTypes: (Array.isArray(b.helpTypes) ? b.helpTypes : []).filter((h) => h in HELP_TYPES),
    desiredFunds: (Array.isArray(b.desiredFunds) ? b.desiredFunds : []).map((x) => clean(x, 40)).slice(0, 20),
    desiredAmount: b.desiredAmount ? Math.max(0, Math.min(10_000_000, parseInt(b.desiredAmount, 10) || 0)) : null,
    contactTime: clean(b.contactTime, 30),
    message: clean(b.message, 1000),
    source: clean(b.source, 100),
    diagnosisId: Number.isInteger(b.diagnosisId) ? b.diagnosisId : null,
    deviceId: clean(b.deviceId, 64),
    consents: {
      privacy_required: b.consents?.privacy_required === true,
      third_party: b.consents?.third_party === true,
      marketing: b.consents?.marketing === true,
    },
  };
  if (lead.name.length < 2) errors.push('성함을 입력해 주세요.');
  if (!/^01[016789]\d{7,8}$/.test(lead.phone)) errors.push('휴대폰 번호를 정확히 입력해 주세요.');
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) errors.push('이메일 형식을 확인해 주세요.');
  if (!lead.companyName) errors.push('상호(회사명)를 입력해 주세요.');
  if (lead.bizNo && lead.bizNo.length !== 10) errors.push('사업자등록번호는 10자리입니다.');
  if (lead.region && !REGIONS.includes(lead.region)) errors.push('지역을 확인해 주세요.');
  if (!lead.helpTypes.length) errors.push('도움 받을 항목을 하나 이상 선택해 주세요.');
  if (!lead.consents.privacy_required) errors.push('개인정보 수집·이용(필수)에 동의해야 신청할 수 있습니다.');
  return { lead, errors };
}

export function createLead(lead, { ip, userAgent }) {
  const db = getDb();
  const retention = new Date(Date.now() + RETENTION_DAYS * 86400000).toISOString().slice(0, 10);
  db.exec('BEGIN');
  try {
    const { lastInsertRowid } = db.prepare(`INSERT INTO leads
      (diagnosis_id, device_id, name, phone, email, company_name, biz_no, region, help_types, desired_funds,
       desired_amount, contact_time, message, source, retention_until)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      lead.diagnosisId, lead.deviceId || null, lead.name, lead.phone, lead.email || null, lead.companyName,
      lead.bizNo || null, lead.region || null, json(lead.helpTypes), json(lead.desiredFunds), lead.desiredAmount,
      lead.contactTime || null, lead.message || null, lead.source || null, retention);
    const id = Number(lastInsertRowid);
    const ins = db.prepare('INSERT INTO consents (lead_id, device_id, consent_type, agreed, policy_version, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const [type, agreed] of Object.entries(lead.consents)) {
      ins.run(id, lead.deviceId || null, type, agreed ? 1 : 0, POLICY_VERSION, ip || null, clean(userAgent, 300));
    }
    db.exec('COMMIT');
    return id;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export const maskPhone = (p = '') => p.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-****-$3');
export const fmtPhone = (p = '') => p.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3');

// 신규 리드 → 외부 자동화(Zapier/Make/n8n/Slack 등)로 즉시 전달
export async function notifyWebhook(id, lead) {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return;
  const payload = {
    event: 'lead.created',
    id,
    name: lead.name,
    phone: fmtPhone(lead.phone),
    email: lead.email,
    company: lead.companyName,
    region: lead.region,
    help: lead.helpTypes.map((h) => HELP_TYPES[h]),
    desiredFunds: lead.desiredFunds,
    desiredAmount: lead.desiredAmount,
    contactTime: lead.contactTime,
    message: lead.message,
    text: `🔔 새 상담신청 #${id} ${lead.companyName} / ${lead.name} (${fmtPhone(lead.phone)}) — ${lead.helpTypes.map((h) => HELP_TYPES[h]).join(', ')}`,
  };
  try {
    await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
  } catch (e) {
    console.warn('[webhook] 전송 실패:', e.message);
  }
}

export function leadRow(r) {
  return {
    ...r,
    help_types: parseJson(r.help_types, []),
    desired_funds: parseJson(r.desired_funds, []),
  };
}

// 보유기간 만료 리드 파기 (개인정보보호법 제21조)
export function purgeExpired() {
  const today = new Date().toISOString().slice(0, 10);
  const r = getDb().prepare('DELETE FROM leads WHERE retention_until < ?').run(today);
  return Number(r.changes);
}
