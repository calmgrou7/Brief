import { createSupabaseDb } from "./db.ts";
import { createPortOne } from "./portone.ts";
import { createFcm, type ServiceAccount } from "./fcm.ts";
import { env } from "./http.ts";

// 함수 인스턴스가 살아있는 동안 재사용 (FCM 토큰 캐시 유지)
let cache: ReturnType<typeof build> | null = null;
function build() {
  return {
    db: createSupabaseDb(),
    portone: createPortOne(env("PORTONE_API_SECRET")),
    push: createFcm(JSON.parse(env("FCM_SERVICE_ACCOUNT")) as ServiceAccount),
  };
}
export const deps = () => (cache ??= build());
