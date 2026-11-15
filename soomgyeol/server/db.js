"use strict";
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  pw_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user',          -- user | admin
  status TEXT NOT NULL DEFAULT 'active',      -- active | suspended
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

-- 메일 발송 서비스 연결 전, 보내야 할 메일을 저장해 관리자 화면에서 확인합니다.
CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 결제 상태 (결제사 기준)
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
  order_id TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,                 -- initial | renewal
  cycle TEXT NOT NULL,                -- monthly | yearly
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,               -- pending | paid | failed | refunded
  provider TEXT NOT NULL,             -- test | toss ...
  provider_payment_key TEXT,
  is_test INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 구독 상태 (결제 상태와 분리)
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  plan TEXT NOT NULL DEFAULT 'premium',
  cycle TEXT NOT NULL,
  status TEXT NOT NULL,               -- active | canceled(해지 예약) | past_due(갱신 실패) | expired | refunded
  provider TEXT NOT NULL,
  provider_sub_id TEXT NOT NULL UNIQUE,
  current_period_start INTEGER NOT NULL,
  current_period_end INTEGER NOT NULL,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  last_event_at INTEGER NOT NULL DEFAULT 0,
  is_test INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 결제 알림 중복 방지
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  payload TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  result TEXT
);

-- 관리자 수동 이용권
CREATE TABLE IF NOT EXISTS grants (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'premium',
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  reason TEXT NOT NULL,
  admin_id INTEGER,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_daily (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS breath_sessions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  mood TEXT,
  planned_sec INTEGER NOT NULL,
  actual_sec INTEGER NOT NULL DEFAULT 0,
  cycles INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,               -- started | completed | stopped | aborted
  counted INTEGER NOT NULL DEFAULT 1, -- 오늘 이용 횟수에 반영됐는지
  usage_day TEXT NOT NULL,
  feeling_before INTEGER,
  feeling_after INTEGER,
  note TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON breath_sessions(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open | answered | closed
  answer TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS content (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,                  -- notice | faq
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  admin_id INTEGER,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  detail TEXT,
  reason TEXT,
  created_at INTEGER NOT NULL
);

-- 오류 기록: 사용자 콘텐츠(메모 등)는 남기지 않습니다.
CREATE TABLE IF NOT EXISTS error_log (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  path TEXT,
  created_at INTEGER NOT NULL
);

-- 운영 지표: 이벤트 종류와 시각만 저장
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  type TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, created_at);
`;

const DEFAULT_FAQ = [
  ["의료적인 치료 효과가 있나요?", "숨결은 건강한 성인의 휴식과 긴장 완화를 돕는 호흡 안내 서비스이며 의료 기기나 치료법이 아닙니다. 숨이 차거나 어지러우면 바로 평소 호흡으로 돌아오세요. 질환이 있다면 전문가와 상의하세요."],
  ["무료로 어디까지 쓸 수 있나요?", "공명·박스·한숨 호흡 3가지를 하루 3회, 한 번에 최대 3분까지 이용할 수 있고, 최근 7일 기록을 볼 수 있습니다. 하루 횟수는 매일 자정(한국 시간)에 다시 채워지며 이월되지 않습니다."],
  ["30초 만에 그만두면 횟수가 차감되나요?", "시작 후 30초 안에 그만두면 오늘 이용 횟수를 되돌려 드립니다. 30초가 지나면 끝까지 하지 않아도 1회로 계산합니다."],
  ["해지하면 바로 이용이 끊기나요?", "해지는 다음 결제를 멈추는 예약입니다. 이미 결제한 기간이 끝날 때까지 프리미엄을 그대로 쓸 수 있고, 기간이 끝나면 무료로 바뀝니다. 기간 안에는 해지를 취소할 수 있습니다."],
  ["음성이 나오지 않아요.", "기기의 텍스트 음성 변환 기능을 사용합니다. 휴대폰 설정에서 한국어 음성을 추가하거나, 무음 모드를 해제해 주세요. 앱 오른쪽 위 설정에서 음성 안내를 켜고 끌 수 있습니다."],
  ["기록을 지우거나 탈퇴할 수 있나요?", "보관함에서 기록을 하나씩 지울 수 있고, 내 정보 > 탈퇴하기에서 계정과 호흡 기록을 모두 삭제할 수 있습니다. 결제 기록은 관련 법령에 따라 정해진 기간 보관됩니다."],
];

function open(file) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  const now = Date.now();
  const hasFaq = db.prepare("SELECT COUNT(*) n FROM content WHERE kind='faq'").get().n;
  if (!hasFaq) {
    const ins = db.prepare("INSERT INTO content(kind,title,body,published,sort,created_at,updated_at) VALUES('faq',?,?,1,?,?,?)");
    DEFAULT_FAQ.forEach(([q, a], i) => ins.run(q, a, i, now, now));
  }

  // 트랜잭션 헬퍼: 함수가 throw 하면 롤백
  db.tx = fn => {
    db.exec("BEGIN IMMEDIATE");
    try { const r = fn(); db.exec("COMMIT"); return r; }
    catch (e) { db.exec("ROLLBACK"); throw e; }
  };
  db.one = (sql, ...a) => db.prepare(sql).get(...a);
  db.all = (sql, ...a) => db.prepare(sql).all(...a);
  db.run = (sql, ...a) => db.prepare(sql).run(...a);
  return db;
}

module.exports = { open };
