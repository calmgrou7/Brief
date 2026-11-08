// PortOne V2 REST API — https://developers.portone.io/api/rest-v2
export interface PortOnePayment {
  id: string;
  status: "READY" | "PAID" | "FAILED" | "CANCELLED" | "PARTIAL_CANCELLED" | "VIRTUAL_ACCOUNT_ISSUED" | "PAY_PENDING";
  amount: { total: number; cancelled?: number };
  currency?: string;
}

export interface PortOne {
  getPayment(paymentId: string): Promise<PortOnePayment>;
  cancelPayment(paymentId: string, amount: number, reason: string, currentCancellableAmount: number):
    Promise<{ ok: true; cancellationId: string | null } | { ok: false; type: string; message: string }>;
}

export function createPortOne(apiSecret: string, fetchFn: typeof fetch = fetch, base = "https://api.portone.io"): PortOne {
  const headers = { Authorization: `PortOne ${apiSecret}`, "Content-Type": "application/json" };
  return {
    async getPayment(paymentId) {
      const res = await fetchFn(`${base}/payments/${encodeURIComponent(paymentId)}`, { headers });
      if (!res.ok) throw new Error(`PortOne 결제 조회 실패 ${res.status}: ${await res.text()}`);
      return await res.json() as PortOnePayment;
    },
    async cancelPayment(paymentId, amount, reason, currentCancellableAmount) {
      const res = await fetchFn(`${base}/payments/${encodeURIComponent(paymentId)}/cancel`, {
        method: "POST",
        headers,
        // currentCancellableAmount: 이미 취소된 금액이 있으면 PG가 거절 → 중복 환불 방지
        body: JSON.stringify({ amount, reason, currentCancellableAmount }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) return { ok: true, cancellationId: body?.cancellation?.id ?? null };
      return { ok: false, type: body?.type ?? `HTTP_${res.status}`, message: body?.message ?? "" };
    },
  };
}

/** 결제ID 규칙: 앱에서 `req_{요청ID}_{랜덤}` 형식으로 생성 → 결제와 요청을 묶어 다른 요청에 재사용 차단 */
export function requestIdFromPaymentId(paymentId: string): number | null {
  const m = /^req_(\d+)_[A-Za-z0-9-]{6,}$/.exec(paymentId);
  return m ? Number(m[1]) : null;
}
