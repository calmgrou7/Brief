-- 성능 수정: 권한 함수를 (select ...)로 감싸 쿼리당 1회만 평가
-- (이전에는 행마다 bcrypt 접속 코드 검사 → 93행 x 70ms 로 anon 제한시간 3초 초과, 회원 목록 500 오류)
alter policy jw_admins_read on public.jw_admins using ((select public.jw_is_admin()));
alter policy jw_members_read on public.jw_members using ((select public.jw_is_member()));
alter policy jw_members_ins on public.jw_members with check ((select public.jw_is_admin()));
alter policy jw_members_upd on public.jw_members
  using ((select public.jw_is_admin()) or id = (select public.jw_my_member_id()))
  with check ((select public.jw_is_admin()) or id = (select public.jw_my_member_id()));
alter policy jw_members_del on public.jw_members using ((select public.jw_is_admin()));
alter policy jw_positions_read on public.jw_positions using ((select public.jw_is_member()));
alter policy jw_positions_write on public.jw_positions using ((select public.jw_is_admin())) with check ((select public.jw_is_admin()));
alter policy jw_terms_read on public.jw_terms using ((select public.jw_is_member()));
alter policy jw_terms_write on public.jw_terms using ((select public.jw_is_admin())) with check ((select public.jw_is_admin()));
alter policy jw_events_read on public.jw_events using ((select public.jw_is_member()));
alter policy jw_events_write on public.jw_events using ((select public.jw_is_officer())) with check ((select public.jw_is_officer()));
alter policy jw_history_read on public.jw_history using ((select public.jw_is_member()));
alter policy jw_history_write on public.jw_history using ((select public.jw_is_officer())) with check ((select public.jw_is_officer()));
alter policy jw_media_read on storage.objects using (bucket_id = 'jw-media' and (select public.jw_is_member()));
alter policy jw_media_ins on storage.objects with check (bucket_id = 'jw-media' and ((select public.jw_is_admin()) or (storage.foldername(name))[1] = (select public.jw_my_member_id())::text));
alter policy jw_media_upd on storage.objects using (bucket_id = 'jw-media' and ((select public.jw_is_admin()) or (storage.foldername(name))[1] = (select public.jw_my_member_id())::text));
alter policy jw_media_del on storage.objects using (bucket_id = 'jw-media' and ((select public.jw_is_admin()) or (storage.foldername(name))[1] = (select public.jw_my_member_id())::text));
