// 웹푸시(PWA) — 앱 설치자에게 주간 정책자금 알림
import * as webpush from 'web-push';
import { getDb, json, parseJson } from './db.js';
import { collectPrograms, rowToProgram } from './bizinfo.js';
import { programMatches } from './matcher.js';

let configured = false;
export function pushEnabled() {
  if (configured) return true;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export function saveSubscription({ deviceId, subscription, regions = [], categories = [] }) {
  const db = getDb();
  db.prepare(`INSERT INTO push_subscriptions (device_id, endpoint, keys_json, regions, categories, active)
    VALUES (?, ?, ?, ?, ?, 1)
    ON CONFLICT(endpoint) DO UPDATE SET device_id = excluded.device_id, keys_json = excluded.keys_json,
      regions = excluded.regions, categories = excluded.categories, active = 1`)
    .run(deviceId, subscription.endpoint, json(subscription.keys), json(regions), json(categories));
}

export function removeSubscription(endpoint) {
  getDb().prepare('UPDATE push_subscriptions SET active = 0 WHERE endpoint = ?').run(endpoint);
}

async function sendOne(sub, payload) {
  const db = getDb();
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: parseJson(sub.keys_json) }, JSON.stringify(payload), { TTL: 60 * 60 * 24 * 3 });
    db.prepare("UPDATE push_subscriptions SET last_sent_at = datetime('now') WHERE id = ?").run(sub.id);
    db.prepare('INSERT INTO notification_logs (subscription_id, title, body, program_ids, status) VALUES (?, ?, ?, ?, ?)')
      .run(sub.id, payload.title, payload.body, json(payload.programIds), 'sent');
    return 'sent';
  } catch (e) {
    const expired = e.statusCode === 404 || e.statusCode === 410;
    if (expired) db.prepare('UPDATE push_subscriptions SET active = 0 WHERE id = ?').run(sub.id);
    db.prepare('INSERT INTO notification_logs (subscription_id, title, body, program_ids, status, error) VALUES (?, ?, ?, ?, ?, ?)')
      .run(sub.id, payload.title, payload.body, json(payload.programIds), expired ? 'expired' : 'failed', String(e.message).slice(0, 300));
    return expired ? 'expired' : 'failed';
  }
}

// 주간 작업: ① 공고 수집 → ② 미발송 공고를 구독자 관심사로 필터 → ③ 푸시 발송
export async function runWeekly({ collectOnly = false } = {}) {
  const db = getDb();
  const fresh = await collectPrograms();
  const summary = { collected: fresh.length, sent: 0, failed: 0, expired: 0, skipped: 0, pushEnabled: pushEnabled() };
  if (collectOnly) return summary;

  const pending = db.prepare('SELECT * FROM programs WHERE notified = 0').all().map(rowToProgram);
  if (!pending.length) return summary;
  if (!summary.pushEnabled) { summary.note = 'VAPID 키 미설정 — 발송 생략 (npm run vapid)'; return summary; }

  const subs = db.prepare('SELECT * FROM push_subscriptions WHERE active = 1').all();
  for (const sub of subs) {
    const interest = { regions: parseJson(sub.regions, []), categories: parseJson(sub.categories, []) };
    const hits = pending.filter((p) => programMatches(p, interest));
    if (!hits.length) { summary.skipped++; continue; }
    const payload = {
      title: `이번 주 맞춤 정책자금 ${hits.length}건`,
      body: hits.slice(0, 2).map((h) => h.title).join(' / ') + (hits.length > 2 ? ` 외 ${hits.length - 2}건` : ''),
      url: '/#programs',
      programIds: hits.map((h) => h.id),
    };
    summary[await sendOne(sub, payload)]++;
  }
  const mark = db.prepare('UPDATE programs SET notified = 1 WHERE id = ?');
  for (const p of pending) mark.run(p.id);
  return summary;
}

export async function sendTest(endpoint) {
  const sub = getDb().prepare('SELECT * FROM push_subscriptions WHERE endpoint = ? AND active = 1').get(endpoint);
  if (!sub || !pushEnabled()) return 'unavailable';
  return sendOne(sub, { title: '알림 설정 완료', body: '매주 새로운 맞춤 정책자금 공고를 알려드릴게요.', url: '/#programs', programIds: [] });
}
