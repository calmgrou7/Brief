import { daysAgo, type ServiceDef } from './types';

const env = import.meta.env;

// 위들리의 실제 지표가 정해지면 demo의 KPI 이름을 그에 맞게 바꾼다.
export const widly: ServiceDef = {
  id: 'widly',
  name: '위들리',
  description: '위들리 운영',
  color: '#8a5a1c',
  appUrl: env.VITE_WIDLY_APP_URL,
  summaryUrl: env.VITE_WIDLY_SUMMARY_URL,
  summaryHeaders: env.VITE_WIDLY_SUMMARY_TOKEN ? { Authorization: `Bearer ${env.VITE_WIDLY_SUMMARY_TOKEN}` } : undefined,
  embedUrl: env.VITE_WIDLY_EMBED_URL,
  demo: (now) => ({
    updatedAt: now.toISOString(),
    kpis: [
      { label: '신규 문의', value: 3, unit: '건' },
      { label: '진행 중', value: 2, unit: '건' },
      { label: '후속 연락 필요', value: 1, unit: '건', tone: 'bad' },
      { label: '이번 달 매출', value: '80만', unit: '원', tone: 'good' },
    ],
    alerts: [{ level: 'bad', message: '동해기계 견적서 재발송이 12일째 미처리입니다' }],
    items: [
      { title: '신규 문의 접수', kind: '문의', client: '대양물산', status: 'open', at: daysAgo(now, 1, 11) },
      { title: '미팅 후속 자료 보내기', kind: '할 일', client: '그린테크', status: 'open', at: daysAgo(now, 3, 16) },
      { title: '1차 미팅', kind: '미팅', client: '그린테크', status: 'done', amount: 800_000, at: daysAgo(now, 3) },
      { title: '견적서 재발송', kind: '할 일', client: '동해기계', status: 'open', at: daysAgo(now, 12) },
    ],
  }),
};
