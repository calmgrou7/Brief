-- 보담체크 공통 DB 스키마 (모든 테이블 bd_ 접두어: 다른 서비스와 같은 프로젝트에 있어도 분리)
-- 웹앱 / 미니앱 / 플레이스토어 앱이 모두 이 스키마를 공유합니다.
-- 모든 쓰기는 서버(API, service_role)에서만 → RLS로 클라이언트 직접 접근 차단.

-- 방문자 (익명 기기 단위)
create table if not exists bd_visitors (
  id uuid primary key default gen_random_uuid(),
  anon_id text not null,
  channel text not null default 'web',          -- web | toss | android | kakao
  utm jsonb default '{}'::jsonb,
  referrer text,
  created_at timestamptz not null default now()
);
create index if not exists bd_visitors_anon_idx on bd_visitors(anon_id);

-- 보험 점검 결과 (리드 제출 전에는 개인정보 없음)
create table if not exists bd_diagnoses (
  id uuid primary key default gen_random_uuid(),
  anon_id text,
  lead_id uuid,
  channel text not null default 'web',
  answers jsonb not null,
  findings jsonb not null,
  score int not null default 0,
  created_at timestamptz not null default now()
);

-- AI 상담 대화 (전화번호·주민번호 마스킹 후 저장) → 커뮤니티/SEO 원천 데이터
create table if not exists bd_chat_messages (
  id uuid primary key default gen_random_uuid(),
  anon_id text,
  session_id text,
  channel text not null default 'web',
  role text not null check (role in ('user','assistant')),
  content text not null,
  topic text,
  suggest_consult boolean,
  created_at timestamptz not null default now()
);
create index if not exists bd_chat_topic_idx on bd_chat_messages(role, topic, created_at desc);

-- 고객 DB (리드). 휴대폰 번호 = 채널 통합 키
create table if not exists bd_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  phone_verified boolean not null default false,
  birth_year int,
  interest text,
  memo_customer text,            -- 고객이 남긴 말
  memo text,                     -- 운영자 메모
  score int not null default 0,
  grade text not null default 'COLD',   -- HOT | WARM | COLD
  status text not null default 'new',   -- new | contacted | consulting | contracted | lost
  first_channel text, last_channel text,
  channels text[] not null default '{}',
  anon_id text,
  diagnosis_id uuid references bd_diagnoses(id) on delete set null,
  utm_source text, utm_medium text, utm_campaign text,
  marketing_opt_in boolean not null default false,
  third_party_opt_in boolean not null default false,
  external_ids jsonb default '{}'::jsonb,   -- 미니앱 사용자키 등 (예: {"toss": "..."})
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bd_leads_grade_idx on bd_leads(grade, status, created_at desc);

-- 동의 이력 (항목·버전별, 삭제하지 않고 누적)
create table if not exists bd_consents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references bd_leads(id) on delete set null,  -- 리드 삭제 후에도 동의 증빙은 보존
  consent_key text not null,     -- privacy_required | sensitive | marketing | third_party
  version text not null,
  agreed boolean not null,
  channel text,
  ip text, user_agent text,
  created_at timestamptz not null default now()
);

-- 행동 이벤트 (퍼널 분석)
create table if not exists bd_events (
  id uuid primary key default gen_random_uuid(),
  anon_id text,
  name text not null,
  channel text not null default 'web',
  path text,
  props jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists bd_events_name_idx on bd_events(name, created_at desc);

-- 개인정보 삭제·수신거부 요청
create table if not exists bd_privacy_requests (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  type text not null,            -- delete | withdraw_marketing
  status text not null default 'pending',
  ip text, user_agent text,
  created_at timestamptz not null default now()
);

-- RLS: 정책을 만들지 않으면 anon/authenticated 키로는 어떤 행도 읽고 쓸 수 없습니다.
alter table bd_visitors enable row level security;
alter table bd_diagnoses enable row level security;
alter table bd_chat_messages enable row level security;
alter table bd_leads enable row level security;
alter table bd_consents enable row level security;
alter table bd_events enable row level security;
alter table bd_privacy_requests enable row level security;

-- 보유기간 경과 데이터 정리용 (Supabase cron 등으로 매일 실행 권장)
create or replace function bd_purge_expired() returns void language sql
  security invoker set search_path = public as $$
  delete from bd_leads where updated_at < now() - interval '1 year' and status in ('new','lost');
  delete from bd_chat_messages where created_at < now() - interval '2 years';
  delete from bd_events where created_at < now() - interval '1 year';
$$;
-- 공개 API(RPC)로 호출되지 않도록 차단 → service_role/cron만 실행
revoke execute on function bd_purge_expired() from public, anon, authenticated;
