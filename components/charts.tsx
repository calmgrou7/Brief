"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { shortDate, won, wonShort } from "./format";

// 광고비와 CPA는 단위가 달라 한 차트에 두 축으로 겹치지 않고, 같은 날짜축의 두 차트로 나눈다.

export interface DayPoint {
  date: string;
  spend: number;
  cpa: number | null;
}

const axisTick = { fill: "var(--muted)", fontSize: 11 };

function Tip({ active, payload, label, name }: { active?: boolean; payload?: readonly { value?: unknown }[]; label?: string; name: string }) {
  if (!active || !payload?.length) return null;
  const v = typeof payload[0].value === "number" ? payload[0].value : null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-sm">
      <div className="text-muted">{label}</div>
      <div className="tabular mt-0.5 font-semibold text-ink">
        {name} {v == null ? "전환 없음" : won(v)}
      </div>
    </div>
  );
}

export function SpendChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={axisTick} axisLine={{ stroke: "var(--axis)" }} tickLine={false} minTickGap={24} />
        <YAxis tickFormatter={(v: number) => wonShort(v)} tick={axisTick} axisLine={false} tickLine={false} width={56} />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={({ active, payload, label }) => (
            <Tip active={active} payload={payload} label={label ? shortDate(String(label)) : ""} name="광고비" />
          )}
        />
        <Bar dataKey="spend" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CpaChart({ data, target, label }: { data: DayPoint[]; target: number; label: string }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={axisTick} axisLine={{ stroke: "var(--axis)" }} tickLine={false} minTickGap={24} />
        <YAxis tickFormatter={(v: number) => wonShort(v)} tick={axisTick} axisLine={false} tickLine={false} width={56} />
        <ReferenceLine
          y={target}
          stroke="var(--ink-2)"
          strokeWidth={1}
          label={{ value: `목표 ${wonShort(target)}`, position: "insideTopRight", fill: "var(--ink-2)", fontSize: 11 }}
        />
        <Tooltip
          cursor={{ stroke: "var(--axis)" }}
          content={({ active, payload, label: l }) => (
            <Tip active={active} payload={payload} label={l ? shortDate(String(l)) : ""} name={label} />
          )}
        />
        <Line
          dataKey="cpa"
          stroke="var(--series-1)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
