/** 리드 접수 → 외부 자동화(Zapier/Make/n8n) 웹훅. 실패해도 접수는 막지 않습니다. */
import "server-only";

export async function notifyLead(payload: Record<string, unknown>) {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 받는 쪽(Apps Script 등)에서 위조 요청을 거르기 위한 공유 비밀값
      body: JSON.stringify({ ...payload, secret: process.env.LEAD_WEBHOOK_SECRET || "" }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error("[notify] webhook failed", e);
  }
}
