// 결정 카드의 근거 추이용 미니 선 그래프. 값이 없는 날(전환 0건 등)은 선을 끊는다.

export function Sparkline({ values, target, width = 132, height = 36 }: { values: (number | null)[]; target?: number; width?: number; height?: number }) {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length < 2) return <div style={{ width, height }} className="text-[11px] text-muted">데이터 부족</div>;

  const pad = 3;
  const lo = Math.min(...nums, target ?? Infinity);
  const hi = Math.max(...nums, target ?? -Infinity);
  const span = hi - lo || 1;
  const x = (i: number) => pad + (i * (width - pad * 2)) / (values.length - 1);
  const y = (v: number) => height - pad - ((v - lo) / span) * (height - pad * 2);

  const segments: string[] = [];
  let current = "";
  values.forEach((v, i) => {
    if (v == null) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    current += `${current ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  });
  if (current) segments.push(current);

  const lastIdx = values.findLastIndex((v) => v != null);
  const last = values[lastIdx];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="최근 14일 추이" className="overflow-visible">
      {target != null && <line x1={pad} x2={width - pad} y1={y(target)} y2={y(target)} stroke="var(--axis)" strokeWidth={1} />}
      {segments.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {last != null && <circle cx={x(lastIdx)} cy={y(last)} r={3} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />}
    </svg>
  );
}
