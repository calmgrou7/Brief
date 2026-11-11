-- 정우회(jw_) 회원 플랫폼 스키마 — Supabase 프로젝트 dongne-expert 에 적용됨 (2026-11-11)
-- 적용 이력: jw_init_schema + jw_fix_guard_and_grants 를 합친 최종본

create table public.jw_admins (email text primary key check (email = lower(email)));

create table public.jw_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birth_year text default '',
  company text default '', title text default '', products text default '', industry text default '',
  phone text default '', email text default '', address text default '',
  joined text default '',               -- 'YYYY-MM', 빈 값 = 기존회원
  guardian_id uuid references public.jw_members(id) on delete set null,
  status text not null default 'active' check (status in ('active','inactive')),
  memo text default '',
  photo_path text default '', company_image_path text default '', card_image_path text default '',
  created_at timestamptz not null default now()
);
create unique index jw_members_email_uq on public.jw_members (lower(email)) where email <> '';
create index jw_members_guardian_idx on public.jw_members (guardian_id);

create table public.jw_positions (
  id uuid primary key default gen_random_uuid(),
  name text not null, single boolean not null default false, sort_order int not null default 0
);

create table public.jw_terms (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.jw_members(id) on delete cascade,
  position_id uuid not null references public.jw_positions(id) on delete restrict,
  started_on date not null, ended_on date
);
create index jw_terms_member_idx on public.jw_terms (member_id);
create index jw_terms_position_idx on public.jw_terms (position_id);

create table public.jw_events (
  id uuid primary key default gen_random_uuid(),
  title text not null, category text default '', event_date date not null,
  location text default '', host_id uuid references public.jw_members(id) on delete set null,
  attendees int, body text default '', docs jsonb not null default '[]', memo text default '',
  created_at timestamptz not null default now()
);
create index jw_events_host_idx on public.jw_events (host_id);

create table public.jw_history (
  id uuid primary key default gen_random_uuid(),
  happened_on date not null, title text not null, description text default '',
  source text not null default 'manual'
);

-- 권한 함수
create function public.jw_email() returns text language sql stable
  set search_path = '' as $$ select lower(coalesce(auth.jwt() ->> 'email','')) $$;
create function public.jw_is_admin() returns boolean language sql stable security definer
  set search_path = '' as $$ select exists(select 1 from public.jw_admins where email = public.jw_email() and email <> '') $$;
create function public.jw_my_member_id() returns uuid language sql stable security definer
  set search_path = '' as $$ select id from public.jw_members where lower(email) = public.jw_email() and email <> '' and status = 'active' limit 1 $$;
create function public.jw_is_member() returns boolean language sql stable security definer
  set search_path = '' as $$ select public.jw_is_admin() or public.jw_my_member_id() is not null $$;
create function public.jw_is_officer() returns boolean language sql stable security definer
  set search_path = '' as $$ select public.jw_is_admin() or exists(
    select 1 from public.jw_terms where member_id = public.jw_my_member_id() and ended_on is null) $$;

-- 로그인 메일 발송 전 확인 (anon 호출 가능)
create function public.jw_can_login(p_email text) returns boolean language sql stable security definer
  set search_path = '' as $$
  select exists(select 1 from public.jw_members where lower(email) = lower(trim(p_email)) and email <> '' and status='active')
      or exists(select 1 from public.jw_admins where email = lower(trim(p_email))) $$;

-- 일반회원 본인 수정 시 이메일/가디언/입회/상태 변경 불가 (로그인 사용자 요청에만 적용)
create function public.jw_guard_member_update() returns trigger language plpgsql
  set search_path = '' as $$
begin
  if coalesce(auth.jwt() ->> 'role','') = 'authenticated' and not public.jw_is_admin() then
    new.email := old.email; new.guardian_id := old.guardian_id;
    new.joined := old.joined; new.status := old.status;
  end if;
  return new;
end $$;
create trigger jw_members_guard before update on public.jw_members
  for each row execute function public.jw_guard_member_update();

-- 직책 지정 (기존 직책 자동 종료 + 연혁 기록) — 관리자 전용
create function public.jw_assign_position(p_member uuid, p_position uuid, p_start date, p_add_history boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare v_single boolean; v_name text; v_pos text;
begin
  if not public.jw_is_admin() then raise exception '관리자만 직책을 변경할 수 있습니다'; end if;
  select single, name into v_single, v_pos from public.jw_positions where id = p_position;
  select name into v_name from public.jw_members where id = p_member;
  if v_pos is null or v_name is null then raise exception '회원 또는 직책을 찾을 수 없습니다'; end if;
  update public.jw_terms set ended_on = p_start where member_id = p_member and ended_on is null;
  if v_single then
    update public.jw_terms set ended_on = p_start where position_id = p_position and ended_on is null;
  end if;
  insert into public.jw_terms (member_id, position_id, started_on) values (p_member, p_position, p_start);
  if p_add_history then
    insert into public.jw_history (happened_on, title, source) values (p_start, v_name || ' ' || v_pos || ' 취임', 'officer');
  end if;
end $$;

revoke all on function public.jw_assign_position(uuid,uuid,date,boolean) from public, anon;
grant execute on function public.jw_assign_position(uuid,uuid,date,boolean) to authenticated;
grant execute on function public.jw_can_login(text) to anon, authenticated;
revoke execute on function public.jw_is_admin(), public.jw_is_member(), public.jw_is_officer(),
  public.jw_my_member_id(), public.jw_email() from public, anon;
grant execute on function public.jw_is_admin(), public.jw_is_member(), public.jw_is_officer(),
  public.jw_my_member_id(), public.jw_email() to authenticated;

-- RLS
alter table public.jw_admins enable row level security;
alter table public.jw_members enable row level security;
alter table public.jw_positions enable row level security;
alter table public.jw_terms enable row level security;
alter table public.jw_events enable row level security;
alter table public.jw_history enable row level security;

create policy jw_admins_read on public.jw_admins for select to authenticated using (public.jw_is_admin());
create policy jw_members_read on public.jw_members for select to authenticated using (public.jw_is_member());
create policy jw_members_ins on public.jw_members for insert to authenticated with check (public.jw_is_admin());
create policy jw_members_upd on public.jw_members for update to authenticated
  using (public.jw_is_admin() or id = public.jw_my_member_id())
  with check (public.jw_is_admin() or id = public.jw_my_member_id());
create policy jw_members_del on public.jw_members for delete to authenticated using (public.jw_is_admin());
create policy jw_positions_read on public.jw_positions for select to authenticated using (public.jw_is_member());
create policy jw_positions_write on public.jw_positions for all to authenticated using (public.jw_is_admin()) with check (public.jw_is_admin());
create policy jw_terms_read on public.jw_terms for select to authenticated using (public.jw_is_member());
create policy jw_terms_write on public.jw_terms for all to authenticated using (public.jw_is_admin()) with check (public.jw_is_admin());
create policy jw_events_read on public.jw_events for select to authenticated using (public.jw_is_member());
create policy jw_events_write on public.jw_events for all to authenticated using (public.jw_is_officer()) with check (public.jw_is_officer());
create policy jw_history_read on public.jw_history for select to authenticated using (public.jw_is_member());
create policy jw_history_write on public.jw_history for all to authenticated using (public.jw_is_officer()) with check (public.jw_is_officer());

-- 이미지 저장소 (비공개). 경로: {member_id}/{종류}-{시각}.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('jw-media', 'jw-media', false, 5242880, array['image/jpeg','image/png','image/webp']);
create policy jw_media_read on storage.objects for select to authenticated
  using (bucket_id = 'jw-media' and public.jw_is_member());
create policy jw_media_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'jw-media' and (public.jw_is_admin() or (storage.foldername(name))[1] = public.jw_my_member_id()::text));
create policy jw_media_upd on storage.objects for update to authenticated
  using (bucket_id = 'jw-media' and (public.jw_is_admin() or (storage.foldername(name))[1] = public.jw_my_member_id()::text));
create policy jw_media_del on storage.objects for delete to authenticated
  using (bucket_id = 'jw-media' and (public.jw_is_admin() or (storage.foldername(name))[1] = public.jw_my_member_id()::text));
