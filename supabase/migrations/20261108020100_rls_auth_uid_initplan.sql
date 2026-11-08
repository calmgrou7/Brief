-- 성능 점검(auth_rls_initplan) 대응: RLS 정책의 auth.uid() 를 (select auth.uid()) 로 바꿔 행마다 재계산하지 않도록
do $$
declare p record; q text; c text;
begin
  for p in select schemaname, tablename, policyname, qual, with_check from pg_policies where schemaname = 'public' loop
    q := replace(p.qual, 'auth.uid()', '(select auth.uid())');
    c := replace(p.with_check, 'auth.uid()', '(select auth.uid())');
    if q is distinct from p.qual and q is not null then
      execute format('alter policy %I on %I.%I using (%s)', p.policyname, p.schemaname, p.tablename, q);
    end if;
    if c is distinct from p.with_check and c is not null then
      execute format('alter policy %I on %I.%I with check (%s)', p.policyname, p.schemaname, p.tablename, c);
    end if;
  end loop;
end $$;
