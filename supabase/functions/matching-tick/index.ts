// pg_cron 이 1분마다 호출 (헤더 x-cron-secret)
// 반경 확대 · 미매칭 만료(→환불 큐) · 새 반경 전문가에게 추가 콜 발송
import { env, handleError, json, requireSecretHeader } from "../_shared/http.ts";
import { matchingTick } from "../_shared/dispatch.ts";
import { deps } from "../_shared/deps.ts";

Deno.serve(async (req) => {
  try {
    requireSecretHeader(req, "x-cron-secret", env("CRON_SECRET"));
    const d = deps();
    return json({ ok: true, ...(await matchingTick(d)) });
  } catch (e) {
    return handleError(e);
  }
});
