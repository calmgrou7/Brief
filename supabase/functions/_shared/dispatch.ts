import type { Db, DispatchTarget } from "./types.ts";
import type { Push } from "./fcm.ts";
import { pushToUsers } from "./push.ts";

export interface Deps { db: Db; push: Push }

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

/**
 * 콜 발송
 *  - 전체콜: 현재 반경(match_radius_km)에서 아직 안 보낸 전문가에게 (레벨→신뢰점수→거리, 새싹 슬롯 보장은 DB 함수가 처리)
 *  - 지정콜: 지정 전문가 1명에게
 *  발송 기록을 먼저 남기고(중복 방지) 푸시. 반환: 발송 대상 수
 */
export async function dispatchRequest({ db, push }: Deps, requestId: number): Promise<{ targets: number; delivered: number }> {
  const r = await db.getRequest(requestId);
  if (!r || r.status !== "matching") return { targets: 0, delivered: 0 };

  const radius = Number(r.match_radius_km ?? 3);
  let targets: DispatchTarget[];
  if (r.type === "direct") {
    if (!r.target_expert_id) return { targets: 0, delivered: 0 };
    targets = [{ expert_id: r.target_expert_id, level: 0, distance_km: 0 }];
  } else {
    targets = await db.pickTargets(requestId, radius);
  }
  if (targets.length === 0) {
    // 대상이 없으면 기록 없이 종료 → 다음 tick 에서 다시 조회 (그 사이 출근한 전문가 포함)
    return { targets: 0, delivered: 0 };
  }

  const inserted = await db.recordDispatches(requestId, radius, targets);
  if (inserted === 0) return { targets: 0, delivered: 0 };   // 다른 실행이 이미 보냄

  const category = await db.getCategoryName(r.category_id);
  const delivered = await pushToUsers(db, push, targets.map((t) => t.expert_id), {
    title: r.type === "direct" ? `📌 지정 콜 · ${category}` : `🔔 새 콜 · ${category}`,
    body: `${r.symptom ? r.symptom.slice(0, 40) + " · " : ""}출장비 ${won(r.total_fee)} — 지금 수락하세요`,
    data: { type: "new_call", request_id: String(r.id), call_type: r.type },
    channel: "calls",
  });
  return { targets: targets.length, delivered };
}

/** 1분 tick: 반경 확대·만료 처리 후, 새 반경 대상에게 추가 발송 */
export async function matchingTick(deps: Deps) {
  const queue = await deps.db.processMatchingQueue();
  const pending = await deps.db.requestsNeedingDispatch();
  let sent = 0;
  for (const p of pending) {
    try {
      sent += (await dispatchRequest(deps, p.request_id)).targets;
    } catch (e) {
      console.error("dispatch failed", p.request_id, e);
    }
  }
  return { ...queue, dispatched_requests: pending.length, pushed_experts: sent };
}
