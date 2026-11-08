import type { RequestRow, RequestStatus } from "./types.ts";
import type { PushMessage } from "./fcm.ts";

type Target = "customer" | "expert";
interface Rule { to: Target; title: string; body: (cat: string) => string }

/** 상태 변경 → 누구에게 어떤 알림 (문구는 여기서만 관리) */
const RULES: Partial<Record<RequestStatus, Rule[]>> = {
  matched: [{ to: "customer", title: "✅ 전문가 매칭 완료", body: (c) => `${c} 전문가가 요청을 수락했어요. 앱에서 연락처를 확인하세요.` }],
  en_route: [{ to: "customer", title: "🚗 전문가 출발", body: () => "전문가가 출발했어요. 도착 예정 시간을 확인하세요." }],
  arrived: [{ to: "customer", title: "📍 전문가 도착", body: () => "전문가가 도착했어요." }],
  completed: [{ to: "customer", title: "🛠️ 작업 완료", body: () => "작업이 끝났어요. 완료 확인과 리뷰를 남겨주세요." }],
  confirmed: [{ to: "expert", title: "💰 고객 완료 확인", body: () => "고객이 완료를 확인했어요. 정산 예정 내역에 반영됩니다." }],
  cancelled_by_customer: [{ to: "expert", title: "❌ 고객 취소", body: () => "고객이 요청을 취소했어요." }],
  cancelled_by_expert: [{ to: "customer", title: "😥 전문가 사정으로 취소", body: () => "출장비는 전액 환불됩니다. 다시 요청해 주세요." }],
  no_show: [
    { to: "customer", title: "노쇼 처리 완료", body: () => "출장비 전액 환불이 진행됩니다. 불편을 드려 죄송합니다." },
    { to: "expert", title: "🔴 노쇼 페널티", body: () => "약속 미이행으로 콜 수신이 정지되었습니다." },
  ],
  expired: [{ to: "customer", title: "매칭 실패 · 자동 환불", body: () => "주변에 가능한 전문가가 없어 출장비를 전액 환불합니다." }],
};

export function buildNotifications(
  r: Pick<RequestRow, "id" | "customer_id" | "expert_id">, fromStatus: RequestStatus | null, toStatus: RequestStatus,
  categoryName: string,
): { userId: string; msg: PushMessage }[] {
  if (fromStatus === toStatus) return [];   // 환불 완료 같은 메모성 이벤트는 제외
  return (RULES[toStatus] ?? []).flatMap((rule) => {
    const userId = rule.to === "customer" ? r.customer_id : r.expert_id;
    if (!userId) return [];
    return [{
      userId,
      msg: {
        title: rule.title,
        body: rule.body(categoryName),
        data: { type: "status", request_id: String(r.id), status: toStatus },
        channel: "status" as const,
      },
    }];
  });
}
