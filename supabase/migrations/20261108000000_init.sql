-- DOIT 초기 스키마 ------------------------------------------------------------
-- 원칙: 모든 사용자 데이터는 RLS로 본인 것만 접근. 구독 상태(entitlements)와
-- AI 사용량(ai_usage)은 서버(service role)만 기록하고, 앱은 읽기만 한다.

-- 프로필 ----------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 20),
  confirmed_age_14_at timestamptz,
  agreed_terms_at timestamptz,
  agreed_privacy_at timestamptz,
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,
  created_at timestamptz not null default now()
);

-- 가입 시 프로필 자동 생성
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 목표 / 할 일 ----------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  due_date date,
  status text not null default 'active' check (status in ('active', 'done', 'archived')),
  created_at timestamptz not null default now()
);
create index goals_user_idx on public.goals (user_id, status);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  minutes int check (minutes between 1 and 600),
  position int not null default 0,
  source text not null default 'manual' check (source in ('manual', 'ai')),
  done_at timestamptz,
  focus_date date,
  created_at timestamptz not null default now()
);
create index tasks_goal_idx on public.tasks (goal_id, position);
create index tasks_focus_idx on public.tasks (user_id, focus_date);
create index tasks_done_idx on public.tasks (user_id, done_at);

-- 구독 상태 (RevenueCat 웹훅이 갱신) -------------------------------------------
create table public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default false,
  product_id text,
  period_type text,             -- TRIAL / NORMAL / INTRO / PROMOTIONAL
  store text,
  expires_at timestamptz,
  last_event_type text,
  last_event_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 월별 AI 쪼개기 사용량 -------------------------------------------------------
create table public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,          -- 'YYYY-MM' (KST)
  count int not null default 0,
  primary key (user_id, month)
);

-- RLS -------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.entitlements enable row level security;
alter table public.ai_usage enable row level security;

create policy "own profile read" on public.profiles for select using ((select auth.uid()) = id);
create policy "own profile update" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "own goals" on public.goals for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own tasks" on public.tasks for all
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid()))
  );

create policy "own entitlement read" on public.entitlements for select using ((select auth.uid()) = user_id);
create policy "own usage read" on public.ai_usage for select using ((select auth.uid()) = user_id);

-- 함수 ------------------------------------------------------------------------
create function public.is_premium(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entitlements e
    where e.user_id = p_user
      and e.is_active
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

-- 무료 플랜: 진행 중(active) 목표 3개 제한 (보관 해제로 우회하는 것도 차단)
create function public.enforce_goal_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active'
     and (tg_op = 'INSERT' or old.status <> 'active')
     and not public.is_premium(new.user_id)
     and (select count(*) from public.goals where user_id = new.user_id and status = 'active') >= 3 then
    raise exception 'FREE_GOAL_LIMIT' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger goals_free_limit before insert or update of status on public.goals
  for each row execute function public.enforce_goal_limit();

-- 연속 실행일: 하루에 할 일 1개 이상 완료한 날이 끊기지 않고 이어진 일수 (KST 기준)
create function public.current_streak(tz_today date) returns int
language plpgsql stable security invoker set search_path = '' as $$
declare
  cur date := tz_today;
  n int := 0;
begin
  if not exists (
    select 1 from public.tasks
    where user_id = auth.uid() and done_at is not null
      and (done_at at time zone 'Asia/Seoul')::date = cur
  ) then
    cur := cur - 1;  -- 오늘 아직 안 했으면 어제까지의 기록을 보여줌
  end if;
  while exists (
    select 1 from public.tasks
    where user_id = auth.uid() and done_at is not null
      and (done_at at time zone 'Asia/Seoul')::date = cur
  ) loop
    n := n + 1;
    cur := cur - 1;
  end loop;
  return n;
end $$;

-- AI 사용량 +1 (Edge Function에서 service role로 호출)
create function public.bump_ai_usage(p_user uuid, p_month text) returns int
language sql security definer set search_path = '' as $$
  insert into public.ai_usage (user_id, month, count) values (p_user, p_month, 1)
  on conflict (user_id, month) do update set count = public.ai_usage.count + 1
  returning count;
$$;
revoke execute on function public.bump_ai_usage(uuid, text) from public, anon, authenticated;
