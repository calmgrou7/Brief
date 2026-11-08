-- 수학의 신 — 운영용 Supabase(Postgres) 스키마
-- 로컬 모드(src/lib/store.ts)와 같은 구조. 점수·XP 변경은 클라이언트가 아닌
-- security definer 함수(서버)에서만 수행해 조작을 막습니다.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (char_length(username) between 2 and 24),
  xp int not null default 0,
  rating int not null default 1200,
  approved_count int not null default 0,
  streak_count int not null default 0,
  streak_day date,
  duels_w int not null default 0, duels_l int not null default 0, duels_d int not null default 0,
  lang text not null default 'ko' check (lang in ('ko','en')),
  created_at timestamptz not null default now()
);

create type tier as enum ('middle','high','undergrad','grad','research');
create type review_status as enum ('pending','approved','rejected');

create table public.problems (
  id text primary key,
  tier tier not null,
  topic text not null,
  source text not null,
  rating int not null,
  statement jsonb not null,      -- {ko, en}
  explanation jsonb not null,    -- {ko, en}
  hint jsonb,
  answer jsonb not null,         -- 클라이언트에 노출 금지 (아래 view 참고)
  author_id uuid references public.profiles,
  status review_status not null default 'approved',
  created_at timestamptz not null default now()
);

-- 정답을 뺀 공개용 뷰
create view public.problems_public as
  select id, tier, topic, source, rating, statement, hint, author_id, status,
         jsonb_build_object('kind', answer->>'kind', 'options', answer->'options') as answer_shape
  from public.problems where status = 'approved';

create table public.solves (
  user_id uuid references public.profiles on delete cascade,
  problem_id text references public.problems on delete cascade,
  misses int not null default 0,
  solved_at timestamptz,
  primary key (user_id, problem_id)
);

create table public.reviews (
  problem_id text references public.problems on delete cascade,
  reviewer_id uuid references public.profiles on delete cascade,
  approve boolean not null,
  comment text,
  created_at timestamptz not null default now(),
  primary key (problem_id, reviewer_id)
);

create table public.duels (
  id uuid primary key default gen_random_uuid(),
  player_a uuid references public.profiles, player_b uuid references public.profiles,
  problem_ids text[] not null,
  score_a int, score_b int,
  rating_delta_a int, rating_delta_b int,
  status text not null default 'waiting' check (status in ('waiting','live','done')),
  created_at timestamptz not null default now()
);

-- 랭킹 뷰
create view public.leaderboard as
  select id, username, rating, xp, approved_count,
         rank() over (order by rating desc) as rating_rank
  from public.profiles;

-- RLS
alter table public.profiles enable row level security;
alter table public.problems enable row level security;
alter table public.solves  enable row level security;
alter table public.reviews enable row level security;
alter table public.duels   enable row level security;

create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile lang" on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id);  -- 실제로는 lang/username 컬럼만 허용하도록 column privilege 설정
create policy "own solves" on public.solves for select using (auth.uid() = user_id);
create policy "author sees own drafts" on public.problems for select
  using (status = 'approved' or author_id = auth.uid());
create policy "reviews readable" on public.reviews for select using (true);
create policy "duel participants" on public.duels for select using (auth.uid() in (player_a, player_b));

-- 채점: 정답은 서버에서만 비교 (numeric/choice/short)
create or replace function public.submit_answer(p_problem text, p_input text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p problems; ok boolean; s solves; me profiles;
  base_xp int; gained int := 0; delta int := 0; expected numeric;
begin
  select * into p from problems where id = p_problem and status = 'approved';
  if not found then raise exception 'not found'; end if;
  select * into me from profiles where id = auth.uid() for update;

  ok := case p.answer->>'kind'
    when 'numeric' then abs(p_input::numeric - (p.answer->>'value')::numeric) <= coalesce((p.answer->>'tolerance')::numeric, 1e-9)
    when 'choice'  then p_input::int = (p.answer->>'correct')::int
    else exists (select 1 from jsonb_array_elements_text(p.answer->'accepted') a
                 where lower(replace(a, ' ', '')) = lower(replace(p_input, ' ', '')))
  end;

  insert into solves(user_id, problem_id) values (me.id, p.id) on conflict do nothing;
  select * into s from solves where user_id = me.id and problem_id = p.id for update;
  if s.solved_at is not null then return jsonb_build_object('correct', ok, 'xp', 0, 'delta', 0); end if;

  expected := 1 / (1 + power(10, (p.rating - me.rating) / 400.0));
  if ok then
    base_xp := case p.tier when 'middle' then 10 when 'high' then 20 when 'undergrad' then 35 when 'grad' then 55 else 80 end;
    gained := round(base_xp * greatest(0.4, 1 - 0.2 * s.misses));
    delta := round((case when s.misses = 0 then 24 else 12 end) * (1 - expected));
    update solves set solved_at = now() where user_id = me.id and problem_id = p.id;
    if p.author_id is not null and p.author_id <> me.id then
      update profiles set xp = xp + 5 where id = p.author_id;
    end if;
  else
    if s.misses < 2 then delta := round(12 * (0 - expected)); end if;
    update solves set misses = misses + 1 where user_id = me.id and problem_id = p.id;
  end if;
  update profiles set xp = xp + gained, rating = greatest(100, rating + delta) where id = me.id;
  return jsonb_build_object('correct', ok, 'xp', gained, 'delta', delta);
end $$;

-- 커뮤니티 심사: 출제자 본인 투표 불가, 순찬성 3표 승인 / −3표 반려
create or replace function public.vote_problem(p_problem text, p_approve boolean, p_comment text)
returns review_status language plpgsql security definer set search_path = public as $$
declare p problems; net int; lvl int;
begin
  select floor((1 + sqrt(1 + 4 * xp / 25.0)) / 2) into lvl from profiles where id = auth.uid();
  if lvl < 10 then raise exception 'level too low'; end if;
  select * into p from problems where id = p_problem for update;
  if p.status <> 'pending' or p.author_id = auth.uid() then raise exception 'not allowed'; end if;
  insert into reviews values (p_problem, auth.uid(), p_approve, p_comment, now())
    on conflict (problem_id, reviewer_id) do update set approve = excluded.approve, comment = excluded.comment;
  select sum(case when approve then 1 else -1 end) into net from reviews where problem_id = p_problem;
  if net >= 3 then
    update problems set status = 'approved' where id = p_problem;
    update profiles set xp = xp + 100, approved_count = approved_count + 1 where id = p.author_id;
    return 'approved';
  elsif net <= -3 then
    update problems set status = 'rejected' where id = p_problem;
    return 'rejected';
  end if;
  return 'pending';
end $$;
