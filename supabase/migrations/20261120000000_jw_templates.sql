-- 공용 설정 저장소 (예: 'nametag' 명찰 배경·글자 위치) + 저장소 templates/ 폴더 (임원 업로드)
create table if not exists public.jw_templates (
  key text primary key,
  data jsonb not null default '{}',
  updated_by text default '',
  updated_at timestamptz not null default now()
);
alter table public.jw_templates enable row level security;
create policy jw_templates_read on public.jw_templates for select to anon, authenticated using ((select public.jw_is_member()));
create policy jw_templates_write on public.jw_templates for all to anon, authenticated
  using ((select public.jw_is_officer())) with check ((select public.jw_is_officer()));
create policy jw_media_tpl_ins on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'jw-media' and (storage.foldername(name))[1] = 'templates' and (select public.jw_is_officer()));
create policy jw_media_tpl_del on storage.objects for delete to anon, authenticated
  using (bucket_id = 'jw-media' and (storage.foldername(name))[1] = 'templates' and (select public.jw_is_officer()));
