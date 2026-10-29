// 새 서비스 붙이는 법
// 1. 이 파일을 복사해 <서비스id>.ts로 저장하고 아래 값을 채운다.
// 2. services/index.ts의 SERVICES 배열에 한 줄 추가한다.
// 3. .env에 VITE_<ID>_APP_URL / VITE_<ID>_SUMMARY_URL (+ 필요하면 TOKEN, EMBED_URL)을 넣는다.
//    vite-env.d.ts에도 같은 이름을 추가하면 자동완성이 된다.
import { daysAgo, type ServiceDef } from './types';

const env = import.meta.env;

export const template: ServiceDef = {
  id: 'new-service',
  name: '새 서비스',
  description: '한 줄 설명',
  color: '#4b5d8a',
  appUrl: env.VITE_NEW_SERVICE_APP_URL,
  summaryUrl: env.VITE_NEW_SERVICE_SUMMARY_URL,
  demo: (now) => ({
    updatedAt: now.toISOString(),
    kpis: [{ label: '핵심 지표', value: 0, unit: '건' }],
    alerts: [],
    items: [{ title: '예시 활동', status: 'done', at: daysAgo(now, 0) }],
  }),
};
