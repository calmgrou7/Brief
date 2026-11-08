// Supabase Database Webhook: request_events INSERT → 고객/전문가 상태 알림 푸시
// 대시보드 → Database → Webhooks 에서 HTTP 헤더 x-webhook-secret 추가
import { env, handleError, json, requireSecretHeader } from "../_shared/http.ts";
import { buildNotifications } from "../_shared/notify.ts";
import { pushToUsers } from "../_shared/push.ts";
import { deps } from "../_shared/deps.ts";
import type { RequestStatus } from "../_shared/types.ts";

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: { request_id: number; from_status: RequestStatus | null; to_status: RequestStatus };
}

Deno.serve(async (req) => {
  try {
    requireSecretHeader(req, "x-webhook-secret", env("WEBHOOK_SECRET"));
    const payload = await req.json() as WebhookPayload;
    if (payload.table !== "request_events" || payload.type !== "INSERT") return json({ ok: true, ignored: true });

    const d = deps();
    const { request_id, from_status, to_status } = payload.record;
    const r = await d.db.getRequest(request_id);
    if (!r) return json({ ok: true, ignored: "no request" });

    const notes = buildNotifications(r, from_status, to_status, await d.db.getCategoryName(r.category_id));
    let delivered = 0;
    for (const n of notes) delivered += await pushToUsers(d.db, d.push, [n.userId], n.msg);
    return json({ ok: true, notifications: notes.length, delivered });
  } catch (e) {
    return handleError(e);
  }
});
