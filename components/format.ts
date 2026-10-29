// 숫자 표기. 원화는 화면 공간에 따라 전체 표기(won)와 만/억 단위 축약(wonShort)을 나눠 쓴다.

export function won(n: number | null): string {
  return n == null ? "–" : `${Math.round(n).toLocaleString("ko-KR")}원`;
}

export function wonShort(n: number | null): string {
  if (n == null) return "–";
  const abs = Math.abs(n);
  if (abs >= 1e8) return `${trim(n / 1e8, 2)}억원`;
  if (abs >= 1e4) return `${trim(n / 1e4, abs >= 1e6 ? 0 : 1)}만원`;
  return won(n);
}

function trim(v: number, digits: number): string {
  return Number(v.toFixed(digits)).toLocaleString("ko-KR");
}

export function count(n: number | null): string {
  return n == null ? "–" : Math.round(n).toLocaleString("ko-KR");
}

export function percent(n: number | null, digits = 1): string {
  return n == null ? "–" : `${(n * 100).toFixed(digits)}%`;
}

export function multiple(n: number | null): string {
  return n == null ? "–" : `${n.toFixed(2)}배`;
}

export function shortDate(s: string): string {
  return `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;
}
