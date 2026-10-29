-- 운영 보드 공용 테이블. Supabase SQL Editor에서 한 번 실행한다.
-- 읽기·수정: ops_owners에 등록된 이메일로 로그인한 사람만.
-- 쓰기(앱 → 보드): 앱별 ingest_key를 아는 쪽만 ingest_event()로.

create extension if not exists pgcrypto;

create table if not exists public.ops_owners (
  email text primary key
);

create table if not exists public.ops_apps (
  id text primary key,
  name text not null,
  ingest_key text not null default encode(gen_random_bytes(24), 'hex')
);

create table if not exists public.ops_events (
  id uuid primary key default gen_random_uuid(),
  app text not null references public.ops_apps(id),
  external_id text,
  kind text not null check (kind in ('client', 'consult', 'report', 'task', 'note')),
  title text not null check (length(title) between 1 and 300),
  client text check (length(client) <= 120),
  status text not null default 'done' check (status in ('open', 'done')),
  amount bigint,
  link text,
  at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (app, external_id)
);

create index if not exists ops_events_at_idx on public.ops_events (at desc);
create index if not exists ops_events_open_idx on public.ops_events (status) where status = 'open';

alter table public.ops_owners enable row level security;
alter table public.ops_apps enable row level security;
alter table public.ops_events enable row level security;

create or replace function public.is_ops_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ops_owners where email = auth.jwt() ->> 'email');
$$;

drop policy if exists ops_events_owner on public.ops_events;
create policy ops_events_owner on public.ops_events
  for all to authenticated using (public.is_ops_owner()) with check (public.is_ops_owner());

drop policy if exists ops_apps_owner_read on public.ops_apps;
create policy ops_apps_owner_read on public.ops_apps
  for select to authenticated using (public.is_ops_owner());

-- 앱이 로그인 없이 이벤트를 보내는 입구. external_id가 같으면 갱신한다.
create or replace function public.ingest_event(
  p_app text, p_key text, p_external_id text, p_kind text, p_title text,
  p_client text, p_status text, p_amount bigint, p_link text, p_at timestamptz
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.ops_apps where id = p_app and ingest_key = p_key) then
    raise exception 'invalid app or key' using errcode = '42501';
  end if;
  insert into public.ops_events (app, external_id, kind, title, client, status, amount, link, at)
  values (p_app, p_external_id, p_kind, p_title, p_client, coalesce(p_status, 'done'), p_amount, p_link, coalesce(p_at, now()))
  on conflict (app, external_id) do update
    set kind = excluded.kind, title = excluded.title, client = excluded.client,
        status = excluded.status, amount = excluded.amount, link = excluded.link
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.ingest_event from public;
grant execute on function public.ingest_event to anon, authenticated;

-- 초기값: 앱 두 개와 보드 주인 이메일(you@example.com을 본인 로그인 이메일로 바꿔서 실행)
insert into public.ops_apps (id, name) values ('chaeum', '채움'), ('widly', '위들리') on conflict do nothing;
insert into public.ops_owners (email) values ('you@example.com') on conflict do nothing;

-- 각 앱에 넣을 ingest_key 확인:
-- select id, ingest_key from public.ops_apps;
