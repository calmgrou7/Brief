-- Supabase(Postgres) 이전용 스키마 — 신청이 늘어 SQLite 를 넘어설 때 사용
-- Supabase SQL Editor 에 붙여넣기. 테이블 의미는 server/db.js 주석과 동일합니다.
create table diagnoses (
  id bigint generated always as identity primary key,
  device_id text not null,
  answers jsonb not null,
  result jsonb not null,
  risk_flags jsonb,
  created_at timestamptz not null default now()
);
create table leads (
  id bigint generated always as identity primary key,
  diagnosis_id bigint references diagnoses(id) on delete set null,
  device_id text,
  name text not null, phone text not null, email text,
  company_name text not null, biz_no text, region text,
  help_types jsonb, desired_funds jsonb, desired_amount int,
  contact_time text, message text,
  status text not null default 'new' check (status in ('new','contacted','in_progress','done','dropped')),
  admin_memo text, source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retention_until date not null
);
create index on leads (status, created_at);
create table consents (
  id bigint generated always as identity primary key,
  lead_id bigint references leads(id) on delete cascade,
  device_id text, consent_type text not null, agreed boolean not null,
  policy_version text not null, ip inet, user_agent text,
  created_at timestamptz not null default now()
);
create table programs (
  id text primary key, source text not null, title text not null, agency text, category text,
  regions jsonb, tags text, summary text, apply_period text, apply_end date, url text,
  published_at date, collected_at timestamptz not null default now(), notified boolean not null default false
);
create table push_subscriptions (
  id bigint generated always as identity primary key,
  device_id text not null, endpoint text not null unique, keys jsonb not null,
  regions jsonb, categories jsonb, active boolean not null default true,
  created_at timestamptz not null default now(), last_sent_at timestamptz
);
create table notification_logs (
  id bigint generated always as identity primary key,
  subscription_id bigint, title text, body text, program_ids jsonb, status text, error text,
  created_at timestamptz not null default now()
);
-- 개인정보 테이블은 RLS 를 켜고 anon 접근을 막습니다 (서버의 service_role 키로만 접근)
alter table leads enable row level security;
alter table consents enable row level security;
alter table diagnoses enable row level security;
alter table push_subscriptions enable row level security;
