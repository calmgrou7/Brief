import { presetRange, previousRange } from "./dates";
import { dailySeries, deriveKpis, funnel, inRange, sumMetrics } from "./kpi";
import { adPerformance, type ClientInput } from "./summary";
import type { RangePreset } from "./types";

// 한 고객의 기간별 성과 묶음. 운영자 고객 페이지와 고객 공유 리포트가 같은 계산을 쓴다.

export type PerformanceView = ReturnType<typeof performanceView>;

export function performanceView(data: ClientInput, preset: RangePreset) {
  const { client, rows, anchor } = data;
  const range = presetRange(preset, anchor);
  const prev = previousRange(range);
  const metrics = sumMetrics(inRange(rows, range));
  const isPurchase = client.objective === "purchase";
  return {
    client,
    preset,
    range,
    prev,
    k: deriveKpis(metrics, client.objective),
    p: deriveKpis(sumMetrics(inRange(rows, prev)), client.objective),
    stages: funnel(metrics, client.objective),
    series: dailySeries(rows, range, client.objective).map((d) => ({ date: d.date, spend: d.spend, cpa: d.cpa })),
    ads: adPerformance(data, range),
    isPurchase,
    unit: isPurchase ? "CPA" : "CPL",
    convLabel: isPurchase ? "구매" : "리드",
  };
}

