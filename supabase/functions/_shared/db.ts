import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { Db, DispatchTarget, PaymentRow, RequestRow } from "./types.ts";
import { env } from "./http.ts";

const REQUEST_COLS = "id, customer_id, category_id, type, target_expert_id, expert_id, status, total_fee, match_radius_km, region_code, symptom";
const PAYMENT_COLS = "id, request_id, amount, pg_payment_id, status, refund_amount, refund_reason, refund_attempts";

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** service_role 키로 접속 (RLS 우회) — Edge Function 내부에서만 사용 */
export function createSupabaseDb(client?: SupabaseClient): Db {
  const sb = client ?? createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const categoryCache = new Map<number, string>();

  return {
    async getUserIdFromJwt(jwt) {
      const { data, error } = await sb.auth.getUser(jwt);
      return error ? null : data.user?.id ?? null;
    },
    async getRequest(id) {
      return check(await sb.from("requests").select(REQUEST_COLS).eq("id", id).maybeSingle()) as RequestRow | null;
    },
    async getPaymentByRequest(requestId) {
      return check(await sb.from("payments").select(PAYMENT_COLS).eq("request_id", requestId).maybeSingle()) as PaymentRow | null;
    },
    async getPaymentByPgId(pgId) {
      return check(await sb.from("payments").select(PAYMENT_COLS).eq("pg_payment_id", pgId).maybeSingle()) as PaymentRow | null;
    },
    async confirmPayment(requestId, pgPaymentId, amount) {
      return check(await sb.rpc("confirm_payment", {
        p_request: requestId, p_pg_payment_id: pgPaymentId, p_amount: amount,
      })) as RequestRow;
    },
    async pickTargets(requestId, radiusKm) {
      return check(await sb.rpc("pick_broadcast_targets", { p_request: requestId, p_radius_km: radiusKm })) as DispatchTarget[];
    },
    async recordDispatches(requestId, radiusKm, targets) {
      return check(await sb.rpc("record_dispatches", {
        p_request: requestId, p_radius: radiusKm, p_targets: targets,
      })) as number;
    },
    async getTokens(userIds) {
      return check(await sb.from("device_tokens").select("token, user_id").in("user_id", userIds)) ?? [];
    },
    async deleteTokens(tokens) {
      check(await sb.from("device_tokens").delete().in("token", tokens));
    },
    async getCategoryName(categoryId) {
      if (!categoryCache.has(categoryId)) {
        const row = check(await sb.from("categories").select("name").eq("id", categoryId).single()) as { name: string };
        categoryCache.set(categoryId, row.name);
      }
      return categoryCache.get(categoryId)!;
    },
    async processMatchingQueue() {
      const rows = check(await sb.rpc("process_matching_queue")) as { expanded: number; expired: number }[];
      return rows?.[0] ?? { expanded: 0, expired: 0 };
    },
    async requestsNeedingDispatch() {
      return check(await sb.rpc("requests_needing_dispatch")) ?? [];
    },
    async claimRefunds(limit) {
      return check(await sb.rpc("claim_refunds", { p_limit: limit })) as PaymentRow[] ?? [];
    },
    async releaseStuckRefunds() {
      return check(await sb.rpc("release_stuck_refunds")) as number;
    },
    async completeRefund(paymentId, ok, pgCancelId, error) {
      check(await sb.rpc("complete_refund", {
        p_payment: paymentId, p_ok: ok, p_pg_cancel_id: pgCancelId, p_error: error,
      }));
    },
  };
}
