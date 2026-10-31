// 계정 보관함 암호화: 브라우저에서만 복호화. 서버에는 암호문(VaultBlob)만 전송.
import type { Account, VaultBlob } from "../shared/model.ts";

const ITER = 310000;
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export interface VaultSession {
  key: CryptoKey;
  salt: Uint8Array;
  iter: number;
}
async function derive(pw: string, salt: Uint8Array, iter: number) {
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(pw),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: iter,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function createSession(pw: string): Promise<VaultSession> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { key: await derive(pw, salt, ITER), salt, iter: ITER };
}
export async function seal(
  s: VaultSession,
  items: Account[],
): Promise<VaultBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    s.key,
    enc.encode(JSON.stringify(items)),
  );
  return {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iter: s.iter,
    salt: b64(s.salt),
    iv: b64(iv),
    ct: b64(ct),
  };
}
/** 비밀번호가 틀리면 예외 발생 */
export async function open(
  blob: VaultBlob,
  pw: string,
): Promise<{ session: VaultSession; items: Account[] }> {
  const salt = unb64(blob.salt);
  const key = await derive(pw, salt, blob.iter);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(blob.iv) as BufferSource },
    key,
    unb64(blob.ct) as BufferSource,
  );
  return {
    session: { key, salt, iter: blob.iter },
    items: JSON.parse(dec.decode(pt)),
  };
}
export function strongPassword(len = 18) {
  const cs =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  return Array.from(
    crypto.getRandomValues(new Uint32Array(len)),
    (x) => cs[x % cs.length],
  ).join("");
}
