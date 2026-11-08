// PortOne V2 웹훅 = Standard Webhooks 규격 서명 검증
// 서명 대상: `${webhook-id}.${webhook-timestamp}.${body}`, 키 = base64decode(secret 에서 "whsec_" 제거)
const TOLERANCE_SEC = 5 * 60;

function b64decode(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export async function signStandardWebhook(secret: string, id: string, timestamp: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw", b64decode(secret.replace(/^whsec_/, "")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return "v1," + b64encode(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`)));
}

export async function verifyStandardWebhook(
  secret: string, headers: Headers, body: string, nowSec = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const id = headers.get("webhook-id"), ts = headers.get("webhook-timestamp"), sigs = headers.get("webhook-signature");
  if (!id || !ts || !sigs) return false;
  if (Math.abs(nowSec - Number(ts)) > TOLERANCE_SEC) return false;   // 재전송(replay) 공격 방지
  const expected = await signStandardWebhook(secret, id, ts, body);
  return sigs.split(" ").some((s) => s === expected);
}
