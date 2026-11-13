-- =====================================================================
-- 정우회: 회원 비밀번호 로그인 (이름 선택 + 비밀번호)
--   · 처음 비밀번호 = 휴대폰 뒷 4자리, 첫 로그인 때 반드시 변경
--   · 로그인한 회원은 회원명부 열람 + 본인 정보·사진 수정만 가능
--   · 관리자·임원은 비밀번호 초기화 가능 / 5번 틀리면 10분 잠금
-- 실행: Supabase 대시보드 → dongne-expert 프로젝트 → SQL Editor → 전체 붙여넣기 → Run
-- (기존 회원 데이터는 바꾸거나 지우지 않습니다)
-- =====================================================================

create table if not exists public.jw_member_auth (
  member_id uuid primary key references public.jw_members(id) on delete cascade,
  pw_hash text,                                  -- null = 초기 비밀번호(휴대폰 뒷 4자리) 사용 중
  must_change boolean not null default true,
  failed int not null default 0,
  locked_until timestamptz,
  changed_at timestamptz
);
create table if not exists public.jw_member_sessions (
  token_hash text primary key,
  member_id uuid not null references public.jw_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists jw_member_sessions_member_idx on public.jw_member_sessions(member_id);
alter table public.jw_member_auth enable row level security;      -- 정책 없음: 아래 함수로만 접근
alter table public.jw_member_sessions enable row level security;

-- 요청 헤더 x-jw-member 의 로그인 토큰 → 회원 ID
create or replace function public.jw_session_member() returns uuid language plpgsql stable security definer
  set search_path = '' as $$
declare v text; mid uuid;
begin
  begin v := current_setting('request.headers', true)::json ->> 'x-jw-member';
  exception when others then return null; end;
  if v is null or length(v) < 20 then return null; end if;
  select s.member_id into mid from public.jw_member_sessions s
   join public.jw_members m on m.id = s.member_id and m.status = 'active'
   where s.token_hash = encode(extensions.digest(v, 'sha256'), 'hex') and s.expires_at > now();
  return mid;
end $$;

-- '내 회원 ID': 이메일 로그인 또는 비밀번호 로그인
create or replace function public.jw_my_member_id() returns uuid language sql stable security definer
  set search_path = '' as $$
  select coalesce(
    (select id from public.jw_members where lower(email) = public.jw_email() and email <> '' and status = 'active' limit 1),
    public.jw_session_member()) $$;

-- 본인 수정 시 관리자 항목(이메일·추천인·입회·상태·창립·NO·신입)은 바꿀 수 없음
create or replace function public.jw_guard_member_update() returns trigger language plpgsql
  set search_path = '' as $$
begin
  if coalesce(auth.jwt() ->> 'role','') in ('authenticated','anon') and not public.jw_is_admin() then
    new.email := old.email; new.guardian_id := old.guardian_id;
    new.joined := old.joined; new.status := old.status;
    new.is_founder := old.is_founder; new.roster_no := old.roster_no; new.is_new := old.is_new;
  end if;
  return new;
end $$;

-- 로그인 화면: 이름으로 회원 찾기 (정확히 일치하는 활동 회원, 최소 정보만)
create or replace function public.jw_login_candidates(p_name text) returns table(id uuid, name text, company text, joined text, is_founder boolean)
  language sql stable security definer set search_path = '' as $$
  select m.id, m.name, m.company, m.joined, m.is_founder from public.jw_members m
   where m.status = 'active' and m.name = trim(p_name) and length(trim(p_name)) >= 2
   order by m.roster_no nulls last limit 5 $$;

-- 로그인: 성공하면 30일짜리 로그인 토큰 반환
create or replace function public.jw_member_login(p_member uuid, p_password text) returns json
  language plpgsql volatile security definer set search_path = '' as $$
declare a public.jw_member_auth; ph text; ok boolean; tok text;
begin
  select regexp_replace(coalesce(phone,''), '\D', '', 'g') into ph from public.jw_members where id = p_member and status = 'active';
  if not found then return json_build_object('ok', false, 'error', '회원을 찾을 수 없습니다.'); end if;
  insert into public.jw_member_auth(member_id) values (p_member) on conflict do nothing;
  select * into a from public.jw_member_auth where member_id = p_member for update;
  if a.locked_until is not null and a.locked_until > now() then
    return json_build_object('ok', false, 'error', '비밀번호를 여러 번 틀려 잠시 잠겼습니다. ' || ceil(extract(epoch from a.locked_until - now())/60) || '분 뒤 다시 시도해 주세요.');
  end if;
  if a.pw_hash is null then
    if length(ph) < 4 then return json_build_object('ok', false, 'error', '등록된 휴대폰 번호가 없습니다. 운영진에게 비밀번호 발급을 요청해 주세요.'); end if;
    ok := coalesce(p_password,'') = right(ph, 4);
  else
    ok := a.pw_hash = extensions.crypt(coalesce(p_password,''), a.pw_hash);
  end if;
  if not ok then
    if a.failed + 1 >= 5 then
      update public.jw_member_auth set failed = 0, locked_until = now() + interval '10 minutes' where member_id = p_member;
      return json_build_object('ok', false, 'error', '비밀번호를 5번 틀려 10분간 잠겼습니다.');
    end if;
    update public.jw_member_auth set failed = failed + 1 where member_id = p_member;
    return json_build_object('ok', false, 'error', '비밀번호가 맞지 않습니다. (' || (a.failed + 1) || '/5)');
  end if;
  update public.jw_member_auth set failed = 0, locked_until = null where member_id = p_member;
  delete from public.jw_member_sessions where expires_at < now();
  tok := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.jw_member_sessions(token_hash, member_id, expires_at)
    values (encode(extensions.digest(tok, 'sha256'), 'hex'), p_member, now() + interval '30 days');
  return json_build_object('ok', true, 'token', tok, 'must_change', a.must_change or a.pw_hash is null);
end $$;

-- 내 비밀번호 상태 (첫 로그인 변경 필요 여부)
create or replace function public.jw_my_password_state() returns json language sql stable security definer set search_path = '' as $$
  select json_build_object('must_change', coalesce((select must_change or pw_hash is null from public.jw_member_auth where member_id = public.jw_session_member()), true)) $$;

-- 비밀번호 변경 (로그인한 본인)
create or replace function public.jw_change_password(p_current text, p_new text) returns json
  language plpgsql volatile security definer set search_path = '' as $$
declare mid uuid := public.jw_session_member(); a public.jw_member_auth; ph text; ok boolean;
begin
  if mid is null then return json_build_object('ok', false, 'error', '다시 로그인해 주세요.'); end if;
  if length(coalesce(p_new,'')) < 6 then return json_build_object('ok', false, 'error', '새 비밀번호는 6자 이상으로 정해 주세요.'); end if;
  select regexp_replace(coalesce(phone,''), '\D', '', 'g') into ph from public.jw_members where id = mid;
  if length(ph) >= 4 and (p_new = right(ph, 4) or p_new = ph or p_new = right(ph, 8)) then
    return json_build_object('ok', false, 'error', '휴대폰 번호와 다른 비밀번호를 정해 주세요.'); end if;
  select * into a from public.jw_member_auth where member_id = mid;
  ok := case when a.pw_hash is null then coalesce(p_current,'') = right(ph, 4)
             else a.pw_hash = extensions.crypt(coalesce(p_current,''), a.pw_hash) end;
  if not ok then return json_build_object('ok', false, 'error', '현재 비밀번호가 맞지 않습니다.'); end if;
  update public.jw_member_auth set pw_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 8)),
    must_change = false, changed_at = now(), failed = 0, locked_until = null where member_id = mid;
  return json_build_object('ok', true);
end $$;

-- 로그아웃 (현재 기기의 로그인만 끊음)
create or replace function public.jw_member_logout() returns void language plpgsql volatile security definer set search_path = '' as $$
declare v text;
begin
  begin v := current_setting('request.headers', true)::json ->> 'x-jw-member'; exception when others then return; end;
  if v is not null then delete from public.jw_member_sessions where token_hash = encode(extensions.digest(v, 'sha256'), 'hex'); end if;
end $$;

-- 관리자·임원: 비밀번호 초기화 (임시 비밀번호 없으면 휴대폰 뒷 4자리) + 그 회원의 모든 로그인 끊기
create or replace function public.jw_reset_member_password(p_member uuid, p_temp text default null) returns json
  language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.jw_is_officer() then return json_build_object('ok', false, 'error', '관리자·임원만 초기화할 수 있습니다.'); end if;
  if p_temp is not null and length(p_temp) < 4 then return json_build_object('ok', false, 'error', '임시 비밀번호는 4자 이상이어야 합니다.'); end if;
  insert into public.jw_member_auth(member_id) values (p_member) on conflict do nothing;
  update public.jw_member_auth set pw_hash = case when p_temp is null then null else extensions.crypt(p_temp, extensions.gen_salt('bf', 8)) end,
    must_change = true, failed = 0, locked_until = null, changed_at = null where member_id = p_member;
  delete from public.jw_member_sessions where member_id = p_member;
  return json_build_object('ok', true);
end $$;

-- 관리자·임원: 회원별 비밀번호 상태
create or replace function public.jw_password_states() returns table(member_id uuid, self_set boolean, locked boolean, last_login timestamptz)
  language sql stable security definer set search_path = '' as $$
  select a.member_id, a.pw_hash is not null and not a.must_change, coalesce(a.locked_until > now(), false),
         (select max(s.created_at) from public.jw_member_sessions s where s.member_id = a.member_id)
    from public.jw_member_auth a where public.jw_is_officer() $$;

revoke all on function public.jw_session_member(), public.jw_login_candidates(text), public.jw_member_login(uuid,text),
  public.jw_my_password_state(), public.jw_change_password(text,text), public.jw_member_logout(),
  public.jw_reset_member_password(uuid,text), public.jw_password_states() from public;
grant execute on function public.jw_session_member(), public.jw_login_candidates(text), public.jw_member_login(uuid,text),
  public.jw_my_password_state(), public.jw_change_password(text,text), public.jw_member_logout(),
  public.jw_reset_member_password(uuid,text), public.jw_password_states() to anon, authenticated;

select '정우회 회원 비밀번호 로그인 설치 완료' as result;
