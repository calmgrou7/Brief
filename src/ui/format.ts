/** 원 → 백만원(정수, 천 단위 콤마) */
export const mil = (won: number) => Math.round(won / 1e6).toLocaleString('ko-KR');
export const won = (v: number) => Math.round(v).toLocaleString('ko-KR');
export const parseWon = (s: string) => {
  const neg = /^\s*[-(△▲]/.test(s);
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? (neg ? -n : n) : 0;
};

/** 원 → "12억 3,400만원" 형태(만원 미만 버림). 큰 금액을 소리 내어 읽듯 확인하는 용도 */
export function koreanAmount(v: number): string {
  const sign = v < 0 ? '−' : '';
  const man = Math.floor(Math.abs(v) / 10_000);
  if (man === 0) return `${sign}${won(Math.abs(v))}원`;
  const eok = Math.floor(man / 10_000);
  const rest = man % 10_000;
  const parts = [];
  if (eok) parts.push(`${eok.toLocaleString('ko-KR')}억`);
  if (rest) parts.push(`${rest.toLocaleString('ko-KR')}만`);
  return `${sign}${parts.join(' ')}원`;
}
