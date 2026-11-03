// 관리자 로그인 쿠키. 서명 = HMAC-SHA256(만료시각). 미들웨어(edge)와 서버 양쪽에서 쓰도록 Web Crypto만 사용.
export const COOKIE = 'chaeum_session';
export const MAX_AGE = 60 * 60 * 24 * 30; // 30일

const DEV_SECRET = 'dev-only-secret-change-me-0000000000';

export function secret(): string | null {
  const s = process.env.SESSION_SECRET?.trim();
  if (s && s.length >= 32) return s;
  return process.env.NODE_ENV === 'production' ? null : DEV_SECRET;
}

/** 배포 환경에서는 반드시 ADMIN_PASSWORD를 설정해야 로그인할 수 있다 */
export function adminPassword(): string | null {
  const p = process.env.ADMIN_PASSWORD?.trim();
  if (p) return p;
  return process.env.NODE_ENV === 'production' ? null : 'chaeum';
}

async function hmac(key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sign(now = Date.now()): Promise<string | null> {
  const s = secret();
  if (!s) return null;
  const exp = String(Math.floor(now / 1000) + MAX_AGE);
  return `${exp}.${await hmac(s, exp)}`;
}

export async function verify(token: string | undefined, now = Date.now()): Promise<boolean> {
  const s = secret();
  if (!s || !token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) * 1000 < now) return false;
  return safeEqual(sig, await hmac(s, exp));
}

export async function passwordMatches(input: string): Promise<boolean> {
  const p = adminPassword();
  if (!p) return false;
  // 길이 차이로 정보가 새지 않도록 해시끼리 비교
  const s = secret() ?? DEV_SECRET;
  return safeEqual(await hmac(s, input), await hmac(s, p));
}
