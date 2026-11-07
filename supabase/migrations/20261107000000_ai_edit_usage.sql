-- AI 스튜디오 일일 사용 한도 (비용 보호용). Edge Function 이 service role 로만 호출한다.
create table if not exists public.ai_edit_usage (
  day   date    not null default (now() at time zone 'Asia/Seoul')::date,
  key   text    not null,
  count integer not null default 0,
  primary key (day, key)
);

alter table public.ai_edit_usage enable row level security; -- 정책 없음 = anon/auth 접근 불가

create or replace function public.ai_edit_consume(p_key text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  v_count integer;
begin
  insert into public.ai_edit_usage as u (day, key, count)
  values (v_day, p_key, 1)
  on conflict (day, key) do update set count = u.count + 1
    where u.count < p_limit
  returning u.count into v_count;
  return v_count is not null;
end;
$$;

revoke all on function public.ai_edit_consume(text, integer) from public, anon, authenticated;
grant execute on function public.ai_edit_consume(text, integer) to service_role;
