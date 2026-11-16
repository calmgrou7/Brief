'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'chaeum.db'));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, pass_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  csrf TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  status TEXT NOT NULL DEFAULT '신규',
  clinic_name TEXT, clinic_type TEXT, contact_name TEXT, phone TEXT, email TEXT, region TEXT,
  annual_revenue TEXT, net_income TEXT, card_monthly TEXT, nhis_monthly TEXT, tax_bracket TEXT,
  need_amount TEXT, purposes TEXT, purpose_detail TEXT, need_by TEXT, equipment_5y TEXT,
  kcb TEXT, nice TEXT, contact_time TEXT, source TEXT, ip TEXT, user_agent TEXT
);
CREATE TABLE IF NOT EXISTS lead_notes (
  id INTEGER PRIMARY KEY, lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY,
  board TEXT NOT NULL,
  title TEXT NOT NULL, body TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '채움파트너스',
  password_hash TEXT, is_secret INTEGER NOT NULL DEFAULT 0, is_pinned INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  answer TEXT, answered_at TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS posts_board ON posts(board, is_pinned DESC, id DESC);
CREATE INDEX IF NOT EXISTS leads_status ON leads(status, id DESC);
`);

const DEFAULT_SETTINGS = {
  company_name: '채움파트너스',
  ceo_name: '',
  phone: '',
  kakao_url: '',
  email: '',
  hours: '평일 09:00 – 18:00',
  address: '',
  biz_no: '',
  broker_no: '',
  bridgenode_url: 'https://bridgenode.co.kr',
  webhook_url: '',
  meta_description: '병원·약국·동물병원 전문 여신 컨설팅. 보유 장비, 카드매출, 공단 매출을 근거로 상환·확장·장비 자금을 설계합니다.',
};
const insSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insSetting.run(k, v);

function getSettings() {
  const out = { ...DEFAULT_SETTINGS };
  for (const r of db.prepare('SELECT key, value FROM settings').all()) out[r.key] = r.value;
  return out;
}
function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

module.exports = { db, getSettings, setSetting, DEFAULT_SETTINGS, DATA_DIR };
