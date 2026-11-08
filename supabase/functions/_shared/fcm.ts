// Firebase Cloud Messaging HTTP v1 — 서비스 계정으로 OAuth 토큰 발급 후 발송
export interface ServiceAccount { project_id: string; client_email: string; private_key: string }

export interface PushMessage {
  title: string;
  body: string;
  data: Record<string, string>;
  channel?: "calls" | "status";   // Android 알림 채널 (콜은 소리 크게)
}

export type PushResult = { token: string; ok: boolean; unregistered: boolean; error?: string };

export interface Push {
  sendMany(tokens: string[], msg: PushMessage): Promise<PushResult[]>;
}

function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const bin = atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function signServiceAccountJwt(sa: ServiceAccount, nowSec = Math.floor(Date.now() / 1000)) {
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: nowSec,
    exp: nowSec + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8", pemToDer(sa.private_key.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  return `${unsigned}.${b64url(sig)}`;
}

export function createFcm(sa: ServiceAccount, fetchFn: typeof fetch = fetch): Push {
  let cached: { token: string; exp: number } | null = null;

  async function accessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (cached && cached.exp - 60 > now) return cached.token;
    const res = await fetchFn("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: await signServiceAccountJwt(sa, now),
      }),
    });
    if (!res.ok) throw new Error(`FCM 인증 실패 ${res.status}: ${await res.text()}`);
    const body = await res.json();
    cached = { token: body.access_token, exp: now + (body.expires_in ?? 3600) };
    return cached.token;
  }

  async function sendOne(token: string, msg: PushMessage, bearer: string): Promise<PushResult> {
    const isCall = msg.channel === "calls";
    const res = await fetchFn(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: msg.title, body: msg.body },
          data: msg.data,
          android: { priority: "HIGH", notification: { channel_id: msg.channel ?? "status", sound: "default" } },
          apns: {
            headers: { "apns-priority": "10" },
            payload: { aps: { sound: "default", ...(isCall ? { "interruption-level": "time-sensitive" } : {}) } },
          },
        },
      }),
    });
    if (res.ok) return { token, ok: true, unregistered: false };
    const err = await res.json().catch(() => ({}));
    const code: string = err?.error?.details?.find((d: { errorCode?: string }) => d.errorCode)?.errorCode
      ?? err?.error?.status ?? `HTTP_${res.status}`;
    // 앱 삭제·토큰 만료 → DB에서 토큰 삭제 대상
    const unregistered = code === "UNREGISTERED" || (res.status === 400 && code === "INVALID_ARGUMENT");
    return { token, ok: false, unregistered, error: code };
  }

  return {
    async sendMany(tokens, msg) {
      if (tokens.length === 0) return [];
      const bearer = await accessToken();
      return await Promise.all(tokens.map((t) => sendOne(t, msg, bearer)));
    },
  };
}
