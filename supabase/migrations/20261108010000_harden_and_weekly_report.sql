-- 1) 보안 강화 ----------------------------------------------------------------
-- 트리거 전용 함수는 API(rpc)로 호출할 수 없게 막는다 (트리거 실행에는 영향 없음)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.enforce_goal_limit() from public, anon, authenticated;

-- 다른 사용자의 구독 여부를 조회하지 못하도록:
--   user_is_premium(uuid) = 내부용(트리거·서버 함수), is_premium() = 앱용(본인만)
alter function public.is_premium(uuid) rename to user_is_premium;
revoke execute on function public.user_is_premium(uuid) from public, anon, authenticated;
grant execute on function public.user_is_premium(uuid) to service_role;

create function public.is_premium() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.user_is_premium(auth.uid());
$$;
revoke execute on function public.is_premium() from public, anon;
grant execute on function public.is_premium() to authenticated;

create or replace function public.enforce_goal_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active'
     and (tg_op = 'INSERT' or old.status <> 'active')
     and not public.user_is_premium(new.user_id)
     and (select count(*) from public.goals where user_id = new.user_id and status = 'active') >= 3 then
    raise exception 'FREE_GOAL_LIMIT' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.enforce_goal_limit() from public, anon, authenticated;

revoke execute on function public.current_streak(date) from public, anon;
grant execute on function public.current_streak(date) to authenticated;

-- 2) 주간 실행 리포트 ---------------------------------------------------------
-- 최근 7일(KST, 오늘 포함) 기준. RLS가 적용되도록 security invoker.
--   days            : 날짜별 완료 개수
--   done_total      : 완료한 할 일 수 / prev_done_total: 그 전 7일
--   focus_planned / focus_done : 'DO 3'로 고른 할 일 중 완료한 비율(실행률)
--   minutes_done    : 완료한 할 일의 예상 소요시간 합
--   best_hour       : 가장 많이 완료한 시간대(0~23)
--   top_goals       : 완료가 많은 목표 상위 3개
create function public.weekly_report(tz_today date) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with done as (
    select t.*, (t.done_at at time zone 'Asia/Seoul') as done_local
    from public.tasks t
    where t.user_id = auth.uid() and t.done_at is not null
      and (t.done_at at time zone 'Asia/Seoul')::date between tz_today - 13 and tz_today
  ),
  this_week as (select * from done where done_local::date > tz_today - 7),
  focus as (
    select * from public.tasks
    where user_id = auth.uid() and focus_date between tz_today - 6 and tz_today
  )
  select jsonb_build_object(
    'days', (
      select jsonb_agg(jsonb_build_object('date', d::date, 'done',
        (select count(*) from this_week w where w.done_local::date = d::date)) order by d)
      from generate_series(tz_today - 6, tz_today, interval '1 day') d
    ),
    'done_total', (select count(*) from this_week),
    'prev_done_total', (select count(*) from done where done_local::date <= tz_today - 7),
    'focus_planned', (select count(*) from focus),
    'focus_done', (select count(*) from focus where done_at is not null),
    'minutes_done', (select coalesce(sum(minutes), 0) from this_week),
    'best_hour', (
      select extract(hour from done_local)::int from this_week
      group by 1 order by count(*) desc, 1 limit 1
    ),
    'top_goals', coalesce((
      select jsonb_agg(x order by (x->>'done')::int desc) from (
        select jsonb_build_object('title', g.title, 'done', count(*)) as x
        from this_week w join public.goals g on g.id = w.goal_id
        group by g.title order by count(*) desc limit 3
      ) s
    ), '[]'::jsonb)
  );
$$;
revoke execute on function public.weekly_report(date) from public, anon;
grant execute on function public.weekly_report(date) to authenticated;
