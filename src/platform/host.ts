/**
 * 호스트 어댑터 (기획서 5.1): 토스 앱 WebView ↔ 일반 모바일 웹 베타.
 * 화면 코드는 SDK를 직접 부르지 않고 이 모듈만 사용한다.
 */
import { Analytics, Storage } from "@apps-in-toss/web-framework";

declare global {
  interface Window {
    ReactNativeWebView?: unknown;
  }
}

/** 토스 앱 안에서 실행 중인지. 개발 중에는 devtools가 SDK를 mock 하므로 SDK 경로도 동작한다. */
export const isTossHost = (): boolean =>
  typeof window !== "undefined" && (window.ReactNativeWebView !== undefined || import.meta.env.DEV);

export const storage = {
  async get(key: string): Promise<string | null> {
    if (isTossHost()) {
      try {
        return await Storage.getItem(key);
      } catch {
        /* 브라우저 저장소로 대체 */
      }
    }
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    if (isTossHost()) {
      try {
        return await Storage.setItem(key, value);
      } catch {
        /* 브라우저 저장소로 대체 */
      }
    }
    localStorage.setItem(key, value); // 실패 시 예외 → 화면에서 저장 실패 안내
  },
  async remove(key: string): Promise<void> {
    if (isTossHost()) {
      try {
        return await Storage.removeItem(key);
      } catch {
        /* 브라우저 저장소로 대체 */
      }
    }
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },
};

/** 기획서 8.3 퍼널 이벤트. 정확한 주소·메모는 절대 넣지 않는다. */
export type FunnelEvent =
  | "analysis_started"
  | "metrics_viewed"
  | "comparison_viewed"
  | "evidence_opened"
  | "checklist_saved"
  | "feedback_submitted";

export function track(event: FunnelEvent, params: Record<string, string | number | boolean> = {}): void {
  if (!isTossHost()) return;
  Analytics.log({ log_name: event, log_type: "event", params }).catch(() => {});
}
