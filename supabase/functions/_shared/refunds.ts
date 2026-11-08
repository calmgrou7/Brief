import type { Db } from "./types.ts";
import type { PortOne } from "./portone.ts";
import type { Push } from "./fcm.ts";
import { pushToUsers } from "./push.ts";

export interface RefundDeps { db: Db; portone: PortOne; push?: Push }

/**
 * 환불 큐 처리 (1분마다)
 *  DB 의 payments.status='refund_requested' 건을 잠금(claim) → PortOne 취소 → 결과 기록
 *  - currentCancellableAmount 를 함께 보내 중복 환불을 PG 단에서 차단
 *  - PG 오류가 나도 실제로는 취소된 경우(이전 실행에서 성공 후 기록 실패)는 성공으로 기록
 *  - 5회 실패 시 'failed' → 관리자 화면에서 수동 처리
 */
export async function processRefunds({ db, portone, push }: RefundDeps, limit = 20) {
  const released = await db.releaseStuckRefunds();
  const claimed = await db.claimRefunds(limit);
  let ok = 0, failed = 0;

  for (const p of claimed) {
    if (!p.pg_payment_id || p.refund_amount <= 0) {
      await db.completeRefund(p.id, false, null, "결제ID 또는 환불금액 없음");
      failed++;
      continue;
    }
    try {
      const res = await portone.cancelPayment(p.pg_payment_id, p.refund_amount, p.refund_reason ?? "환불", p.amount);
      let success = res.ok;
      let error: string | null = res.ok ? null : `${res.type}: ${res.message}`;

      if (!res.ok) {
        // 이미 취소돼 있으면 성공으로 간주 (멱등)
        const pg = await portone.getPayment(p.pg_payment_id).catch(() => null);
        if (pg && (pg.status === "CANCELLED" || pg.status === "PARTIAL_CANCELLED") &&
            (pg.amount.cancelled ?? 0) >= p.refund_amount) {
          success = true;
          error = null;
        }
      }

      await db.completeRefund(p.id, success, res.ok ? res.cancellationId : null, error);
      if (success) {
        ok++;
        if (push) {
          const r = await db.getRequest(p.request_id);
          if (r) {
            await pushToUsers(db, push, [r.customer_id], {
              title: "💳 환불 완료",
              body: `${p.refund_amount.toLocaleString("ko-KR")}원이 환불 처리되었습니다. (카드사에 따라 3~5영업일)`,
              data: { type: "refund", request_id: String(p.request_id) },
            }).catch((e) => console.warn("refund push failed", e));
          }
        }
      } else failed++;
    } catch (e) {
      await db.completeRefund(p.id, false, null, String(e));
      failed++;
    }
  }
  return { released, claimed: claimed.length, refunded: ok, failed };
}
