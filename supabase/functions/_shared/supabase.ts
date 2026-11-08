import { createClient, type User } from 'npm:@supabase/supabase-js@2';

export const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

/** 요청의 Authorization: Bearer <JWT> 로 로그인 사용자 확인 */
export async function getUser(req: Request): Promise<User | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** 한국 시간 기준 'YYYY-MM' */
export function kstMonth(d = new Date()) {
  return new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 7);
}
