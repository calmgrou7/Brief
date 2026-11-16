/** 리드 접수 → 외부 자동화(Zapier/Make/n8n) 웹훅. 실패해도 접수는 막지 않습니다. */
import "server-only";

export async function notifyLead(payload: Record<string, unknown>) {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error("[notify] webhook failed", e);
  }
}
