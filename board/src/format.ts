export function won(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1).replace(/\.0$/, '')}억원`;
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString('ko-KR')}만원`;
  return `${n.toLocaleString('ko-KR')}원`;
}

export function relDay(at: string, now: Date): string {
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  const d1 = new Date(at); d1.setHours(0, 0, 0, 0);
  const days = Math.round((d0.getTime() - d1.getTime()) / 86_400_000);
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  return `${d1.getMonth() + 1}/${d1.getDate()}`;
}

