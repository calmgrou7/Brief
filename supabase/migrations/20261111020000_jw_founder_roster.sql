-- 창립회원 표시, 명부 번호(NO) — 동명이인 구분과 엑셀 재업로드 매칭에 사용
alter table public.jw_members add column is_founder boolean not null default false;
alter table public.jw_members add column roster_no int;

-- 일반회원은 본인 수정 시 창립/명부번호도 변경 불가
create or replace function public.jw_guard_member_update() returns trigger language plpgsql
  set search_path = '' as $$
begin
  if coalesce(auth.jwt() ->> 'role','') = 'authenticated' and not public.jw_is_admin() then
    new.email := old.email; new.guardian_id := old.guardian_id;
    new.joined := old.joined; new.status := old.status;
    new.is_founder := old.is_founder; new.roster_no := old.roster_no;
  end if;
  return new;
end $$;
