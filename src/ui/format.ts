/** 원 → 백만원(정수, 천 단위 콤마) */
export const mil = (won: number) => Math.round(won / 1e6).toLocaleString('ko-KR');
export const won = (v: number) => Math.round(v).toLocaleString('ko-KR');
export const parseWon = (s: string) => {
  const neg = /^\s*[-(△▲]/.test(s);
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? (neg ? -n : n) : 0;
};
