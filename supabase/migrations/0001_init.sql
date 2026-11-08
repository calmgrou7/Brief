-- ═══════════════════════════════════════════════════════════════
-- 수학의 신 (God of Math) — Supabase 초기 스키마
--
-- 원칙
--  1) 정답(answer)과 해설(explanation)은 클라이언트가 직접 읽을 수 없다.
--  2) XP · 레이팅 · 대결 점수는 오직 아래 security definer 함수(서버)만 바꾼다.
--     → 브라우저 개발자도구로 점수를 조작할 수 없음.
-- ═══════════════════════════════════════════════════════════════

-- ───────── 설정 ─────────
create table public.app_config (
  key text primary key,
  value text not null
);
insert into public.app_config values
  ('review_threshold', '1'),   -- 출범 초기: 순찬성 1표 승인. 출제자가 늘면 3으로 올리세요.
  ('composer_level',   '10');

-- ───────── 프로필 ─────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (char_length(username) between 2 and 24),
  xp int not null default 0,
  rating int not null default 1200,
  approved_count int not null default 0,
  total_attempts int not null default 0,
  total_correct int not null default 0,
  streak_count int not null default 0,
  streak_day date,
  duels_w int not null default 0,
  duels_l int not null default 0,
  duels_d int not null default 0,
  created_at timestamptz not null default now()
);
create index profiles_rating_idx on public.profiles (rating desc);
create index profiles_xp_idx on public.profiles (xp desc);

-- ───────── 문제 ─────────
create table public.problems (
  id text primary key,
  tier text not null check (tier in ('middle','high','undergrad','grad','research')),
  topic text not null,
  source text not null,
  rating int not null,
  statement jsonb not null,            -- {ko, en}
  hint jsonb,                          -- {ko, en}
  explanation jsonb not null,          -- 비공개
  answer jsonb not null,               -- 비공개
  -- 화면에 필요한 정보(유형·보기)만 공개
  answer_shape jsonb,                  -- 트리거가 채움
  author_id uuid references public.profiles on delete set null,
  author_name text,
  status text not null default 'approved' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
-- 화면에 필요한 정보(유형·보기)만 공개 컬럼으로 복사
create or replace function public.problems_set_shape() returns trigger
language plpgsql as $$
begin
  new.answer_shape := jsonb_strip_nulls(jsonb_build_object('kind', new.answer->>'kind', 'options', new.answer->'options'));
  return new;
end $$;
create trigger problems_shape before insert or update of answer on public.problems
  for each row execute function public.problems_set_shape();
create index problems_status_rating_idx on public.problems (status, rating);
create index problems_author_idx on public.problems (author_id);

create table public.solves (
  user_id uuid references public.profiles on delete cascade,
  problem_id text references public.problems on delete cascade,
  misses int not null default 0,
  revealed boolean not null default false,
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

-- ───────── 대결 ─────────
create table public.duels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  opponent text not null,
  opp_rating int not null,
  problem_ids text[] not null,
  bot_plan jsonb not null,             -- [{correct, time}] — 서버가 생성
  round int not null default 0,
  round_started_at timestamptz not null default now(),
  rounds jsonb not null default '[]',  -- [{mine, theirs, my_correct, their_correct}]
  my_score int not null default 0,
  opp_score int not null default 0,
  status text not null default 'live' check (status in ('live','done')),
  result text check (result in ('win','loss','draw')),
  rating_delta int,
  xp int,
  created_at timestamptz not null default now()
);
create index duels_user_idx on public.duels (user_id, created_at desc);

-- ═══════════ 권한 (RLS + 컬럼 권한) ═══════════
alter table public.app_config enable row level security;
alter table public.profiles   enable row level security;
alter table public.problems   enable row level security;
alter table public.solves     enable row level security;
alter table public.reviews    enable row level security;
alter table public.duels      enable row level security;

-- 쓰기는 전부 함수 경유
revoke insert, update, delete on all tables in schema public from anon, authenticated;

create policy "profiles are public" on public.profiles for select using (true);
create policy "approved problems are public" on public.problems for select using (status = 'approved');
create policy "own solves" on public.solves for select to authenticated using (user_id = (select auth.uid()));
create policy "own duels" on public.duels for select to authenticated using (user_id = (select auth.uid()));
-- reviews / app_config: 직접 조회 불가 (함수로만)

-- 정답·해설 컬럼은 클라이언트에서 읽을 수 없게
revoke select on public.problems from anon, authenticated;
grant select (id, tier, topic, source, rating, statement, hint, answer_shape, author_id, author_name, status, created_at)
  on public.problems to anon, authenticated;

-- ═══════════ 공통 함수 ═══════════
create or replace function public.level_of(p_xp int) returns int
language sql immutable as $$
  select greatest(1, floor((1 + sqrt(1 + 4 * p_xp / 25.0)) / 2)::int)
$$;

create or replace function public.elo_delta(me int, opp int, score numeric, k int) returns int
language sql immutable as $$
  select round(k * (score - 1 / (1 + power(10, (opp - me) / 400.0))))::int
$$;

create or replace function public.config_int(p_key text) returns int
language sql stable security definer set search_path = public as $$
  select value::int from app_config where key = p_key
$$;

-- "1/3", "-0.5", "1,000" → numeric
create or replace function public.parse_num(p text) returns numeric
language plpgsql immutable as $$
declare s text := replace(replace(replace(coalesce(p, ''), ' ', ''), ',', ''), '−', '-');
        parts text[];
begin
  if s ~ '^-?\d+(\.\d+)?/-?\d+(\.\d+)?$' then
    parts := string_to_array(s, '/');
    if parts[2]::numeric = 0 then return null; end if;
    return parts[1]::numeric / parts[2]::numeric;
  elsif s ~ '^-?(\d+\.?\d*|\.\d+)([eE]-?\d+)?$' then
    return s::numeric;
  end if;
  return null;
end $$;

create or replace function public.norm_short(p text) returns text
language sql immutable as $$
  select regexp_replace(replace(lower(coalesce(p, '')), '×', 'x'), '[\s\\{}$]', '', 'g')
$$;

create or replace function public.check_answer(p_answer jsonb, p_input text) returns boolean
language plpgsql immutable as $$
declare n numeric;
begin
  if p_input is null then return false; end if;
  case p_answer->>'kind'
    when 'numeric' then
      n := parse_num(p_input);
      return n is not null and abs(n - (p_answer->>'value')::numeric)
        <= greatest(coalesce((p_answer->>'tolerance')::numeric, 1e-9), abs((p_answer->>'value')::numeric) * 1e-12);
    when 'choice' then
      return p_input ~ '^\d+$' and p_input::int = (p_answer->>'correct')::int;
    when 'short' then
      return exists (select 1 from jsonb_array_elements_text(p_answer->'accepted') a where norm_short(a) = norm_short(p_input));
    else return false;
  end case;
end $$;

create or replace function public.bump_streak(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update profiles set
    streak_count = case
      when streak_day = current_date then streak_count
      when streak_day = current_date - 1 then streak_count + 1
      else 1 end,
    streak_day = current_date
  where id = p_user;
end $$;

-- ═══════════ 회원가입 시 프로필 자동 생성 ═══════════
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare base text := left(coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), 'user'), 20);
        name text := base;
        n int := 0;
begin
  if char_length(name) < 2 then name := name || '_' || substr(new.id::text, 1, 4); end if;
  while exists (select 1 from profiles where lower(username) = lower(name)) loop
    n := n + 1;
    name := base || '_' || n;
  end loop;
  insert into profiles (id, username) values (new.id, name);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════ 문제 풀이 ═══════════
-- 첫 정답만 XP, 미해결 문제에서만 레이팅 변동 (반복 풀이 파밍 방지)
create or replace function public.submit_answer(p_problem text, p_input text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p problems; me profiles; s solves;
        ok boolean; base_xp int; gained int := 0; delta int := 0; mult numeric := 1;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into p from problems where id = p_problem and status = 'approved';
  if not found then raise exception 'problem not found'; end if;
  select * into me from profiles where id = uid for update;
  ok := check_answer(p.answer, p_input);

  insert into solves (user_id, problem_id) values (uid, p.id) on conflict do nothing;
  select * into s from solves where user_id = uid and problem_id = p.id for update;

  update profiles set total_attempts = total_attempts + 1, total_correct = total_correct + ok::int where id = uid;

  if s.solved_at is not null then
    return jsonb_build_object('correct', ok, 'xp', 0, 'delta', 0, 'first_solve', false,
                              'explanation', case when ok then p.explanation end);
  end if;

  if ok then
    perform bump_streak(uid);
    select * into me from profiles where id = uid;
    mult := case when me.streak_count >= 7 then 1.25 when me.streak_count >= 3 then 1.1 else 1 end;
    base_xp := case p.tier when 'middle' then 10 when 'high' then 20 when 'undergrad' then 35 when 'grad' then 55 else 80 end;
    gained := round(base_xp * greatest(0.4, 1 - 0.2 * s.misses) * mult);
    delta := elo_delta(me.rating, p.rating, 1, case when s.misses = 0 then 24 else 12 end);
    update solves set solved_at = now() where user_id = uid and problem_id = p.id;
    -- 커뮤니티 문제가 풀리면 출제자에게 +5 XP
    if p.author_id is not null and p.author_id <> uid then
      update profiles set xp = xp + 5 where id = p.author_id;
    end if;
  else
    if s.misses < 2 then delta := elo_delta(me.rating, p.rating, 0, 12); end if;
    update solves set misses = misses + 1 where user_id = uid and problem_id = p.id;
  end if;

  update profiles set xp = xp + gained, rating = greatest(100, rating + delta) where id = uid;
  return jsonb_build_object('correct', ok, 'xp', gained, 'delta', delta, 'first_solve', ok,
                            'explanation', case when ok then p.explanation end);
end $$;

-- 해설 보기: 풀기 전에 열면 보상이 최소치(40%)로 감소
create or replace function public.reveal_explanation(p_problem text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p problems;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into p from problems where id = p_problem and status = 'approved';
  if not found then raise exception 'problem not found'; end if;
  insert into solves (user_id, problem_id, misses, revealed) values (uid, p.id, 3, true)
  on conflict (user_id, problem_id) do update
    set misses = case when solves.solved_at is null then greatest(solves.misses, 3) else solves.misses end,
        revealed = true;
  return p.explanation;
end $$;

-- ═══════════ 대결 (점수·시간은 전부 서버 기준) ═══════════
create or replace function public.finalize_duel(p_duel uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d duels; me profiles; res text; score numeric; delta int; gained int;
begin
  select * into d from duels where id = p_duel for update;
  if d.status = 'done' then
    return jsonb_build_object('result', d.result, 'delta', d.rating_delta, 'xp', d.xp);
  end if;
  -- 남은 라운드(중도 이탈)는 내 0점, 상대는 계획대로
  select coalesce(sum(case when (x->>'correct')::boolean then 100 + 90 - (x->>'time')::int else 0 end), 0)
    into d.opp_score
    from jsonb_array_elements(d.bot_plan) with ordinality as t(x, i);
  select * into me from profiles where id = d.user_id for update;
  res := case when d.my_score > d.opp_score then 'win' when d.my_score < d.opp_score then 'loss' else 'draw' end;
  score := case res when 'win' then 1 when 'draw' then 0.5 else 0 end;
  delta := elo_delta(me.rating, d.opp_rating, score, 32);
  gained := case res when 'win' then 60 when 'draw' then 30 else 15 end;
  update profiles set
    rating = greatest(100, rating + delta), xp = xp + gained,
    duels_w = duels_w + (res = 'win')::int, duels_l = duels_l + (res = 'loss')::int, duels_d = duels_d + (res = 'draw')::int
  where id = d.user_id;
  perform bump_streak(d.user_id);
  update duels set status = 'done', result = res, rating_delta = delta, xp = gained, opp_score = d.opp_score where id = d.id;
  return jsonb_build_object('result', res, 'delta', delta, 'xp', gained, 'my_score', d.my_score, 'opp_score', d.opp_score);
end $$;

create or replace function public.start_duel() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); me profiles; opp int; ids text[]; plan jsonb; d duels; old uuid;
        names text[] := array['Noether_fan','리만가설','EulerLine','갈루아의밤','Ramanujan_q','힐베르트23','GaussSum','칸토어집합',
                              'Hardy_Little','페르마의여백','Poincare3','오일러상수','코시수열','Erdos_No2','라그랑주','디리클레'];
begin
  if uid is null then raise exception 'not authenticated'; end if;
  -- 진행 중이던 대결은 이탈 처리
  for old in select id from duels where user_id = uid and status = 'live' loop
    perform finalize_duel(old);
  end loop;
  select * into me from profiles where id = uid;
  opp := me.rating + floor(random() * 241)::int - 120;

  select array_agg(id order by rating) into ids from (
    select id, rating from (
      select id, rating from problems where status = 'approved'
      order by abs(rating - me.rating) limit 14
    ) near order by random() limit 5
  ) pick;

  select jsonb_agg(jsonb_build_object(
           'correct', random() < 1 / (1 + power(10, (p.rating - opp) / 400.0)),
           'time', 12 + floor(random() * 63)::int) order by p.rating)
    into plan
    from problems p where p.id = any(ids);

  insert into duels (user_id, opponent, opp_rating, problem_ids, bot_plan, round_started_at)
  values (uid, names[1 + floor(random() * array_length(names, 1))::int], opp, ids, plan, now() + interval '1 second')
  returning * into d;

  return jsonb_build_object(
    'id', d.id, 'opponent', d.opponent, 'opp_rating', d.opp_rating, 'plan', d.bot_plan,
    'problems', (select jsonb_agg(jsonb_build_object(
        'id', id, 'tier', tier, 'topic', topic, 'source', source, 'rating', rating,
        'statement', statement, 'answer_shape', answer_shape) order by rating)
      from problems where id = any(ids)));
end $$;

-- p_input = null 이면 패스
create or replace function public.duel_answer(p_duel uuid, p_input text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d duels; p problems; elapsed numeric; ok boolean;
        mine int; theirs int; bot jsonb; fin jsonb;
begin
  select * into d from duels where id = p_duel and user_id = uid for update;
  if not found or d.status <> 'live' then raise exception 'duel not active'; end if;
  select * into p from problems where id = d.problem_ids[d.round + 1];
  elapsed := greatest(0, extract(epoch from now() - d.round_started_at));
  ok := elapsed <= 93 and check_answer(p.answer, p_input);           -- 3초 네트워크 여유
  mine := case when ok then 100 + greatest(0, 90 - floor(elapsed)::int) else 0 end;
  bot := d.bot_plan -> d.round;
  theirs := case when (bot->>'correct')::boolean then 100 + 90 - (bot->>'time')::int else 0 end;

  update duels set
    rounds = rounds || jsonb_build_object('mine', mine, 'theirs', theirs, 'my_correct', ok, 'their_correct', (bot->>'correct')::boolean),
    my_score = my_score + mine,
    opp_score = opp_score + theirs,
    round = round + 1,
    round_started_at = now() + interval '1.6 seconds'
  where id = d.id;

  if d.round + 1 >= array_length(d.problem_ids, 1) then
    fin := finalize_duel(d.id);
  end if;
  return jsonb_build_object('mine', mine, 'theirs', theirs, 'my_correct', ok,
                            'their_correct', (bot->>'correct')::boolean, 'finished', fin is not null, 'final', fin);
end $$;

-- ═══════════ 연구소: 출제 · 심사 ═══════════
create or replace function public.submit_problem(p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); me profiles; new_id text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into me from profiles where id = uid;
  if level_of(me.xp) < config_int('composer_level') then raise exception 'level too low'; end if;
  if (p->>'tier') not in ('middle','high','undergrad','grad','research')
     or coalesce(trim(p->'statement'->>'ko'), '') = '' or coalesce(trim(p->'statement'->>'en'), '') = ''
     or coalesce(trim(p->'explanation'->>'ko'), '') = '' or coalesce(trim(p->>'source'), '') = ''
     or (p->'answer'->>'kind') not in ('numeric','choice','short') then
    raise exception 'invalid problem';
  end if;
  if (select count(*) from problems where author_id = uid and status = 'pending') >= 10 then
    raise exception 'too many pending';
  end if;
  new_id := 'c-' || replace(gen_random_uuid()::text, '-', '');
  insert into problems (id, tier, topic, source, rating, statement, hint, explanation, answer, author_id, author_name, status)
  values (new_id, p->>'tier', coalesce(p->>'topic', 'misc'), left(p->>'source', 200),
          case p->>'tier' when 'middle' then 900 when 'high' then 1150 when 'undergrad' then 1450 when 'grad' then 1750 else 2050 end,
          p->'statement', p->'hint', p->'explanation', p->'answer', uid, me.username, 'pending');
  return new_id;
end $$;

-- 심사 대기열: 정답·해설 포함 (Lv 조건 충족 + 본인 문제 제외 + 이미 투표한 문제 제외)
create or replace function public.review_queue() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if level_of((select xp from profiles where id = uid)) < config_int('composer_level') then return '[]'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'tier', tier, 'topic', topic, 'source', source, 'rating', rating, 'statement', statement,
      'hint', hint, 'explanation', explanation, 'answer', answer, 'author_id', author_id, 'author_name', author_name,
      'status', status, 'created_at', created_at) order by created_at)
    from problems p
    where status = 'pending' and author_id <> uid
      and not exists (select 1 from reviews r where r.problem_id = p.id and r.reviewer_id = uid)), '[]');
end $$;

create or replace function public.my_problems() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'tier', p.tier, 'topic', p.topic, 'source', p.source, 'rating', p.rating, 'statement', p.statement,
      'explanation', p.explanation, 'answer', p.answer, 'author_id', p.author_id, 'author_name', p.author_name,
      'status', p.status, 'created_at', p.created_at,
      'votes', (select coalesce(jsonb_agg(jsonb_build_object('approve', r.approve, 'comment', r.comment, 'at', r.created_at)), '[]')
                from reviews r where r.problem_id = p.id)) order by p.created_at desc), '[]')
  from problems p where p.author_id = auth.uid()
$$;

create or replace function public.vote_problem(p_problem text, p_approve boolean, p_comment text) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p problems; net int; th int := config_int('review_threshold');
begin
  if level_of((select xp from profiles where id = uid)) < config_int('composer_level') then raise exception 'level too low'; end if;
  select * into p from problems where id = p_problem for update;
  if not found or p.status <> 'pending' or p.author_id = uid then raise exception 'not allowed'; end if;
  insert into reviews values (p_problem, uid, p_approve, left(p_comment, 500), now())
    on conflict (problem_id, reviewer_id) do update set approve = excluded.approve, comment = excluded.comment;
  select coalesce(sum(case when approve then 1 else -1 end), 0) into net from reviews where problem_id = p_problem;
  if net >= th then
    update problems set status = 'approved' where id = p_problem;
    update profiles set xp = xp + 100, approved_count = approved_count + 1 where id = p.author_id;
    return 'approved';
  elsif net <= -th then
    update problems set status = 'rejected' where id = p_problem;
    return 'rejected';
  end if;
  return 'pending';
end $$;

-- ═══════════ 함수 실행 권한 ═══════════
-- Supabase 기본 권한은 authenticated 에도 모든 함수 실행을 허용하므로 함께 회수
-- (finalize_duel·bump_streak 같은 내부 함수 직접 호출 차단)
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.submit_answer(text, text), public.reveal_explanation(text),
  public.start_duel(), public.duel_answer(uuid, text),
  public.submit_problem(jsonb), public.review_queue(), public.my_problems(),
  public.vote_problem(text, boolean, text), public.level_of(int)
  to authenticated;
