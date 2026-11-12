-- 신규 회원 가입 신청서 (web/join.html): 누구나 제출(insert)만, 열람·승인·삭제는 관리자만
create table public.jw_applications (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  name text not null check (length(trim(name)) between 1 and 40),
  phone text not null check (length(phone) between 9 and 20),
  birth_year text default '' check (length(birth_year) <= 4),
  company text not null check (length(trim(company)) between 1 and 80),
  title text default '' check (length(title) <= 60),
  products text default '' check (length(products) <= 300),
  industry text default '' check (length(industry) <= 80),
  email text default '' check (length(email) <= 120),
  website text default '' check (length(website) <= 200),
  address text default '' check (length(address) <= 200),
  recommender text default '' check (length(recommender) <= 40),
  message text default '' check (length(message) <= 500),
  photo_path text default '' check (photo_path = '' or photo_path like 'applications/%'),
  company_image_path text default '' check (company_image_path = '' or company_image_path like 'applications/%'),
  card_image_path text default '' check (card_image_path = '' or card_image_path like 'applications/%'),
  agreed boolean not null check (agreed),
  member_id uuid references public.jw_members(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.jw_applications enable row level security;
create policy jw_app_submit on public.jw_applications for insert to anon, authenticated
  with check (status = 'pending' and member_id is null and reviewed_at is null);
create policy jw_app_admin_read on public.jw_applications for select to anon, authenticated using ((select public.jw_is_admin()));
create policy jw_app_admin_update on public.jw_applications for update to anon, authenticated
  using ((select public.jw_is_admin())) with check ((select public.jw_is_admin()));
create policy jw_app_admin_delete on public.jw_applications for delete to anon, authenticated using ((select public.jw_is_admin()));
-- 신청서 사진: applications/ 폴더 업로드만 허용
create policy jw_media_apply_ins on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'jw-media' and (storage.foldername(name))[1] = 'applications');
