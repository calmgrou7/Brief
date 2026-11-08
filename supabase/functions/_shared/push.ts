import type { Db } from "./types.ts";
import type { Push, PushMessage } from "./fcm.ts";

/** 사용자 목록에게 푸시 + 죽은 토큰 자동 정리. 반환: 실제 성공 발송 수 */
export async function pushToUsers(db: Db, push: Push, userIds: string[], msg: PushMessage): Promise<number> {
  if (userIds.length === 0) return 0;
  const tokens = await db.getTokens(userIds);
  const results = await push.sendMany(tokens.map((t) => t.token), msg);
  const dead = results.filter((r) => r.unregistered).map((r) => r.token);
  if (dead.length) await db.deleteTokens(dead);
  for (const r of results) if (!r.ok && !r.unregistered) console.warn("push failed", r.error);
  return results.filter((r) => r.ok).length;
}
