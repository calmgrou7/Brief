-- =====================================================================
-- 동네전문가 MVP — 초기 스키마 (Supabase / Postgres 15+)
-- 기획서: docs/dongne-expert-mvp-plan.md (v0.2)
--
-- 설계 원칙
--  * 상태 변경(수락·출발·도착·완료·취소·노쇼)은 전부 RPC 함수로만 처리 → 앱에서 임의 조작 불가
--  * 결제 확인·환불 실행·정산 지급은 Edge Function(service_role)이 담당
--  * 반복 운영업무(미매칭 환불, 레벨 재계산)는 pg_cron 으로 자동 실행 (파일 하단)
--  * 위치 검색은 PostGIS 없이 위경도 + 하버사인 공식 (부산 규모 MVP에 충분)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. ENUM
-- ---------------------------------------------------------------------
create type expert_status       as enum ('pending', 'approved', 'rejected', 'banned');
create type request_type        as enum ('broadcast', 'direct');          -- 전체콜 / 지정콜
create type request_status      as enum (
  'pending_payment',       -- 요청 생성, 결제 전
  'matching',              -- 결제 완료, 전문가 매칭 대기
  'matched',               -- 전문가 수락
  'en_route',              -- 출발
  'arrived',               -- 도착 체크인
  'working',               -- 작업 중
  'completed',             -- 전문가 작업완료 처리
  'confirmed',             -- 고객 완료 확인 → 정산 대상
  'cancelled_by_customer',
  'cancelled_by_expert',
  'no_show',
  'expired'                -- 미매칭 타임아웃
);
create type payment_status      as enum ('ready', 'paid', 'refund_requested', 'refunded', 'partial_refunded', 'failed');
create type settlement_status   as enum ('pending', 'paid', 'held');
create type penalty_type        as enum ('expert_cancel', 'no_show', 'late', 'overcharge', 'other');
create type penalty_action      as enum ('warning', 'suspend', 'ban');
create type subscription_status as enum ('trial', 'active', 'past_due', 'cancelled');
create type report_status       as enum ('open', 'reviewing', 'resolved', 'rejected');
create type recurring_cycle     as enum ('weekly', 'biweekly', 'monthly');
create type document_type       as enum ('biz_license', 'id_card', 'certificate', 'criminal_record', 'portfolio', 'other');
create type document_status     as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------
-- 1. 운영 설정 (코드 수정 없이 관리자 화면에서 변경)
-- ---------------------------------------------------------------------
create table app_settings (
  key         text primary key,
  value       numeric not null,
  description text
);

insert into app_settings (key, value, description) values
  ('match_radius_steps_km_1',              3,   '전체콜 1차 반경(km)'),
  ('match_radius_steps_km_2',              5,   '전체콜 2차 반경(km)'),
  ('match_radius_steps_km_3',             10,   '전체콜 3차 반경(km)'),
  ('match_step_seconds',                 180,   '반경 확대 간격(초)'),
  ('match_timeout_minutes',               10,   '미매칭 자동환불 시간(분)'),
  ('broadcast_top_n',                     10,   '동시 푸시 인원'),
  ('broadcast_newbie_slots',               2,   '동시 푸시 중 새싹(Lv1) 보장 슬롯'),
  ('cancel_after_match_refund_rate',     100,   '매칭 후~출발 전 고객취소 환불률(%)'),
  ('no_show_grace_minutes',               30,   '약속시간 후 노쇼 신고 가능 시점(분)'),
  ('penalty_warning_hours',               24,   '1회 수락취소: 🔴주의 시간'),
  ('penalty_repeat_suspend_hours',        72,   '30일 내 2회+ 수락취소: 정지 시간'),
  ('penalty_no_show_suspend_hours',      168,   '노쇼: 정지 시간(7일)'),
  ('penalty_ban_threshold',                3,   '중대위반(정지) 누적 시 영구퇴출'),
  ('level_window_days',                   90,   '레벨 산정 기간(일)'),
  ('newbie_fee_discount_jobs',            10,   '새싹 수수료 할인 적용 건수'),
  ('newbie_fee_discount_rate',          0.10,   '새싹 수수료 할인폭(10%p)');

-- ---------------------------------------------------------------------
-- 2. 기준 데이터: 지역 / 카테고리 / 레벨 규칙
-- ---------------------------------------------------------------------
create table regions (
  code      text primary key,
  sido      text not null,
  name      text not null,
  is_active boolean not null default true
);

insert into regions (code, sido, name) values
  ('busan-jung','부산','중구'), ('busan-seo','부산','서구'), ('busan-dong','부산','동구'),
  ('busan-yeongdo','부산','영도구'), ('busan-busanjin','부산','부산진구'), ('busan-dongnae','부산','동래구'),
  ('busan-nam','부산','남구'), ('busan-buk','부산','북구'), ('busan-haeundae','부산','해운대구'),
  ('busan-saha','부산','사하구'), ('busan-geumjeong','부산','금정구'), ('busan-gangseo','부산','강서구'),
  ('busan-yeonje','부산','연제구'), ('busan-suyeong','부산','수영구'), ('busan-sasang','부산','사상구'),
  ('busan-gijang','부산','기장군');

create table categories (
  id                 smallint generated always as identity primary key,
  code               text unique not null,
  name               text not null,
  icon               text,
  base_fee           integer not null check (base_fee >= 0),            -- 출장비(=소개비), 원
  platform_fee_rate  numeric(4,3) not null check (platform_fee_rate between 0 and 1),
  level_premium      integer not null default 3000,                     -- Lv3+ 지정 시 추가 출장비
  min_expert_level   smallint not null default 1,                       -- 실버케어 등 신뢰 카테고리용
  required_badge     text,                                              -- 예: 'criminal_record'
  phase              smallint not null default 1,                       -- 1차/2차/확장
  is_active          boolean not null default true,
  sort_order         smallint not null default 0
);

insert into categories (code, name, icon, base_fee, platform_fee_rate, phase, sort_order, is_active, min_expert_level, required_badge) values
  ('lock',        '열쇠·도어락',      '🔑', 15000, 0.400, 1, 1, true,  1, null),
  ('leak',        '방수·누수',        '💧', 30000, 0.400, 1, 2, true,  1, null),
  ('drain',       '배관·하수구',      '🚿', 20000, 0.400, 1, 3, true,  1, null),
  ('cctv',        'CCTV',             '📹', 20000, 0.400, 1, 4, true,  1, null),
  ('internet',    '인터넷·공유기',    '🌐', 15000, 0.400, 1, 5, true,  1, null),
  ('wallpaper',   '도배·장판',        '🧱', 20000, 0.400, 2, 6, false, 1, null),
  ('moving',      '이사·용달',        '🚚', 20000, 0.400, 2, 7, false, 1, null),
  ('cleaning',    '입주·이사청소',    '🧹', 20000, 0.400, 2, 8, false, 1, null),
  ('aircon',      '에어컨',           '❄️', 20000, 0.400, 2, 9, false, 1, null),
  ('electric',    '전기·조명',        '🔌', 20000, 0.400, 2, 10, false, 1, null),
  -- 확장(실버케어/1인가구): 비활성 상태로 미리 등록
  ('silver_visit','실버 안부방문',    '👵', 20000, 0.300, 3, 20, false, 3, 'criminal_record'),
  ('silver_digital','디지털 도우미',  '📱', 15000, 0.300, 3, 21, false, 3, 'criminal_record'),
  ('solo_fix',    '1인가구 소소한수리','🛠️', 15000, 0.400, 3, 30, false, 1, null);

create table level_rules (
  level               smallint primary key check (level between 1 and 4),
  name                text not null,
  signal              text not null,                 -- 신호등 표시
  min_jobs            integer not null,              -- 누적 완료 건수
  min_rating          numeric(2,1),                  -- 기간 내 평균 별점
  min_completion_rate numeric(4,3),                  -- 기간 내 수락 후 완료율
  min_rebook_rate     numeric(4,3),                  -- 재이용 고객 비율
  require_badge       text,
  fee_discount        numeric(4,3) not null default 0 -- 수수료율 인하폭
);

insert into level_rules values
  (1, '새싹', '🟡',   0, null, null, null, null,          0.000),
  (2, '인증', '🟢',  10, 4.5,  0.950, null, null,         0.000),
  (3, '우수', '🟢⭐', 50, 4.7,  0.980, null, null,         0.050),
  (4, '마스터','🟢👑',150, 4.8,  0.980, 0.200, 'certificate', 0.080);

-- ---------------------------------------------------------------------
-- 3. 회원
-- ---------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  phone       text unique,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table customer_addresses (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles (id) on delete cascade,
  label       text,
  address     text not null,
  detail      text,
  region_code text references regions (code),
  lat         double precision not null,
  lng         double precision not null,
  is_default  boolean not null default false
);

create table expert_profiles (
  user_id          uuid primary key references profiles (id) on delete cascade,
  display_name     text not null,
  intro            text,
  career_years     smallint,
  biz_number       text,
  photo_url        text,
  status           expert_status not null default 'pending',
  -- 신호등 레벨 (자동 계산, 앱에서 수정 불가)
  level            smallint not null default 1 references level_rules (level),
  level_updated_at timestamptz,
  caution_until    timestamptz,               -- 🔴 주의/정지 종료 시각
  trust_score      numeric(5,2) not null default 50,
  verified_badges  text[] not null default '{}',   -- certificate, criminal_record, female 등
  -- 집계 (트리거/배치가 갱신)
  completed_jobs   integer not null default 0,
  avg_rating       numeric(3,2),
  review_count     integer not null default 0,
  -- 실시간
  is_online        boolean not null default false,
  last_lat         double precision,
  last_lng         double precision,
  last_located_at  timestamptz,
  approved_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index expert_online_idx on expert_profiles (is_online, status) where is_online and status = 'approved';
create index expert_location_idx on expert_profiles (last_lat, last_lng);

-- 정산계좌는 민감정보 → 별도 테이블(본인·관리자만)
create table expert_payout_accounts (
  expert_id    uuid primary key references expert_profiles (user_id) on delete cascade,
  bank_name    text not null,
  account_no   text not null,
  holder_name  text not null,
  updated_at   timestamptz not null default now()
);

create table expert_categories (
  expert_id   uuid references expert_profiles (user_id) on delete cascade,
  category_id smallint references categories (id),
  primary key (expert_id, category_id)
);

create table expert_regions (
  expert_id   uuid references expert_profiles (user_id) on delete cascade,
  region_code text references regions (code),
  primary key (expert_id, region_code)
);

create table expert_documents (
  id           bigint generated always as identity primary key,
  expert_id    uuid not null references expert_profiles (user_id) on delete cascade,
  doc_type     document_type not null,
  storage_path text not null,                 -- Supabase Storage (private bucket)
  status       document_status not null default 'pending',
  reviewed_at  timestamptz,
  note         text,
  created_at   timestamptz not null default now()
);

create table level_history (
  id          bigint generated always as identity primary key,
  expert_id   uuid not null references expert_profiles (user_id) on delete cascade,
  from_level  smallint not null,
  to_level    smallint not null,
  reason      text,
  created_at  timestamptz not null default now()
);

create table subscriptions (
  id            bigint generated always as identity primary key,
  expert_id     uuid not null references expert_profiles (user_id) on delete cascade,
  plan          text not null default 'basic',
  monthly_fee   integer not null,
  status        subscription_status not null default 'trial',
  billing_key   text,                         -- PG 정기결제 키 (service_role 전용)
  period_start  date not null,
  period_end    date not null,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. 확장 대비: 보호자 대리신청 / 정기 서비스
-- ---------------------------------------------------------------------
create table guardians (
  id               bigint generated always as identity primary key,
  guardian_user_id uuid not null references profiles (id) on delete cascade,
  recipient_name   text not null,
  recipient_phone  text,
  address          text not null,
  lat              double precision,
  lng              double precision,
  relation         text,
  created_at       timestamptz not null default now()
);

create table recurring_plans (
  id           bigint generated always as identity primary key,
  customer_id  uuid not null references profiles (id) on delete cascade,
  category_id  smallint not null references categories (id),
  expert_id    uuid references expert_profiles (user_id),
  guardian_id  bigint references guardians (id),
  cycle        recurring_cycle not null,
  is_active    boolean not null default true,
  next_run_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. 요청(콜) / 결제 / 정산
-- ---------------------------------------------------------------------
create table requests (
  id                 bigint generated always as identity primary key,
  customer_id        uuid not null references profiles (id),
  category_id        smallint not null references categories (id),
  type               request_type not null default 'broadcast',
  target_expert_id   uuid references expert_profiles (user_id),   -- 지정콜 대상
  min_level          smallint not null default 1 check (min_level between 1 and 4),
  -- 위치
  address            text not null,
  address_detail     text,
  region_code        text references regions (code),
  lat                double precision not null,
  lng                double precision not null,
  -- 내용
  symptom            text,
  photos             text[] not null default '{}',
  scheduled_at       timestamptz,                    -- null = 지금 바로
  -- 서비스 받는 분(대리신청 대비)
  recipient_name     text,
  recipient_phone    text,
  guardian_id        bigint references guardians (id),
  recurring_plan_id  bigint references recurring_plans (id),
  -- 금액 (트리거가 계산, 클라이언트 입력 무시)
  base_fee           integer not null default 0,
  level_premium      integer not null default 0,
  total_fee          integer not null default 0,
  -- 진행
  status             request_status not null default 'pending_payment',
  expert_id          uuid references expert_profiles (user_id),
  match_radius_km    numeric(4,1),
  paid_at            timestamptz,
  matched_at         timestamptz,
  departed_at        timestamptz,
  arrived_at         timestamptz,
  arrived_lat        double precision,
  arrived_lng        double precision,
  completed_at       timestamptz,
  confirmed_at       timestamptz,
  cancelled_at       timestamptz,
  cancel_reason      text,
  created_at         timestamptz not null default now()
);
create index requests_status_idx   on requests (status, created_at);
create index requests_customer_idx on requests (customer_id, created_at desc);
create index requests_expert_idx   on requests (expert_id, created_at desc);
create index requests_geo_idx      on requests (lat, lng) where status = 'matching';

-- 상태 변경 이력 (분쟁 대응·KPI 분석용)
create table request_events (
  id          bigint generated always as identity primary key,
  request_id  bigint not null references requests (id) on delete cascade,
  from_status request_status,
  to_status   request_status not null,
  actor_id    uuid,
  note        text,
  created_at  timestamptz not null default now()
);
create index request_events_req_idx on request_events (request_id);

-- 전체콜 발송 기록 (누구에게 언제 푸시했는지)
create table request_dispatches (
  request_id  bigint references requests (id) on delete cascade,
  expert_id   uuid references expert_profiles (user_id) on delete cascade,
  radius_km   numeric(4,1) not null,
  distance_km numeric(6,2),
  sent_at     timestamptz not null default now(),
  primary key (request_id, expert_id)
);

create table payments (
  id              bigint generated always as identity primary key,
  request_id      bigint not null unique references requests (id),
  amount          integer not null,
  pg_provider     text not null default 'portone',
  pg_payment_id   text unique,
  status          payment_status not null default 'ready',
  refund_amount   integer not null default 0,
  refund_reason   text,
  paid_at         timestamptz,
  refunded_at     timestamptz,
  created_at      timestamptz not null default now()
);

create table settlements (
  id            bigint generated always as identity primary key,
  request_id    bigint not null unique references requests (id),
  expert_id     uuid not null references expert_profiles (user_id),
  gross_amount  integer not null,        -- 고객 결제 출장비
  fee_rate      numeric(4,3) not null,   -- 적용 수수료율(레벨/새싹 할인 반영)
  fee_amount    integer not null,        -- 플랫폼 수익
  net_amount    integer not null,        -- 전문가 지급액
  status        settlement_status not null default 'pending',
  paid_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index settlements_expert_idx on settlements (expert_id, status);

-- 현장 추가금: 정산 대상 아님. 분쟁 대비 기록 + 고객 확인
create table extra_charges (
  id                 bigint generated always as identity primary key,
  request_id         bigint not null references requests (id) on delete cascade,
  amount             integer not null check (amount >= 0),
  description        text not null,
  customer_agreed_at timestamptz,
  created_at         timestamptz not null default now()
);

create table reviews (
  id          bigint generated always as identity primary key,
  request_id  bigint not null unique references requests (id),
  customer_id uuid not null references profiles (id),
  expert_id   uuid not null references expert_profiles (user_id),
  rating      smallint not null check (rating between 1 and 5),
  content     text,
  created_at  timestamptz not null default now()
);
create index reviews_expert_idx on reviews (expert_id, created_at desc);

create table penalties (
  id          bigint generated always as identity primary key,
  expert_id   uuid not null references expert_profiles (user_id) on delete cascade,
  request_id  bigint references requests (id),
  type        penalty_type not null,
  action      penalty_action,             -- 트리거가 결정
  until       timestamptz,
  note        text,
  created_at  timestamptz not null default now()
);
create index penalties_expert_idx on penalties (expert_id, created_at desc);

create table reports (
  id          bigint generated always as identity primary key,
  request_id  bigint references requests (id),
  reporter_id uuid not null references profiles (id),
  reason      text not null,
  status      report_status not null default 'open',
  admin_note  text,
  created_at  timestamptz not null default now()
);

create table chat_messages (
  id          bigint generated always as identity primary key,
  request_id  bigint not null references requests (id) on delete cascade,
  sender_id   uuid not null references profiles (id),
  body        text not null,
  created_at  timestamptz not null default now()
);
create index chat_req_idx on chat_messages (request_id, created_at);

-- =====================================================================
-- 6. 공통 함수
-- =====================================================================
create or replace function setting(p_key text) returns numeric
language sql stable security definer set search_path = public as $$
  select value from app_settings where key = p_key
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

create or replace function haversine_km(lat1 double precision, lng1 double precision,
                                        lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;

-- 전문가가 지금 콜을 받을 수 있는 상태인가 (승인 + 🔴주의/정지 아님)
create or replace function expert_is_active(p_expert uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from expert_profiles
    where user_id = p_expert and status = 'approved'
      and (caution_until is null or caution_until < now())
  )
$$;

-- 해당 카테고리 콜을 받을 자격 (분야 등록 + 카테고리 최소레벨 + 필수배지)
create or replace function expert_can_take(p_expert uuid, p_category smallint, p_min_level smallint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from expert_profiles e
    join expert_categories ec on ec.expert_id = e.user_id and ec.category_id = p_category
    join categories c on c.id = p_category
    where e.user_id = p_expert
      and e.level >= greatest(p_min_level, c.min_expert_level)
      and (c.required_badge is null or c.required_badge = any (e.verified_badges))
  ) and expert_is_active(p_expert)
$$;

create or replace function log_request_event(p_request bigint, p_from request_status,
                                             p_to request_status, p_note text default null)
returns void language sql security definer set search_path = public as $$
  insert into request_events (request_id, from_status, to_status, actor_id, note)
  values (p_request, p_from, p_to, auth.uid(), p_note)
$$;

-- =====================================================================
-- 7. 요청 생성 시 금액 계산 (클라이언트가 보낸 금액·상태 무시)
-- =====================================================================
create or replace function trg_requests_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c categories%rowtype;
  target_level smallint;
begin
  select * into c from categories where id = new.category_id;
  if not found or not c.is_active then
    raise exception '이용할 수 없는 카테고리입니다';
  end if;

  if new.type = 'direct' then
    if new.target_expert_id is null then
      raise exception '지정콜은 전문가를 선택해야 합니다';
    end if;
    select level into target_level from expert_profiles where user_id = new.target_expert_id;
    if not expert_can_take(new.target_expert_id, new.category_id, 1::smallint) then
      raise exception '선택한 전문가는 현재 이 분야 콜을 받을 수 없습니다';
    end if;
  else
    new.target_expert_id := null;
  end if;

  new.customer_id   := coalesce(auth.uid(), new.customer_id);
  new.min_level     := greatest(new.min_level, c.min_expert_level);
  new.base_fee      := c.base_fee;
  new.level_premium := case when greatest(new.min_level, coalesce(target_level, 0)) >= 3
                            then c.level_premium else 0 end;
  new.total_fee     := new.base_fee + new.level_premium;
  new.status        := 'pending_payment';
  new.expert_id     := null;
  return new;
end $$;

create trigger requests_before_insert before insert on requests
for each row execute function trg_requests_before_insert();

-- =====================================================================
-- 8. 결제 확인 (Edge Function이 PG 검증 후 service_role로 호출)
-- =====================================================================
create or replace function confirm_payment(p_request bigint, p_pg_payment_id text, p_amount integer)
returns requests language plpgsql security definer set search_path = public as $$
declare r requests;
begin
  select * into r from requests where id = p_request for update;
  if r.status <> 'pending_payment' then raise exception '결제 대기 상태가 아닙니다'; end if;
  if p_amount <> r.total_fee then raise exception '결제 금액 불일치 (%, %)', p_amount, r.total_fee; end if;

  insert into payments (request_id, amount, pg_payment_id, status, paid_at)
  values (p_request, p_amount, p_pg_payment_id, 'paid', now());

  update requests set status = 'matching', paid_at = now(),
         match_radius_km = setting('match_radius_steps_km_1')
  where id = p_request returning * into r;
  perform log_request_event(p_request, 'pending_payment', 'matching', 'payment confirmed');
  return r;
end $$;

-- =====================================================================
-- 9. 매칭: 주변 전문가 검색 / 전체콜 발송 대상 / 수락
-- =====================================================================

-- 고객용: 지도에서 주변 전문가 찾기 (신호등 레벨 필터)
create or replace function search_experts(p_lat double precision, p_lng double precision,
                                          p_category smallint, p_radius_km numeric default 5,
                                          p_min_level smallint default 1, p_online_only boolean default false)
returns table (expert_id uuid, display_name text, photo_url text, level smallint, signal text,
               level_name text, is_caution boolean, avg_rating numeric, review_count integer,
               completed_jobs integer, is_online boolean, distance_km double precision, badges text[])
language sql stable security definer set search_path = public as $$
  select e.user_id, e.display_name, e.photo_url, e.level,
         case when e.caution_until > now() then '🔴' else lr.signal end,
         lr.name, coalesce(e.caution_until > now(), false),
         e.avg_rating, e.review_count, e.completed_jobs, e.is_online,
         haversine_km(p_lat, p_lng, e.last_lat, e.last_lng) as d, e.verified_badges
  from expert_profiles e
  join expert_categories ec on ec.expert_id = e.user_id and ec.category_id = p_category
  join level_rules lr on lr.level = e.level
  where e.status = 'approved'
    and e.level >= p_min_level
    and (not p_online_only or e.is_online)
    and e.last_lat is not null
    -- bounding box 로 1차 필터 (위도 1도 ≈ 111km)
    and e.last_lat between p_lat - p_radius_km / 111.0 and p_lat + p_radius_km / 111.0
    and e.last_lng between p_lng - p_radius_km / 88.0  and p_lng + p_radius_km / 88.0
    and haversine_km(p_lat, p_lng, e.last_lat, e.last_lng) <= p_radius_km
  order by e.level desc, e.trust_score desc, d
  limit 100
$$;

-- 서버용: 전체콜 푸시 대상 선정 (레벨 → 신뢰점수 → 거리, 새싹 슬롯 보장)
-- Edge Function(dispatch)이 호출 → 결과로 FCM 발송 → request_dispatches 기록
create or replace function pick_broadcast_targets(p_request bigint, p_radius_km numeric)
returns table (expert_id uuid, level smallint, distance_km double precision)
language plpgsql security definer set search_path = public as $$
declare
  r requests;
  n int := setting('broadcast_top_n')::int;
  newbie int := setting('broadcast_newbie_slots')::int;
begin
  select * into r from requests where id = p_request;
  if r.status <> 'matching' or r.type <> 'broadcast' then return; end if;

  return query
  with cand as (
    select e.user_id as uid, e.level as lvl, e.trust_score as score,
           haversine_km(r.lat, r.lng, e.last_lat, e.last_lng) as d
    from expert_profiles e
    where e.is_online
      and e.last_lat is not null
      and e.last_lat between r.lat - p_radius_km / 111.0 and r.lat + p_radius_km / 111.0
      and e.last_lng between r.lng - p_radius_km / 88.0  and r.lng + p_radius_km / 88.0
      and haversine_km(r.lat, r.lng, e.last_lat, e.last_lng) <= p_radius_km
      and expert_can_take(e.user_id, r.category_id, r.min_level)
      and not exists (select 1 from request_dispatches x
                      where x.request_id = r.id and x.expert_id = e.user_id)
  ),
  ranked as (
    select c.*, row_number() over (order by c.lvl desc, c.score desc, c.d) as rk,
                row_number() over (partition by (c.lvl = 1) order by c.score desc, c.d) as rk_newbie
    from cand c
  ),
  newbies as (select * from ranked k where k.lvl = 1 and k.rk_newbie <= newbie),
  top_n as (
    select * from ranked k where k.uid not in (select nb.uid from newbies nb)
    order by k.rk limit greatest(n - (select count(*) from newbies), 0)
  )
  select u.uid, u.lvl, u.d from (select * from top_n union all select * from newbies) u
  order by u.lvl desc, u.d;
end $$;

-- 전문가용: 역방향 콜 — 주변 미매칭 요청 보기 (정확한 주소는 수락 후 공개)
create or replace function get_open_requests(p_lat double precision, p_lng double precision,
                                             p_radius_km numeric default 5)
returns table (request_id bigint, category_id smallint, region_code text, symptom text,
               total_fee integer, scheduled_at timestamptz, approx_lat double precision,
               approx_lng double precision, distance_km double precision, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.category_id, r.region_code, r.symptom, r.total_fee, r.scheduled_at,
         round(r.lat::numeric, 2)::double precision, round(r.lng::numeric, 2)::double precision,  -- 약 1km 단위로 흐림
         haversine_km(p_lat, p_lng, r.lat, r.lng) as d, r.created_at
  from requests r
  where r.status = 'matching'
    and r.type = 'broadcast'
    and r.lat between p_lat - p_radius_km / 111.0 and p_lat + p_radius_km / 111.0
    and r.lng between p_lng - p_radius_km / 88.0  and p_lng + p_radius_km / 88.0
    and haversine_km(p_lat, p_lng, r.lat, r.lng) <= p_radius_km
    and expert_can_take(auth.uid(), r.category_id, r.min_level)
  order by r.created_at
$$;

-- 수락: 행 잠금으로 동시 수락 방지 (먼저 수락한 1명만 성공)
create or replace function accept_request(p_request bigint)
returns requests language plpgsql security definer set search_path = public as $$
declare r requests; me uuid := auth.uid();
begin
  select * into r from requests where id = p_request for update;
  if not found then raise exception '요청을 찾을 수 없습니다'; end if;
  if r.status <> 'matching' then raise exception '이미 매칭되었거나 종료된 요청입니다'; end if;
  if r.type = 'direct' and r.target_expert_id <> me then raise exception '지정된 전문가만 수락할 수 있습니다'; end if;
  if r.customer_id = me then raise exception '본인 요청은 수락할 수 없습니다'; end if;
  if not expert_can_take(me, r.category_id, r.min_level) then
    raise exception '이 요청을 수락할 자격이 없습니다 (분야/레벨/주의 상태 확인)';
  end if;

  update requests set status = 'matched', expert_id = me, matched_at = now()
  where id = p_request returning * into r;
  perform log_request_event(p_request, 'matching', 'matched');
  return r;
end $$;

-- 지정콜 거절 → 즉시 환불 대상으로 전환
create or replace function decline_direct_request(p_request bigint)
returns requests language plpgsql security definer set search_path = public as $$
declare r requests;
begin
  select * into r from requests where id = p_request for update;
  if r.type <> 'direct' or r.target_expert_id <> auth.uid() or r.status <> 'matching' then
    raise exception '거절할 수 없는 요청입니다';
  end if;
  update requests set status = 'expired', cancelled_at = now(), cancel_reason = 'direct_declined'
  where id = p_request returning * into r;
  update payments set status = 'refund_requested', refund_amount = amount, refund_reason = '지정 전문가 거절'
  where request_id = p_request;
  perform log_request_event(p_request, 'matching', 'expired', 'direct declined');
  return r;
end $$;

-- =====================================================================
-- 10. 진행 단계 (전문가: 출발 → 도착 → 작업중 → 완료 / 고객: 확인)
-- =====================================================================
create or replace function advance_request(p_request bigint, p_to request_status,
                                           p_lat double precision default null,
                                           p_lng double precision default null)
returns requests language plpgsql security definer set search_path = public as $$
declare r requests; me uuid := auth.uid(); from_s request_status;
begin
  select * into r from requests where id = p_request for update;
  if not found then raise exception '요청을 찾을 수 없습니다'; end if;
  from_s := r.status;

  if p_to in ('en_route', 'arrived', 'working', 'completed') then
    if r.expert_id is distinct from me then raise exception '담당 전문가만 처리할 수 있습니다'; end if;
    if not ((from_s = 'matched'  and p_to = 'en_route') or
            (from_s = 'en_route' and p_to = 'arrived')  or
            (from_s = 'arrived'  and p_to = 'working')  or
            (from_s = 'working'  and p_to = 'completed')) then
      raise exception '잘못된 단계 변경입니다 (% → %)', from_s, p_to;
    end if;
    if p_to = 'arrived' and (p_lat is null or p_lng is null) then
      raise exception '도착 체크인은 현재 위치가 필요합니다';
    end if;
  elsif p_to = 'confirmed' then
    if r.customer_id is distinct from me then raise exception '고객만 완료 확인할 수 있습니다'; end if;
    if from_s <> 'completed' then raise exception '작업완료 후에 확인할 수 있습니다'; end if;
  else
    raise exception '이 함수로 변경할 수 없는 상태입니다: %', p_to;
  end if;

  update requests set
    status       = p_to,
    departed_at  = case when p_to = 'en_route'  then now() else departed_at end,
    arrived_at   = case when p_to = 'arrived'   then now() else arrived_at end,
    arrived_lat  = case when p_to = 'arrived'   then p_lat else arrived_lat end,
    arrived_lng  = case when p_to = 'arrived'   then p_lng else arrived_lng end,
    completed_at = case when p_to = 'completed' then now() else completed_at end,
    confirmed_at = case when p_to = 'confirmed' then now() else confirmed_at end
  where id = p_request returning * into r;

  perform log_request_event(p_request, from_s, p_to,
    case when p_to = 'arrived'
         then format('체크인 거리 %s km', round(haversine_km(r.lat, r.lng, p_lat, p_lng)::numeric, 2)) end);
  return r;
end $$;

-- 고객 확인 → 정산 레코드 자동 생성 (레벨/새싹 할인 반영 수수료)
create or replace function trg_requests_after_confirm() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base_rate numeric; discount numeric; jobs int; rate numeric; fee int;
begin
  select c.platform_fee_rate into base_rate from categories c where c.id = new.category_id;
  select lr.fee_discount, e.completed_jobs into discount, jobs
  from expert_profiles e join level_rules lr on lr.level = e.level where e.user_id = new.expert_id;

  if jobs < setting('newbie_fee_discount_jobs') then
    discount := greatest(discount, setting('newbie_fee_discount_rate'));
  end if;
  rate := greatest(base_rate - discount, 0);
  fee  := round(new.total_fee * rate);

  insert into settlements (request_id, expert_id, gross_amount, fee_rate, fee_amount, net_amount)
  values (new.id, new.expert_id, new.total_fee, rate, fee, new.total_fee - fee);

  update expert_profiles set completed_jobs = completed_jobs + 1 where user_id = new.expert_id;
  return new;
end $$;

create trigger requests_after_confirm after update of status on requests
for each row when (new.status = 'confirmed' and old.status is distinct from 'confirmed')
execute function trg_requests_after_confirm();

-- =====================================================================
-- 11. 취소 / 노쇼 / 미매칭 만료  (환불은 payments.status='refund_requested' →
--     Edge Function이 PG 환불 API 호출 후 'refunded'로 변경)
-- =====================================================================
create or replace function cancel_request(p_request bigint, p_reason text default null)
returns requests language plpgsql security definer set search_path = public as $$
declare r requests; me uuid := auth.uid(); refund_rate numeric; from_s request_status;
begin
  select * into r from requests where id = p_request for update;
  if not found then raise exception '요청을 찾을 수 없습니다'; end if;
  from_s := r.status;

  if r.customer_id = me then
    -- 고객 취소: 시점별 환불률
    refund_rate := case
      when from_s in ('pending_payment', 'matching') then 100
      when from_s = 'matched' then setting('cancel_after_match_refund_rate')
      when from_s in ('en_route', 'arrived', 'working') then 0
      else null end;
    if refund_rate is null then raise exception '취소할 수 없는 상태입니다'; end if;

    update requests set status = 'cancelled_by_customer', cancelled_at = now(), cancel_reason = p_reason
    where id = p_request returning * into r;
    update payments set status = case when refund_rate > 0 then 'refund_requested'::payment_status else status end,
           refund_amount = round(amount * refund_rate / 100), refund_reason = '고객 취소'
    where request_id = p_request;

  elsif r.expert_id = me then
    -- 전문가 수락 후 취소: 고객 100% 환불 + 페널티
    if from_s not in ('matched', 'en_route', 'arrived') then raise exception '취소할 수 없는 상태입니다'; end if;
    update requests set status = 'cancelled_by_expert', cancelled_at = now(), cancel_reason = p_reason
    where id = p_request returning * into r;
    update payments set status = 'refund_requested', refund_amount = amount, refund_reason = '전문가 취소'
    where request_id = p_request;
    insert into penalties (expert_id, request_id, type, note) values (me, p_request, 'expert_cancel', p_reason);
  else
    raise exception '취소 권한이 없습니다';
  end if;

  perform log_request_event(p_request, from_s, r.status, p_reason);
  return r;
end $$;

-- 고객 노쇼 신고: 약속시간(+유예) 지났는데 도착 체크인 없음 → 자동 노쇼 처리
create or replace function report_no_show(p_request bigint)
returns requests language plpgsql security definer set search_path = public as $$
declare r requests; due timestamptz; from_s request_status;
begin
  select * into r from requests where id = p_request for update;
  if r.customer_id is distinct from auth.uid() then raise exception '고객만 신고할 수 있습니다'; end if;
  if r.status not in ('matched', 'en_route') then raise exception '노쇼 신고 대상이 아닙니다'; end if;
  due := coalesce(r.scheduled_at, r.matched_at) + make_interval(mins => setting('no_show_grace_minutes')::int);
  if now() < due then
    raise exception '%까지 기다린 후 신고할 수 있습니다', to_char(due at time zone 'Asia/Seoul', 'HH24:MI');
  end if;

  from_s := r.status;
  update requests set status = 'no_show', cancelled_at = now(), cancel_reason = 'no_show'
  where id = p_request returning * into r;
  update payments set status = 'refund_requested', refund_amount = amount, refund_reason = '전문가 노쇼'
  where request_id = p_request;
  insert into penalties (expert_id, request_id, type) values (r.expert_id, p_request, 'no_show');
  perform log_request_event(p_request, from_s, 'no_show');
  return r;
end $$;

-- 미매칭 자동 만료 + 반경 확대 (pg_cron 1분마다)
create or replace function process_matching_queue()
returns table (expanded integer, expired integer)
language plpgsql security definer set search_path = public as $$
declare n_exp int; n_expand int; step int := setting('match_step_seconds')::int;
begin
  with e as (
    update requests set status = 'expired', cancelled_at = now(), cancel_reason = 'match_timeout'
    where status = 'matching'
      and paid_at < now() - make_interval(mins => setting('match_timeout_minutes')::int)
    returning id
  ), p as (
    update payments set status = 'refund_requested', refund_amount = amount, refund_reason = '미매칭 자동환불'
    where request_id in (select id from e)
  ), l as (
    insert into request_events (request_id, from_status, to_status, note)
    select id, 'matching', 'expired', 'match timeout' from e
  )
  select count(*) into n_exp from e;

  -- 경과 시간에 따라 반경 단계 상향 (dispatch Edge Function 이 새 반경으로 추가 발송)
  with x as (
    update requests set match_radius_km = case
        when paid_at < now() - make_interval(secs => step * 2) then setting('match_radius_steps_km_3')
        when paid_at < now() - make_interval(secs => step)     then setting('match_radius_steps_km_2')
        else match_radius_km end
    where status = 'matching' and type = 'broadcast'
      and match_radius_km < setting('match_radius_steps_km_3')
      and paid_at < now() - make_interval(secs => step)
    returning id
  ) select count(*) into n_expand from x;

  return query select n_expand, n_exp;
end $$;

-- =====================================================================
-- 12. 페널티 자동 판정 → 🔴 caution_until 설정
-- =====================================================================
create or replace function trg_penalties_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare recent_cancels int; major int;
begin
  if new.action is null then
    if new.type = 'no_show' then
      new.action := 'suspend';
      new.until  := now() + make_interval(hours => setting('penalty_no_show_suspend_hours')::int);
    elsif new.type = 'expert_cancel' then
      select count(*) into recent_cancels from penalties
      where expert_id = new.expert_id and type = 'expert_cancel' and created_at > now() - interval '30 days';
      if recent_cancels >= 1 then
        new.action := 'suspend';
        new.until  := now() + make_interval(hours => setting('penalty_repeat_suspend_hours')::int);
      else
        new.action := 'warning';
        new.until  := now() + make_interval(hours => setting('penalty_warning_hours')::int);
      end if;
    else
      new.action := 'warning';
      new.until  := now() + make_interval(hours => setting('penalty_warning_hours')::int);
    end if;
  end if;

  select count(*) + case when new.action = 'suspend' then 1 else 0 end into major
  from penalties where expert_id = new.expert_id and action = 'suspend';
  if major >= setting('penalty_ban_threshold') or new.action = 'ban' then
    new.action := 'ban';
    update expert_profiles set status = 'banned', is_online = false where user_id = new.expert_id;
  end if;

  update expert_profiles
  set caution_until = greatest(coalesce(caution_until, now()), new.until),
      is_online = false,   -- 🔴 기간 동안 콜 수신 중지 (끝나면 전문가가 다시 출근 ON)
      trust_score = greatest(trust_score - case new.action when 'warning' then 5 else 15 end, 0)
  where user_id = new.expert_id;
  return new;
end $$;

create trigger penalties_before_insert before insert on penalties
for each row execute function trg_penalties_before_insert();

-- =====================================================================
-- 13. 리뷰 → 평점 집계
-- =====================================================================
create or replace function trg_reviews_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare r requests;
begin
  select * into r from requests where id = new.request_id;
  if r.status <> 'confirmed' or r.customer_id <> auth.uid() then
    raise exception '완료 확인한 본인 요청만 리뷰할 수 있습니다';
  end if;
  new.customer_id := r.customer_id;
  new.expert_id   := r.expert_id;
  return new;
end $$;

create trigger reviews_before_insert before insert on reviews
for each row execute function trg_reviews_before_insert();

create or replace function trg_reviews_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update expert_profiles e set
    avg_rating   = s.avg_r,
    review_count = s.cnt
  from (select avg(rating)::numeric(3,2) avg_r, count(*) cnt from reviews where expert_id = new.expert_id) s
  where e.user_id = new.expert_id;
  return null;
end $$;

create trigger reviews_after_insert after insert on reviews
for each row execute function trg_reviews_after_insert();

-- =====================================================================
-- 14. 🚦 신호등 레벨 재계산 (pg_cron 매일 새벽) — 승급/강등 자동
-- =====================================================================
create or replace function recompute_expert_levels()
returns integer language plpgsql security definer set search_path = public as $$
declare changed int := 0; win interval := make_interval(days => setting('level_window_days')::int);
begin
  with stats as (
    select e.user_id, e.level as cur_level, e.completed_jobs, e.verified_badges,
      (select avg(rv.rating) from reviews rv
        where rv.expert_id = e.user_id and rv.created_at > now() - win) as rating_w,
      (select count(*) filter (where q.status = 'confirmed')::numeric
              / nullif(count(*) filter (where q.status in ('confirmed','cancelled_by_expert','no_show')), 0)
        from requests q where q.expert_id = e.user_id and q.matched_at > now() - win) as completion_w,
      (select count(*) filter (where cnt >= 2)::numeric / nullif(count(*), 0)
        from (select customer_id, count(*) cnt from requests q
              where q.expert_id = e.user_id and q.status = 'confirmed' group by customer_id) t) as rebook
    from expert_profiles e where e.status = 'approved'
  ),
  target as (
    select s.*, (
      select max(lr.level) from level_rules lr
      where s.completed_jobs >= lr.min_jobs
        and (lr.min_rating is null          or coalesce(s.rating_w, 0)     >= lr.min_rating)
        and (lr.min_completion_rate is null or coalesce(s.completion_w, 0) >= lr.min_completion_rate)
        and (lr.min_rebook_rate is null     or coalesce(s.rebook, 0)       >= lr.min_rebook_rate)
        and (lr.require_badge is null       or lr.require_badge = any (s.verified_badges))
    ) as new_level,
    -- 신뢰점수 0~100: 별점 50% + 완료율 40% + 경험 10% − 최근 페널티
    round(least(100, greatest(0,
        coalesce(s.rating_w, 4.0) / 5 * 50
      + coalesce(s.completion_w, 0.9) * 40
      + least(s.completed_jobs, 100) / 10.0
      - (select count(*) from penalties p where p.expert_id = s.user_id and p.created_at > now() - win) * 10
    )), 2) as score
    from stats s
  ),
  hist as (
    insert into level_history (expert_id, from_level, to_level, reason)
    select user_id, cur_level, new_level,
           format('jobs=%s rating=%s completion=%s rebook=%s', completed_jobs,
                  round(rating_w, 2), round(completion_w, 3), round(rebook, 3))
    from target where new_level <> cur_level
    returning expert_id
  ),
  upd as (
    update expert_profiles e set
      level = t.new_level,
      level_updated_at = case when t.new_level <> t.cur_level then now() else e.level_updated_at end,
      trust_score = t.score
    from target t where e.user_id = t.user_id
    returning (t.new_level <> t.cur_level) as moved
  )
  select count(*) filter (where moved) into changed from upd;
  return changed;
end $$;

-- =====================================================================
-- 15. 전문가 본인 위치/출근 갱신
-- =====================================================================
create or replace function set_expert_presence(p_online boolean, p_lat double precision default null,
                                               p_lng double precision default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_online and not expert_is_active(auth.uid()) then
    raise exception '현재 콜을 받을 수 없는 상태입니다 (승인 대기 또는 🔴 정지 중)';
  end if;
  update expert_profiles set
    is_online = p_online,
    last_lat = coalesce(p_lat, last_lat), last_lng = coalesce(p_lng, last_lng),
    last_located_at = case when p_lat is not null then now() else last_located_at end
  where user_id = auth.uid();
end $$;

-- =====================================================================
-- 15-A. 관리자 전용: 전문가 승인/반려/배지 부여, 수동 환불
-- =====================================================================
create or replace function admin_review_expert(p_expert uuid, p_status expert_status,
                                               p_badges text[] default null, p_note text default null)
returns expert_profiles language plpgsql security definer set search_path = public as $$
declare e expert_profiles;
begin
  if not is_admin() then raise exception '관리자만 가능합니다'; end if;
  update expert_profiles set
    status = p_status,
    approved_at = case when p_status = 'approved' then coalesce(approved_at, now()) else approved_at end,
    verified_badges = coalesce(p_badges, verified_badges),
    is_online = case when p_status = 'approved' then is_online else false end
  where user_id = p_expert returning * into e;
  update expert_documents set status = case when p_status = 'approved' then 'approved'::document_status
                                            else 'rejected'::document_status end,
         reviewed_at = now(), note = p_note
  where expert_id = p_expert and status = 'pending' and p_status in ('approved', 'rejected');
  return e;
end $$;

create or replace function admin_refund(p_request bigint, p_amount integer, p_reason text)
returns payments language plpgsql security definer set search_path = public as $$
declare p payments;
begin
  if not is_admin() then raise exception '관리자만 가능합니다'; end if;
  update payments set status = 'refund_requested', refund_amount = least(p_amount, amount), refund_reason = p_reason
  where request_id = p_request returning * into p;
  perform log_request_event(p_request, (select status from requests where id = p_request),
                            (select status from requests where id = p_request), 'admin refund: ' || p_reason);
  return p;
end $$;

-- =====================================================================
-- 16. 신규 가입 시 profiles 자동 생성
-- =====================================================================
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, phone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', '회원'), new.phone);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();

-- =====================================================================
-- 17. 권한 (RLS + 컬럼 권한)
--   기본: anon/authenticated 의 모든 권한 회수 후 필요한 것만 허용
--   상태·금액·레벨·정산은 앱에서 직접 수정 불가 → 위 RPC 함수로만 변경
-- =====================================================================
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;
grant usage on schema public to anon, authenticated;

do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- 공개 기준 데이터
grant select on regions, categories, level_rules to anon, authenticated;
create policy "public read" on regions     for select using (true);
create policy "public read" on categories  for select using (true);
create policy "public read" on level_rules for select using (true);
grant select on app_settings to authenticated;
create policy "auth read"   on app_settings for select to authenticated using (true);

-- profiles
grant select, update (name) on profiles to authenticated;
create policy "self or admin read" on profiles for select to authenticated
  using (id = auth.uid() or is_admin()
         or exists (select 1 from requests r where (r.customer_id = profiles.id and r.expert_id = auth.uid())
                                                or (r.expert_id = profiles.id and r.customer_id = auth.uid())));
create policy "self update" on profiles for update to authenticated using (id = auth.uid());

-- 고객 주소
grant select, insert, update, delete on customer_addresses to authenticated;
create policy "own addresses" on customer_addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 전문가 프로필: 승인된 전문가는 누구나 조회 / 본인은 소개·사진 등만 수정
grant select on expert_profiles to anon, authenticated;
grant insert (user_id, display_name, intro, career_years, biz_number, photo_url) on expert_profiles to authenticated;
grant update (display_name, intro, career_years, photo_url) on expert_profiles to authenticated;
create policy "approved public" on expert_profiles for select
  using (status = 'approved' or user_id = auth.uid() or is_admin());
create policy "self register" on expert_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "self update"   on expert_profiles for update to authenticated using (user_id = auth.uid());
create policy "admin all"     on expert_profiles for all to authenticated using (is_admin()) with check (is_admin());

grant select, insert, update on expert_payout_accounts to authenticated;
create policy "own payout" on expert_payout_accounts for all to authenticated
  using (expert_id = auth.uid() or is_admin()) with check (expert_id = auth.uid());

grant select on expert_categories, expert_regions to anon, authenticated;
grant insert, delete on expert_categories, expert_regions to authenticated;
create policy "public read" on expert_categories for select using (true);
create policy "own write"   on expert_categories for insert to authenticated with check (expert_id = auth.uid());
create policy "own delete"  on expert_categories for delete to authenticated using (expert_id = auth.uid());
create policy "public read" on expert_regions for select using (true);
create policy "own write"   on expert_regions for insert to authenticated with check (expert_id = auth.uid());
create policy "own delete"  on expert_regions for delete to authenticated using (expert_id = auth.uid());

grant select, insert (expert_id, doc_type, storage_path) on expert_documents to authenticated;
create policy "own docs read"   on expert_documents for select to authenticated using (expert_id = auth.uid() or is_admin());
create policy "own docs insert" on expert_documents for insert to authenticated with check (expert_id = auth.uid());

grant select on level_history, penalties, subscriptions to authenticated;
create policy "own read" on level_history for select to authenticated using (expert_id = auth.uid() or is_admin());
create policy "own read" on penalties     for select to authenticated using (expert_id = auth.uid() or is_admin());
create policy "own read" on subscriptions for select to authenticated using (expert_id = auth.uid() or is_admin());
revoke select (billing_key) on subscriptions from authenticated;

-- 요청: 고객은 생성·조회, 담당 전문가는 조회. 수정은 RPC 로만.
grant select on requests to authenticated;
grant insert (category_id, type, target_expert_id, min_level, address, address_detail, region_code,
              lat, lng, symptom, photos, scheduled_at, recipient_name, recipient_phone, guardian_id)
  on requests to authenticated;
create policy "participants read" on requests for select to authenticated
  using (customer_id = auth.uid() or expert_id = auth.uid()
         or (type = 'direct' and target_expert_id = auth.uid() and status = 'matching')
         or is_admin());
create policy "customer create" on requests for insert to authenticated with check (customer_id = auth.uid());

grant select on request_events to authenticated;
create policy "participants read" on request_events for select to authenticated
  using (exists (select 1 from requests r where r.id = request_id
                 and (r.customer_id = auth.uid() or r.expert_id = auth.uid())) or is_admin());

grant select on payments to authenticated;
create policy "customer read" on payments for select to authenticated
  using (exists (select 1 from requests r where r.id = request_id and r.customer_id = auth.uid()) or is_admin());

grant select on settlements to authenticated;
create policy "expert read" on settlements for select to authenticated using (expert_id = auth.uid() or is_admin());

grant select, insert (request_id, amount, description), update (customer_agreed_at) on extra_charges to authenticated;
create policy "participants read" on extra_charges for select to authenticated
  using (exists (select 1 from requests r where r.id = request_id
                 and (r.customer_id = auth.uid() or r.expert_id = auth.uid())) or is_admin());
create policy "expert add" on extra_charges for insert to authenticated
  with check (exists (select 1 from requests r where r.id = request_id and r.expert_id = auth.uid()
                      and r.status in ('arrived', 'working')));
create policy "customer agree" on extra_charges for update to authenticated
  using (exists (select 1 from requests r where r.id = request_id and r.customer_id = auth.uid()));

grant select on reviews to anon, authenticated;
grant insert (request_id, rating, content) on reviews to authenticated;
create policy "public read" on reviews for select using (true);
create policy "customer write" on reviews for insert to authenticated with check (true);  -- 검증은 트리거

grant select, insert (request_id, reason) on reports to authenticated;
create policy "own reports" on reports for select to authenticated using (reporter_id = auth.uid() or is_admin());
create policy "file report" on reports for insert to authenticated with check (reporter_id = auth.uid());
alter table reports alter column reporter_id set default auth.uid();

grant select, insert (request_id, body) on chat_messages to authenticated;
alter table chat_messages alter column sender_id set default auth.uid();
create policy "participants chat read" on chat_messages for select to authenticated
  using (exists (select 1 from requests r where r.id = request_id
                 and (r.customer_id = auth.uid() or r.expert_id = auth.uid())) or is_admin());
create policy "participants chat write" on chat_messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (
    select 1 from requests r where r.id = request_id
    and (r.customer_id = auth.uid() or r.expert_id = auth.uid())
    and r.status in ('matched', 'en_route', 'arrived', 'working', 'completed')));

grant select, insert, update, delete on guardians to authenticated;
create policy "own guardians" on guardians for all to authenticated
  using (guardian_user_id = auth.uid()) with check (guardian_user_id = auth.uid());
alter table guardians alter column guardian_user_id set default auth.uid();

grant select on request_dispatches to authenticated;
create policy "own dispatch" on request_dispatches for select to authenticated using (expert_id = auth.uid() or is_admin());

grant select on recurring_plans to authenticated;
create policy "own plans" on recurring_plans for select to authenticated using (customer_id = auth.uid() or expert_id = auth.uid());

alter table requests alter column customer_id set default auth.uid();

-- 앱에서 호출 가능한 RPC
grant execute on function haversine_km(double precision, double precision, double precision, double precision) to anon, authenticated;
grant execute on function search_experts(double precision, double precision, smallint, numeric, smallint, boolean) to anon, authenticated;
grant execute on function get_open_requests(double precision, double precision, numeric) to authenticated;
grant execute on function accept_request(bigint)                 to authenticated;
grant execute on function decline_direct_request(bigint)         to authenticated;
grant execute on function advance_request(bigint, request_status, double precision, double precision) to authenticated;
grant execute on function cancel_request(bigint, text)           to authenticated;
grant execute on function report_no_show(bigint)                 to authenticated;
grant execute on function set_expert_presence(boolean, double precision, double precision) to authenticated;
grant execute on function is_admin()                             to authenticated;
grant execute on function admin_review_expert(uuid, expert_status, text[], text) to authenticated;  -- 내부에서 is_admin 검사
grant execute on function admin_refund(bigint, integer, text)    to authenticated;
-- 아래는 service_role 전용 (Edge Function / pg_cron): confirm_payment, pick_broadcast_targets,
-- process_matching_queue, recompute_expert_levels

-- 실시간 구독 (매칭 상태·채팅·콜 알림)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table requests, chat_messages, request_dispatches;
  end if;
end $$;

-- =====================================================================
-- 18. 자동 실행 스케줄 (Supabase 대시보드에서 pg_cron 확장 활성화 후 실행)
-- =====================================================================
-- select cron.schedule('matching-queue', '* * * * *',  $$select process_matching_queue()$$);
-- select cron.schedule('expert-levels',  '0 19 * * *', $$select recompute_expert_levels()$$);  -- 매일 19:00 UTC = 04:00 KST
