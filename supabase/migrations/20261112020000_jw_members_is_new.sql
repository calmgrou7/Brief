-- 신입회원 표시 (관리자만 변경 가능)
alter table public.jw_members add column is_new boolean not null default false;
create or replace function public.jw_guard_member_update() returns trigger language plpgsql
  set search_path = '' as $$
begin
  if coalesce(auth.jwt() ->> 'role','') = 'authenticated' and not public.jw_is_admin() then
    new.email := old.email; new.guardian_id := old.guardian_id;
    new.joined := old.joined; new.status := old.status;
    new.is_founder := old.is_founder; new.roster_no := old.roster_no; new.is_new := old.is_new;
  end if;
  return new;
end $$;
