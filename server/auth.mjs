import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";

const SALT = randomBytes(16); // 프로세스별 임의 salt: 비교 시 길이·내용 노출 방지용

export function passwordMatcher(password) {
  if (!password || password.length < 12)
    throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  const expected = scryptSync(password, SALT, 32);
  return (candidate) =>
    typeof candidate === "string" &&
    candidate.length <= 256 &&
    timingSafeEqual(scryptSync(candidate, SALT, 32), expected);
}

export const newToken = () => randomBytes(32).toString("base64url");
/** DB에는 토큰 원문이 아닌 해시만 저장 */
export const tokenId = (token) =>
  createHash("sha256").update(String(token)).digest("hex");

export function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0)
      out[part.slice(0, i).trim()] = decodeURIComponent(
        part.slice(i + 1).trim(),
      );
  }
  return out;
}

/** 로그인 시도 제한: IP당 10분에 5회 실패 시 잠금 */
export class LoginLimiter {
  constructor({ max = 5, windowMs = 10 * 60e3 } = {}) {
    this.max = max;
    this.windowMs = windowMs;
    this.fails = new Map();
  }
  blocked(key) {
    const f = this.fails.get(key);
    if (!f) return false;
    if (Date.now() - f.first > this.windowMs) {
      this.fails.delete(key);
      return false;
    }
    return f.count >= this.max;
  }
  fail(key) {
    const f = this.fails.get(key);
    if (!f || Date.now() - f.first > this.windowMs)
      this.fails.set(key, { first: Date.now(), count: 1 });
    else f.count++;
  }
  reset(key) {
    this.fails.delete(key);
  }
}
