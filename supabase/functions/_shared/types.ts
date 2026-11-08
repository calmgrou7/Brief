// 공통 타입 — DB 스키마(supabase/migrations)와 맞춰 유지
export type RequestStatus =
  | "pending_payment" | "matching" | "matched" | "en_route" | "arrived" | "working"
  | "completed" | "confirmed" | "cancelled_by_customer" | "cancelled_by_expert" | "no_show" | "expired";

export interface RequestRow {
  id: number;
  customer_id: string;
  category_id: number;
  type: "broadcast" | "direct";
  target_expert_id: string | null;
  expert_id: string | null;
  status: RequestStatus;
  total_fee: number;
  match_radius_km: number | null;
  region_code: string | null;
  symptom: string | null;
}

export interface PaymentRow {
  id: number;
  request_id: number;
  amount: number;
  pg_payment_id: string | null;
  status: string;
  refund_amount: number;
  refund_reason: string | null;
  refund_attempts: number;
}

export interface DispatchTarget { expert_id: string; level: number; distance_km: number }
export interface DeviceToken { token: string; user_id: string }

/** Edge Function 이 쓰는 DB 작업 모음. 실제 구현은 db.ts(supabase-js), 테스트는 가짜 구현 사용 */
export interface Db {
  getUserIdFromJwt(jwt: string): Promise<string | null>;
  getRequest(id: number): Promise<RequestRow | null>;
  getPaymentByRequest(requestId: number): Promise<PaymentRow | null>;
  getPaymentByPgId(pgPaymentId: string): Promise<PaymentRow | null>;
  confirmPayment(requestId: number, pgPaymentId: string, amount: number): Promise<RequestRow>;
  pickTargets(requestId: number, radiusKm: number): Promise<DispatchTarget[]>;
  recordDispatches(requestId: number, radiusKm: number, targets: DispatchTarget[]): Promise<number>;
  getTokens(userIds: string[]): Promise<DeviceToken[]>;
  deleteTokens(tokens: string[]): Promise<void>;
  getCategoryName(categoryId: number): Promise<string>;
  processMatchingQueue(): Promise<{ expanded: number; expired: number }>;
  requestsNeedingDispatch(): Promise<{ request_id: number; type: string; radius_km: number; target_expert_id: string | null }[]>;
  claimRefunds(limit: number): Promise<PaymentRow[]>;
  releaseStuckRefunds(): Promise<number>;
  completeRefund(paymentId: number, ok: boolean, pgCancelId: string | null, error: string | null): Promise<void>;
}
