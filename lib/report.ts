import { multiple, percent, won, wonShort } from "@/components/format";
import { delta } from "./kpi";
import type { PerformanceView } from "./performance";

// 고객 공유 리포트 맨 위의 요약 문장. 마케팅 용어를 모르는 사장님도 읽을 수 있는 말로 쓴다.
// 수수료·마진·내부 판정은 넣지 않는다.

export interface ReportSummary {
  headline: string;
  points: string[];
}

export function reportSummary(v: PerformanceView): ReportSummary {
  const { k, p, client } = v;
  const conv = v.isPurchase ? "구매" : "신청";

  const headline =
    k.conversions === 0
      ? `광고비 ${wonShort(k.spend)}을 집행했고, 아직 ${conv}는 없습니다.`
      : v.isPurchase
        ? `광고비 ${wonShort(k.spend)}으로 구매 ${k.conversions.toLocaleString("ko-KR")}건, 매출 ${wonShort(k.revenue)}을 만들었습니다.`
        : `광고비 ${wonShort(k.spend)}으로 ${conv} ${k.conversions.toLocaleString("ko-KR")}건을 받았습니다.`;

  const points: string[] = [];

  const dc = delta(k.conversions, p.conversions);
  if (dc != null && Math.abs(dc) >= 0.005) {
    points.push(`${conv} 수가 직전 같은 기간보다 ${percent(Math.abs(dc), 0)} ${dc > 0 ? "늘었습니다" : "줄었습니다"}.`);
  }

  if (k.cpa != null) {
    const ratio = k.cpa / client.targetCpa;
    points.push(
      ratio <= 1
        ? `${conv} 1건을 얻는 데 ${won(k.cpa)}이 들어 목표(${won(client.targetCpa)}) 안에 있습니다.`
        : `${conv} 1건을 얻는 데 ${won(k.cpa)}이 들어 목표(${won(client.targetCpa)})보다 ${percent(ratio - 1, 0)} 높습니다. 효율이 낮은 광고를 정리하고 있습니다.`,
    );
  }

  if (v.isPurchase && k.roas != null) {
    points.push(`광고비 1원당 매출 ${k.roas.toFixed(2)}원 (ROAS ${multiple(k.roas)})${client.targetRoas ? `, 목표는 ${multiple(client.targetRoas)}입니다` : ""}.`);
  }

  // 전환 3건 이상인 광고 중 1건당 비용이 가장 낮은 것
  const best = v.ads.filter((a) => a.kpis.conversions >= 3 && a.kpis.cpa != null).sort((a, b) => (a.kpis.cpa ?? 0) - (b.kpis.cpa ?? 0))[0];
  if (best?.kpis.cpa != null) {
    points.push(`가장 효율이 좋은 광고는 ‘${best.name}’입니다 (${conv} 1건당 ${won(best.kpis.cpa)}).`);
  }

  return { headline, points };
}
