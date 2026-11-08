-- =====================================================================
-- Edge Function 지원: 푸시 토큰 / 환불 큐 / 알림 / 자동 실행 스케줄
-- =====================================================================

-- 1. 기기 푸시 토큰 (FCM) ------------------------------------------------
create table device_tokens (
  token       text primary key,
  user_id     uuid not null references profiles (id) on delete cascade,
  platform    text not null check (platform in ('android', 'ios', 'web')),
  updated_at  timestamptz not null default now()
);
create index device_tokens_user_idx on device_tokens (user_id);
alter table device_tokens enable row level security;

grant select, insert, update, delete on device_tokens to authenticated;
alter table device_tokens alter column user_id set default auth.uid();
create policy "own tokens" on device_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 앱 시작/로그인 시 호출: 같은 토큰이 다른 계정에 있으면 옮겨옴
create or replace function register_device_token(p_token text, p_platform text)
returns void language sql security definer set search_path = public as $$
  insert into device_tokens (token, user_id, platform) values (p_token, auth.uid(), p_platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now()
$$;
revoke all on function register_device_token(text, text) from public, anon;
grant execute on function register_device_token(text, text) to authenticated;

-- 2. 환불 큐 -------------------------------------------------------------
alter table payments add column refund_attempts int not null default 0;
alter table payments add column last_error text;
alter table payments add column refund_pg_id text;
alter table payments add column refund_claimed_at timestamptz;

-- 환불 대기 건을 가져가면서 'refund_processing'으로 잠금 (동시에 여러 번 실행돼도 한 번만 환불)
create or replace function claim_refunds(p_limit int default 20)
returns setof payments language plpgsql security definer set search_path = public as $$
begin
  return query
  update payments p set status = 'refund_processing', refund_attempts = p.refund_attempts + 1,
                        refund_claimed_at = now()
  where p.id in (
    select id from payments
    where status = 'refund_requested' and refund_attempts < 5
    order by id
    for update skip locked
    limit p_limit
  )
  returning p.*;
end $$;

-- 5분 넘게 'refund_processing'에 멈춘 건(함수가 중간에 죽은 경우) 되돌리기
create or replace function release_stuck_refunds()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update payments set status = 'refund_requested', last_error = coalesce(last_error, '') || ' [stuck→retry]'
  where status = 'refund_processing' and refund_claimed_at < now() - interval '5 minutes';
  get diagnostics n = row_count;
  return n;
end $$;

-- 환불 결과 기록 + 이력
create or replace function complete_refund(p_payment bigint, p_ok boolean, p_pg_cancel_id text, p_error text)
returns payments language plpgsql security definer set search_path = public as $$
declare p payments;
begin
  update payments set
    status      = case when not p_ok then
                         case when refund_attempts >= 5 then 'failed'::payment_status else 'refund_requested'::payment_status end
                       when refund_amount >= amount then 'refunded'::payment_status
                       else 'partial_refunded'::payment_status end,
    refunded_at = case when p_ok then now() else refunded_at end,
    refund_pg_id = coalesce(p_pg_cancel_id, refund_pg_id),
    last_error  = case when p_ok then null else p_error end
  where id = p_payment and status = 'refund_processing'
  returning * into p;

  if p.id is not null and p_ok then
    insert into request_events (request_id, from_status, to_status, note)
    select r.id, r.status, r.status, format('환불 완료 %s원', p.refund_amount)
    from requests r where r.id = p.request_id;
  end if;
  return p;
end $$;

-- 3. 콜 발송 기록 (중복 발송 방지 키 = request_id + expert_id) -----------------
create or replace function record_dispatches(p_request bigint, p_radius numeric, p_targets jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into request_dispatches (request_id, expert_id, radius_km, distance_km)
  select p_request, (t ->> 'expert_id')::uuid, p_radius, (t ->> 'distance_km')::numeric
  from jsonb_array_elements(p_targets) t
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- 매칭 대기 중인데 아직 이번 반경으로 발송 안 한 요청 목록 (tick 용)
create or replace function requests_needing_dispatch()
returns table (request_id bigint, type request_type, radius_km numeric, target_expert_id uuid)
language sql stable security definer set search_path = public as $$
  select r.id, r.type, r.match_radius_km, r.target_expert_id
  from requests r
  where r.status = 'matching'
    and (
      (r.type = 'broadcast' and not exists (
         select 1 from request_dispatches d where d.request_id = r.id and d.radius_km >= r.match_radius_km))
      or
      (r.type = 'direct' and not exists (select 1 from request_dispatches d where d.request_id = r.id))
    )
$$;

-- service_role 전용 함수: 앱(anon/authenticated)에서는 호출 불가
revoke all on function claim_refunds(int), release_stuck_refunds(), complete_refund(bigint, boolean, text, text),
                record_dispatches(bigint, numeric, jsonb), requests_needing_dispatch()
  from public, anon, authenticated;

-- =====================================================================
-- 4. 자동 실행 (Supabase 대시보드 → Database → Extensions 에서 pg_cron, pg_net 활성화 후 1회 실행)
--    프로젝트 URL·CRON_SECRET 은 Vault 에 저장:
--      select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--      select vault.create_secret('<CRON_SECRET 값>', 'cron_secret');
-- =====================================================================
-- select cron.schedule('matching-tick', '* * * * *', $$
--   select net.http_post(
--     url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/matching-tick',
--     headers := jsonb_build_object('Content-Type', 'application/json',
--                'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
--     body    := '{}'::jsonb)
-- $$);
-- select cron.schedule('process-refunds', '* * * * *', $$
--   select net.http_post(
--     url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/process-refunds',
--     headers := jsonb_build_object('Content-Type', 'application/json',
--                'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
--     body    := '{}'::jsonb)
-- $$);
-- select cron.schedule('expert-levels', '0 19 * * *', $$select recompute_expert_levels()$$);  -- 04:00 KST
--
-- 상태 변경 알림: 대시보드 → Database → Webhooks → request_events INSERT →
--   POST https://<project-ref>.supabase.co/functions/v1/request-notify  (헤더 x-webhook-secret: <WEBHOOK_SECRET>)
