import type { Db, RequestRow } from "./types.ts";
import type { PortOne } from "./portone.ts";
import { requestIdFromPaymentId } from "./portone.ts";
import { AppError } from "./http.ts";

export interface PaymentDeps { db: Db; portone: PortOne }

/**
 * PG 결제 검증 → 요청을 '매칭대기'로 전환
 * 앱(payment-confirm)과 PortOne 웹훅이 둘 다 호출해도 한 번만 처리됨(멱등)
 *  - 결제ID가 이 요청 것인지 / PG에서 실제 PAID인지 / 금액이 서버 계산 금액과 같은지 검증
 *  - 금액이 다르거나 요청이 이미 취소된 상태면 PG 결제를 자동 취소
 */
export async function confirmPaidPayment(
  { db, portone }: PaymentDeps,
  paymentId: string,
  opts: { expectedCustomerId?: string } = {},
): Promise<{ request: RequestRow; alreadyProcessed: boolean }> {
  const requestId = requestIdFromPaymentId(paymentId);
  if (!requestId) throw new AppError("BAD_PAYMENT_ID", "결제 정보가 올바르지 않습니다");

  const request = await db.getRequest(requestId);
  if (!request) throw new AppError("NOT_FOUND", "요청을 찾을 수 없습니다", 404);
  if (opts.expectedCustomerId && request.customer_id !== opts.expectedCustomerId) {
    throw new AppError("FORBIDDEN", "본인 요청만 결제 확인할 수 있습니다", 403);
  }

  // 이미 처리된 결제 (앱·웹훅 중복 호출)
  const existing = await db.getPaymentByRequest(requestId);
  if (existing && existing.status !== "ready") {
    if (existing.pg_payment_id === paymentId) return { request, alreadyProcessed: true };
    throw new AppError("ALREADY_PAID", "이미 다른 결제로 처리된 요청입니다", 409);
  }

  const pg = await portone.getPayment(paymentId);
  if (pg.status !== "PAID") {
    throw new AppError("NOT_PAID", `결제가 완료되지 않았습니다 (${pg.status})`, 402);
  }

  const refundAll = async (reason: string) => {
    const res = await portone.cancelPayment(paymentId, pg.amount.total, reason, pg.amount.total);
    if (!res.ok) console.error("자동 결제취소 실패 — 관리자 확인 필요", paymentId, res);
  };

  if (pg.amount.total !== request.total_fee) {
    await refundAll("결제 금액 불일치 자동취소");
    throw new AppError("AMOUNT_MISMATCH", "결제 금액이 맞지 않아 자동 취소했습니다. 다시 요청해 주세요.", 409);
  }
  if (request.status !== "pending_payment") {
    // 결제하는 사이 요청이 취소된 경우 등
    await refundAll("결제 대기 상태가 아닌 요청 자동취소");
    throw new AppError("INVALID_STATE", "이미 취소되었거나 처리된 요청이라 결제를 자동 취소했습니다.", 409);
  }

  const updated = await db.confirmPayment(requestId, paymentId, pg.amount.total);
  return { request: updated, alreadyProcessed: false };
}
