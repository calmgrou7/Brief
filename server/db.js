// SQLite 저장소 (Node 22 내장 node:sqlite 사용 — 별도 네이티브 빌드 불필요)
// 운영 확장 시 동일 스키마를 Supabase(Postgres)로 옮기면 됩니다. docs/schema.sql 참고.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DB_PATH || path.resolve('data/app.db');

let db;

export function getDb() {
  if (db) return db;
  if (DB_PATH !== ':memory:') fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

function migrate(d) {
  d.exec(`
  -- 1) 기업상태 진단 (개인식별정보 없음: 익명 device_id 로만 연결)
  CREATE TABLE IF NOT EXISTS diagnoses (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id     TEXT NOT NULL,
    answers_json  TEXT NOT NULL,          -- 진단 응답 원본
    result_json   TEXT NOT NULL,          -- 매칭 결과(추천 자금 + 점수)
    risk_flags    TEXT,                   -- 체납/연체 등 제한 사유
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- 2) 정책지원마스터 상담 신청 (리드 DB)
  CREATE TABLE IF NOT EXISTS leads (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    diagnosis_id     INTEGER REFERENCES diagnoses(id) ON DELETE SET NULL,
    device_id        TEXT,
    name             TEXT NOT NULL,
    phone            TEXT NOT NULL,
    email            TEXT,
    company_name     TEXT NOT NULL,
    biz_no           TEXT,
    region           TEXT,
    help_types       TEXT,                -- JSON 배열: 자금추천, 서류작성, 사업계획서, 보증/대출 연계 ...
    desired_funds    TEXT,                -- JSON 배열: 관심 자금 코드
    desired_amount   INTEGER,             -- 만원 단위
    contact_time     TEXT,
    message          TEXT,
    status           TEXT NOT NULL DEFAULT 'new',   -- new | contacted | in_progress | done | dropped
    admin_memo       TEXT,
    source           TEXT,                -- utm/유입경로
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
    retention_until  TEXT NOT NULL         -- 개인정보 보유기간 만료일 (자동 파기 기준)
  );
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status, created_at);

  -- 3) 동의 이력 (개인정보보호법 대응: 언제/어떤 문구 버전에/무엇에 동의했는지)
  CREATE TABLE IF NOT EXISTS consents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id       INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    device_id     TEXT,
    consent_type  TEXT NOT NULL,          -- privacy_required | third_party | marketing | push
    agreed        INTEGER NOT NULL,       -- 1 동의 / 0 미동의
    policy_version TEXT NOT NULL,
    ip            TEXT,
    user_agent    TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- 4) 수집한 정책자금 공고 (기업마당 API 등)
  CREATE TABLE IF NOT EXISTS programs (
    id            TEXT PRIMARY KEY,       -- 원천 공고 ID (예: PBLN_000000000012345)
    source        TEXT NOT NULL,          -- bizinfo | mock | manual
    title         TEXT NOT NULL,
    agency        TEXT,
    category      TEXT,                   -- 금융/기술/창업/...
    regions       TEXT,                   -- JSON 배열 (전국 포함)
    tags          TEXT,
    summary       TEXT,
    apply_period  TEXT,
    apply_end     TEXT,                   -- YYYY-MM-DD (마감 필터용)
    url           TEXT,
    published_at  TEXT,
    collected_at  TEXT NOT NULL DEFAULT (datetime('now')),
    notified      INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_programs_pub ON programs(published_at);

  -- 5) 웹푸시 구독 (앱 설치자 주간 알림)
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id     TEXT NOT NULL,
    endpoint      TEXT NOT NULL UNIQUE,
    keys_json     TEXT NOT NULL,
    regions       TEXT,                   -- JSON 배열: 관심 지역
    categories    TEXT,                   -- JSON 배열: 관심 분야
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    last_sent_at  TEXT
  );

  -- 6) 발송 로그
  CREATE TABLE IF NOT EXISTS notification_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER,
    title           TEXT,
    body            TEXT,
    program_ids     TEXT,
    status          TEXT,                 -- sent | failed | expired
    error           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `);
}

export function json(v) {
  return v == null ? null : JSON.stringify(v);
}

export function parseJson(v, fallback = null) {
  if (v == null || v === '') return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}
