// pg_cron 이 1분마다 호출 (헤더 x-cron-secret)
// 취소·노쇼·미매칭·관리자 환불 요청을 PortOne 에 실제 환불 처리
import { env, handleError, json, requireSecretHeader } from "../_shared/http.ts";
import { processRefunds } from "../_shared/refunds.ts";
import { deps } from "../_shared/deps.ts";

Deno.serve(async (req) => {
  try {
    requireSecretHeader(req, "x-cron-secret", env("CRON_SECRET"));
    return json({ ok: true, ...(await processRefunds(deps())) });
  } catch (e) {
    return handleError(e);
  }
});
