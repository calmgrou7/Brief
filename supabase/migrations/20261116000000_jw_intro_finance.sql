-- 회원 사업 소개글 + 재무보고 (월별 입출금·찬조)
alter table public.jw_members add column if not exists intro text default '';
create table if not exists public.jw_finance (
  id uuid primary key default gen_random_uuid(),
  period text not null unique check (period ~ '^\d{4}-\d{2}$'),
  opening_balance bigint not null default 0,
  items jsonb not null default '[]',          -- [{date, kind:'in'|'out', amount, desc, memo, sponsor}]
  note text default '',
  images jsonb not null default '[]',         -- 저장소 경로 finance/<id>/...
  updated_by text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.jw_finance enable row level security;
create policy jw_finance_read on public.jw_finance for select to anon, authenticated using ((select public.jw_is_member()));
create policy jw_finance_write on public.jw_finance for all to anon, authenticated
  using ((select public.jw_is_officer())) with check ((select public.jw_is_officer()));
create policy jw_media_fin_ins on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'jw-media' and (storage.foldername(name))[1] = 'finance' and (select public.jw_is_officer()));
create policy jw_media_fin_del on storage.objects for delete to anon, authenticated
  using (bucket_id = 'jw-media' and (storage.foldername(name))[1] = 'finance' and (select public.jw_is_officer()));
-- 데이터: 황시완 부회장 + 경조위원장 겸직 (2026-01-01)
