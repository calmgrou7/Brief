import type { ServiceSummary } from '../contract';

export interface ServiceDef {
  id: string;
  name: string;
  description: string;
  color: string;
  /** 그 서비스 자체 대시보드 주소('열기' 버튼). */
  appUrl?: string;
  /** 요약 JSON 주소. 없으면 예시 데이터로 자리만 보여준다. */
  summaryUrl?: string;
  /** 요약 주소가 요구하는 헤더(예: 읽기 전용 토큰). */
  summaryHeaders?: Record<string, string>;
  /** 상세 탭에 그 서비스 대시보드를 그대로 띄울 주소(선택). */
  embedUrl?: string;
  /** 연결 전 레이아웃 확인용 예시. */
  demo: (now: Date) => ServiceSummary;
}

export function daysAgo(now: Date, days: number, hour = 10): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
