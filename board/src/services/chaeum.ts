import { daysAgo, type ServiceDef } from './types';

const env = import.meta.env;

export const chaeum: ServiceDef = {
  id: 'chaeum',
  name: '채움',
  description: '법인 컨설팅 · 가결산 진단',
  color: '#176b70',
  appUrl: env.VITE_CHAEUM_APP_URL,
  summaryUrl: env.VITE_CHAEUM_SUMMARY_URL,
  summaryHeaders: env.VITE_CHAEUM_SUMMARY_TOKEN ? { Authorization: `Bearer ${env.VITE_CHAEUM_SUMMARY_TOKEN}` } : undefined,
  embedUrl: env.VITE_CHAEUM_EMBED_URL,
  demo: (now) => ({
    updatedAt: now.toISOString(),
    kpis: [
      { label: '진행 중 법인', value: 4, unit: '곳' },
      { label: '이번 달 리포트', value: 7, unit: '건' },
      { label: '회신 대기', value: 1, unit: '건', tone: 'caution', hint: '회계사무실 요청서' },
      { label: '이번 달 자문료', value: '350만', unit: '원', tone: 'good' },
    ],
    alerts: [{ level: 'caution', message: '소망식품 회계사무실 요청서 회신이 8일째 없습니다' }],
    items: [
      { title: '대표용 가결산 리포트 발송', kind: '리포트', client: '(주)한빛정밀', status: 'done', at: daysAgo(now, 0, 15) },
      { title: '신규 법인 등록', kind: '고객', client: '(주)한빛정밀', status: 'done', at: daysAgo(now, 0, 9) },
      { title: '정책자금 대비 시나리오 상담', kind: '상담', client: '대양물산', status: 'open', amount: 1_500_000, at: daysAgo(now, 2) },
      { title: '승계 대비 주식평가 상담', kind: '상담', client: '동해기계', status: 'done', amount: 2_000_000, at: daysAgo(now, 6) },
      { title: '회계사무실 요청서 회신 확인', kind: '할 일', client: '소망식품', status: 'open', at: daysAgo(now, 8) },
    ],
  }),
};
