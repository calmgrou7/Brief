-- 접속 코드 방식: 요청 헤더 x-jw-key 의 코드가 맞으면 관리자 권한 (로그인 없이 운영자 1인 사용)
-- 코드 원문은 저장하지 않고 bcrypt 해시만 jw_settings 에 보관
create table public.jw_settings (key text primary key, value text not null);
alter table public.jw_settings enable row level security;  -- 정책 없음: 함수로만 접근

create function public.jw_key_ok() returns boolean language plpgsql stable security definer
  set search_path = '' as $$
declare v_key text; v_hash text;
begin
  begin
    v_key := current_setting('request.headers', true)::json ->> 'x-jw-key';
  exception when others then return false; end;
  if v_key is null or length(v_key) < 6 then return false; end if;
  select value into v_hash from public.jw_settings where key = 'access_code_hash';
  return v_hash is not null and v_hash = extensions.crypt(v_key, v_hash);
end $$;

create or replace function public.jw_is_admin() returns boolean language sql stable security definer
  set search_path = '' as $$
  select public.jw_key_ok()
      or exists(select 1 from public.jw_admins where email = public.jw_email() and email <> '') $$;

create function public.jw_check_key() returns boolean language sql stable security definer
  set search_path = '' as $$ select public.jw_key_ok() $$;

create function public.jw_set_access_code(p_new text) returns void language plpgsql security definer
  set search_path = '' as $$
begin
  if not public.jw_is_admin() then raise exception '관리자만 변경할 수 있습니다'; end if;
  if length(coalesce(p_new,'')) < 8 then raise exception '접속 코드는 8자 이상이어야 합니다'; end if;
  insert into public.jw_settings(key, value) values ('access_code_hash', extensions.crypt(p_new, extensions.gen_salt('bf', 10)))
  on conflict (key) do update set value = excluded.value;
end $$;

grant execute on function public.jw_key_ok(), public.jw_check_key(), public.jw_is_admin(), public.jw_is_member(),
  public.jw_is_officer(), public.jw_my_member_id(), public.jw_email() to anon, authenticated;
grant execute on function public.jw_assign_position(uuid,uuid,date,boolean), public.jw_set_access_code(text) to anon, authenticated;
revoke execute on function public.jw_set_access_code(text) from public;

alter policy jw_admins_read on public.jw_admins to anon, authenticated;
alter policy jw_members_read on public.jw_members to anon, authenticated;
alter policy jw_members_ins on public.jw_members to anon, authenticated;
alter policy jw_members_upd on public.jw_members to anon, authenticated;
alter policy jw_members_del on public.jw_members to anon, authenticated;
alter policy jw_positions_read on public.jw_positions to anon, authenticated;
alter policy jw_positions_write on public.jw_positions to anon, authenticated;
alter policy jw_terms_read on public.jw_terms to anon, authenticated;
alter policy jw_terms_write on public.jw_terms to anon, authenticated;
alter policy jw_events_read on public.jw_events to anon, authenticated;
alter policy jw_events_write on public.jw_events to anon, authenticated;
alter policy jw_history_read on public.jw_history to anon, authenticated;
alter policy jw_history_write on public.jw_history to anon, authenticated;
alter policy jw_media_read on storage.objects to anon, authenticated;
alter policy jw_media_ins on storage.objects to anon, authenticated;
alter policy jw_media_upd on storage.objects to anon, authenticated;
alter policy jw_media_del on storage.objects to anon, authenticated;

-- 최초 코드 설정은 SQL Editor 에서 (코드 원문은 저장소에 남기지 않음):
-- insert into jw_settings(key,value) values ('access_code_hash', extensions.crypt('<코드>', extensions.gen_salt('bf',10)))
--   on conflict (key) do update set value = excluded.value;
