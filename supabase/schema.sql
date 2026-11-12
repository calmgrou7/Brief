-- 예스시스템 견적 문의 테이블
-- Supabase SQL Editor 에서 한 번 실행하세요.

create table if not exists public.leads (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 50),
  phone       text not null check (phone ~ '^[0-9]{9,12}$'),
  region      text check (char_length(region) <= 100),
  products    text[] default '{}',
  space       text check (char_length(space) <= 50),
  timing      text check (char_length(timing) <= 50),
  message     text check (char_length(message) <= 2000),
  source      text,
  utm         text,
  status      text not null default '신규'
              check (status in ('신규','상담중','실측예약','견적발송','계약','보류','종료'))
);

alter table public.leads enable row level security;

-- 사이트 방문자(anon)는 '등록'만 가능, 조회·수정 불가
drop policy if exists "anon can insert leads" on public.leads;
create policy "anon can insert leads"
  on public.leads for insert
  to anon
  with check (status = '신규');

-- 조회/상태변경은 Supabase 대시보드(관리자) 또는 로그인 사용자만
drop policy if exists "auth can read leads" on public.leads;
create policy "auth can read leads"
  on public.leads for select to authenticated using (true);

drop policy if exists "auth can update leads" on public.leads;
create policy "auth can update leads"
  on public.leads for update to authenticated using (true);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);
