// 앱이 PortOne 결제창 완료 직후 호출
// POST { paymentId: "req_123_xxxxxx" }  (Authorization: Bearer <고객 로그인 JWT>)
import { AppError, bearer, corsHeaders, handleError, json } from "../_shared/http.ts";
import { confirmPaidPayment } from "../_shared/payment.ts";
import { dispatchRequest } from "../_shared/dispatch.ts";
import { deps } from "../_shared/deps.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") throw new AppError("METHOD", "POST only", 405);
    const d = deps();
    const jwt = bearer(req);
    const userId = jwt ? await d.db.getUserIdFromJwt(jwt) : null;
    if (!userId) throw new AppError("UNAUTHORIZED", "로그인이 필요합니다", 401);

    const { paymentId } = await req.json().catch(() => ({}));
    if (typeof paymentId !== "string") throw new AppError("BAD_REQUEST", "paymentId 가 필요합니다");

    const { request, alreadyProcessed } = await confirmPaidPayment(d, paymentId, { expectedCustomerId: userId });
    // 결제 확인 즉시 1차 콜 발송 (이후 반경 확대는 matching-tick 이 담당)
    const dispatch = alreadyProcessed ? null : await dispatchRequest(d, request.id).catch((e) => {
      console.error("initial dispatch failed — matching-tick 이 재시도", e);
      return null;
    });
    return json({ ok: true, requestId: request.id, status: request.status, alreadyProcessed, dispatch });
  } catch (e) {
    return handleError(e);
  }
});
