export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

/** 업무상 예상된 오류 (사용자에게 그대로 보여줘도 되는 메시지) */
export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

export function handleError(e: unknown): Response {
  if (e instanceof AppError) return json({ ok: false, code: e.code, message: e.message }, e.status);
  console.error(e);
  return json({ ok: false, code: "INTERNAL", message: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." }, 500);
}

export function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

/** pg_cron / DB 웹훅 호출 검증 (공유 비밀 헤더) */
export function requireSecretHeader(req: Request, header: string, expected: string | undefined) {
  const got = req.headers.get(header);
  if (!expected) throw new AppError("MISCONFIGURED", `${header} 비밀값이 설정되지 않았습니다`, 500);
  if (!got || !timingSafeEqual(got, expected)) throw new AppError("UNAUTHORIZED", "인증 실패", 401);
}

export function bearer(req: Request): string | null {
  const h = req.headers.get("Authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new AppError("MISCONFIGURED", `환경변수 ${name} 가 없습니다`, 500);
  return v;
}
