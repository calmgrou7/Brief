-- Brief 데이터베이스 스키마 초안 (Supabase / Postgres)
-- 기획서 docs/PLAN.md §7 참고. 1단계 개발 시 supabase/migrations/ 로 옮겨 적용한다.
-- 금액은 모두 원 단위 정수(bigint).

create extension if not exists pgcrypto;

-- ───────────────────────── 사용자·고객 ─────────────────────────

create table users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  name        text,
  role        text not null default 'owner' check (role in ('owner', 'operator', 'viewer')),
  created_at  timestamptz not null default now()
);

create table clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  industry    text,
  status      text not null default 'active' check (status in ('onboarding', 'active', 'paused', 'ended')),
  brand_kit   jsonb not null default '{}',   -- 로고 경로, 컬러, 폰트, 톤앤매너
  target_kpi  jsonb not null default '{}',   -- {"primary":"purchase","cpa":30000,"roas":3.0}
  special_ad_category text,                  -- 금융/고용/주거/정치 등
  created_at  timestamptz not null default now()
);

create table client_members (
  client_id   uuid not null references clients (id) on delete cascade,
  user_id     uuid not null references users (id) on delete cascade,
  role        text not null default 'viewer',
  primary key (client_id, user_id)
);

create table client_memory (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients (id) on delete cascade,
  kind        text not null check (kind in ('tone', 'banned_words', 'winning_pattern', 'fact', 'note')),
  content     text not null,
  created_at  timestamptz not null default now()
);

create table ad_accounts (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references clients (id) on delete cascade,
  meta_account_id  text not null unique,     -- act_XXXXXXXX
  name             text,
  currency         text not null default 'KRW',
  timezone         text not null default 'Asia/Seoul',
  token_ref        text,                     -- Vault 시크릿 이름 (토큰 평문 저장 금지)
  daily_spend_cap  bigint,                   -- 코드 레벨 안전장치
  monthly_spend_cap bigint,
  last_synced_at   timestamptz
);

-- ───────────────────────── 기획·소재 ─────────────────────────

create table briefs (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients (id) on delete cascade,
  product         text not null,
  price           bigint,
  region          text,
  goal            text,                      -- 구매/리드/방문/인지
  monthly_budget  bigint,
  competitors     text,
  facts           jsonb not null default '[]', -- 카피에 인용 가능한 확정 사실
  notes           text,
  created_at      timestamptz not null default now()
);

create table strategies (
  id            uuid primary key default gen_random_uuid(),
  brief_id      uuid not null references briefs (id) on delete cascade,
  client_id     uuid not null references clients (id) on delete cascade,
  version       int not null default 1,
  personas      jsonb not null default '[]',
  messages      jsonb not null default '[]', -- 메시지 축
  structure     jsonb not null default '{}', -- 퍼널별 캠페인 구조
  budget_split  jsonb not null default '{}',
  expected_kpi  jsonb not null default '{}',
  status        text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'archived')),
  created_at    timestamptz not null default now()
);

create table creatives (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients (id) on delete cascade,
  strategy_id   uuid references strategies (id) on delete set null,
  message_axis  text,
  headline      text,
  body          text,
  cta           text,
  image_path    text,                        -- Supabase Storage 경로
  format        text check (format in ('1:1', '4:5', '9:16', '1.91:1')),
  policy_check  jsonb not null default '{}',
  status        text not null default 'draft' check (status in ('draft', 'approved', 'live', 'paused', 'rejected')),
  version       int not null default 1,
  parent_id     uuid references creatives (id),
  meta_image_hash text,
  meta_creative_id text,
  created_at    timestamptz not null default now()
);

-- ───────────────────────── 메타 구조 미러 ─────────────────────────

create table campaigns (
  id             uuid primary key default gen_random_uuid(),
  ad_account_id  uuid not null references ad_accounts (id) on delete cascade,
  strategy_id    uuid references strategies (id) on delete set null,
  meta_id        text unique,
  name           text not null,
  objective      text,
  daily_budget   bigint,
  status         text not null default 'PAUSED',
  synced_at      timestamptz
);

create table ad_sets (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references campaigns (id) on delete cascade,
  meta_id       text unique,
  name          text not null,
  targeting     jsonb not null default '{}',
  daily_budget  bigint,
  status        text not null default 'PAUSED',
  synced_at     timestamptz
);

create table ads (
  id           uuid primary key default gen_random_uuid(),
  ad_set_id    uuid not null references ad_sets (id) on delete cascade,
  creative_id  uuid references creatives (id) on delete set null,
  meta_id      text unique,
  name         text not null,
  status       text not null default 'PAUSED',
  synced_at    timestamptz
);

-- 광고 단위 일별 성과. 최근 28일은 매일 upsert.
create table insights_daily (
  ad_id           uuid not null references ads (id) on delete cascade,
  date            date not null,
  spend           bigint not null default 0,
  impressions     bigint not null default 0,
  reach           bigint not null default 0,
  clicks          bigint not null default 0,
  link_clicks     bigint not null default 0,
  landing_views   bigint not null default 0,
  leads           bigint not null default 0,
  add_to_cart     bigint not null default 0,
  purchases       bigint not null default 0,
  purchase_value  bigint not null default 0,
  raw             jsonb,                     -- 원본 actions 보관
  updated_at      timestamptz not null default now(),
  primary key (ad_id, date)
);

-- 메타 밖의 실제 전환 (CRM, 수기, CSV)
create table conversions (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references clients (id) on delete cascade,
  date              date not null,
  source            text not null,           -- crm/manual/csv/capi
  customer_ref      text,
  is_new_customer   boolean not null default true,
  revenue           bigint not null default 0,
  attributed_ad_id  uuid references ads (id) on delete set null
);

-- ───────────────────────── 재무 ─────────────────────────

create table contracts (
  client_id        uuid primary key references clients (id) on delete cascade,
  fee_model        text not null check (fee_model in ('percent', 'fixed', 'hybrid')),
  fee_percent      numeric(5, 2),            -- 15.00 = 15%
  fee_fixed        bigint,
  min_fee          bigint,
  spend_paid_by    text not null default 'client' check (spend_paid_by in ('client', 'agency')),
  prepaid_balance  bigint not null default 0,
  billing_day      int not null default 1 check (billing_day between 1 and 28),
  vat_rate         numeric(4, 2) not null default 10.00,
  started_on       date,
  ended_on         date
);

create table budgets (
  client_id        uuid not null references clients (id) on delete cascade,
  month            date not null,            -- 해당 월 1일
  planned_spend    bigint not null,
  alert_low_pct    int not null default 90,
  alert_high_pct   int not null default 110,
  primary key (client_id, month)
);

create table invoices (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients (id) on delete cascade,
  period      date not null,                 -- 청구 대상 월 1일
  subtotal    bigint not null,
  vat         bigint not null,
  total       bigint not null,
  status      text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  due_date    date,
  sent_at     timestamptz,
  paid_at     timestamptz,
  unique (client_id, period)
);

create table invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references invoices (id) on delete cascade,
  kind        text not null check (kind in ('ad_spend', 'agency_fee', 'creative', 'other')),
  description text not null,
  amount      bigint not null
);

create table expenses (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients (id) on delete set null, -- null = 공통 비용
  category    text not null check (category in ('creative', 'ai', 'tool', 'other')),
  description text,
  amount      bigint not null,
  date        date not null
);

-- ───────────────────────── 에이전트·승인 ─────────────────────────

create table agent_runs (
  id           uuid primary key default gen_random_uuid(),
  agent        text not null check (agent in ('orchestrator', 'strategist', 'creative', 'media_buyer', 'finance', 'analyst')),
  client_id    uuid references clients (id) on delete set null,
  input        jsonb,
  output       jsonb,
  status       text not null default 'running' check (status in ('queued', 'running', 'succeeded', 'failed', 'needs_human')),
  error        text,
  tokens_in    int,
  tokens_out   int,
  cost_krw     bigint,
  duration_ms  int,
  created_at   timestamptz not null default now()
);

create table approvals (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('strategy', 'creative', 'publish', 'optimization', 'budget_change', 'invoice')),
  client_id     uuid references clients (id) on delete cascade,
  agent_run_id  uuid references agent_runs (id) on delete set null,
  ref_table     text,
  ref_id        uuid,
  summary       text not null,
  payload       jsonb not null default '{}', -- 실행될 변경 내용과 근거
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'changes_requested', 'executed', 'failed')),
  decided_by    uuid references users (id),
  decided_at    timestamptz,
  comment       text,
  created_at    timestamptz not null default now()
);

create table recommendations (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references clients (id) on delete cascade,
  kind             text not null,            -- pause_ad, shift_budget, new_creative, refresh_audience ...
  evidence         jsonb not null default '{}',
  expected_impact  jsonb not null default '{}',
  approval_id      uuid references approvals (id) on delete set null,
  status           text not null default 'open' check (status in ('open', 'accepted', 'dismissed', 'expired')),
  created_at       timestamptz not null default now()
);

create table report_links (
  token       text primary key default encode(gen_random_bytes(24), 'hex'),
  client_id   uuid not null references clients (id) on delete cascade,
  expires_at  timestamptz not null,
  revoked     boolean not null default false,
  created_at  timestamptz not null default now()
);

create table audit_log (
  id      bigserial primary key,
  actor   text not null,                     -- user:<id> / agent:<name>
  action  text not null,
  target  text not null,
  before  jsonb,
  after   jsonb,
  at      timestamptz not null default now()
);

-- ───────────────────────── 집계 뷰 ─────────────────────────

create view v_client_daily as
select
  aa.client_id,
  i.date,
  sum(i.spend)          as spend,
  sum(i.impressions)    as impressions,
  sum(i.reach)          as reach,              -- 근사치(광고 간 중복 포함)
  sum(i.link_clicks)    as link_clicks,
  sum(i.landing_views)  as landing_views,
  sum(i.leads)          as leads,
  sum(i.purchases)      as purchases,
  sum(i.purchase_value) as purchase_value
from insights_daily i
join ads a          on a.id = i.ad_id
join ad_sets s      on s.id = a.ad_set_id
join campaigns c    on c.id = s.campaign_id
join ad_accounts aa on aa.id = c.ad_account_id
group by aa.client_id, i.date;

-- ───────────────────────── 인덱스 ─────────────────────────

create index on insights_daily (date);
create index on conversions (client_id, date);
create index on approvals (status, created_at desc);
create index on agent_runs (client_id, created_at desc);

-- RLS 정책은 1단계 마이그레이션에서 추가:
--   owner/operator: 전체 접근
--   viewer: client_members 에 속한 client_id 행만 select
