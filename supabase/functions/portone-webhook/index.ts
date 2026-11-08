// PortOne 콘솔 → 결제연동 → 웹훅 URL: https://<project>.supabase.co/functions/v1/portone-webhook
// 앱이 결제 직후 꺼져도 결제가 매칭으로 이어지도록 보장하는 안전망
// supabase/config.toml 에서 verify_jwt = false (PortOne 은 Supabase JWT 를 보내지 않음, 대신 서명 검증)
import { env, handleError, json } from "../_shared/http.ts";
import { verifyStandardWebhook } from "../_shared/webhook.ts";
import { confirmPaidPayment } from "../_shared/payment.ts";
import { dispatchRequest } from "../_shared/dispatch.ts";
import { deps } from "../_shared/deps.ts";
import { AppError } from "../_shared/http.ts";

Deno.serve(async (req) => {
  try {
    const raw = await req.text();
    if (!(await verifyStandardWebhook(env("PORTONE_WEBHOOK_SECRET"), req.headers, raw))) {
      return json({ ok: false, message: "invalid signature" }, 401);
    }
    const event = JSON.parse(raw) as { type: string; data?: { paymentId?: string } };
    const paymentId = event.data?.paymentId;

    if (event.type !== "Transaction.Paid" || !paymentId) {
      return json({ ok: true, ignored: event.type });   // 다른 이벤트는 200 으로 받기만 (재전송 방지)
    }

    const d = deps();
    try {
      const { request, alreadyProcessed } = await confirmPaidPayment(d, paymentId);
      if (!alreadyProcessed) await dispatchRequest(d, request.id).catch((e) => console.error(e));
      return json({ ok: true, requestId: request.id, alreadyProcessed });
    } catch (e) {
      // 업무 오류(금액 불일치 자동취소 등)는 처리 완료로 응답 → PortOne 재시도 불필요
      if (e instanceof AppError && e.status < 500) {
        console.warn("webhook business error", paymentId, e.code, e.message);
        return json({ ok: true, handled: e.code });
      }
      throw e;   // 일시 오류는 500 → PortOne 이 재전송
    }
  } catch (e) {
    return handleError(e);
  }
});
