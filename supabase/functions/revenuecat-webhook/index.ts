// RevenueCat → 구독 상태를 entitlements 테이블에 반영
// RevenueCat 대시보드 > Integrations > Webhooks 에서
//   URL: https://<project>.supabase.co/functions/v1/revenuecat-webhook
//   Authorization header: Bearer <REVENUECAT_WEBHOOK_SECRET 값>
import { admin, json } from '../_shared/supabase.ts';

const SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (!SECRET || req.headers.get('Authorization') !== `Bearer ${SECRET}`) return json({ message: 'unauthorized' }, 401);

  const { event } = await req.json().catch(() => ({ event: null }));
  if (!event?.type) return json({ message: 'bad payload' }, 400);
  if (event.type === 'TEST') return json({ ok: true });

  // 앱에서 Supabase 사용자 ID로 logIn 하므로 app_user_id = auth.users.id
  // (TRANSFER 이벤트는 transferred_to 의 사용자에게 권한이 넘어감)
  const ids: string[] = event.type === 'TRANSFER' ? (event.transferred_to ?? []) : [event.app_user_id];
  const userIds = ids.filter((id) => UUID.test(id));
  if (!userIds.length) return json({ ok: true, skipped: 'anonymous user' });

  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
  // 해지(CANCELLATION)·결제실패(BILLING_ISSUE)는 만료일까지 이용 가능, EXPIRATION에서 종료
  const isActive = event.type !== 'EXPIRATION' && (!expiresAt || expiresAt.getTime() > Date.now());

  const rows = userIds.map((user_id) => ({
    user_id,
    is_active: isActive,
    product_id: event.product_id ?? null,
    period_type: event.period_type ?? null,
    store: event.store ?? null,
    expires_at: expiresAt?.toISOString() ?? null,
    last_event_type: event.type,
    last_event_at: event.event_timestamp_ms ? new Date(event.event_timestamp_ms).toISOString() : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // 늦게 도착한 옛 이벤트가 최신 상태를 덮어쓰지 않도록 시간 비교
  for (const row of rows) {
    const { data: cur } = await admin.from('entitlements').select('last_event_at').eq('user_id', row.user_id).maybeSingle();
    if (cur?.last_event_at && new Date(cur.last_event_at) > new Date(row.last_event_at)) continue;
    const { error } = await admin.from('entitlements').upsert(row);
    if (error) {
      console.error(error);
      return json({ message: 'db error' }, 500); // 500이면 RevenueCat이 재시도
    }
  }
  return json({ ok: true });
});
