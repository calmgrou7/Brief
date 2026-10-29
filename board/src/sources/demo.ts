// 아무 데이터도 연결되지 않았을 때 보드 모양을 보여주는 예시. 화면에 '예시 데이터'로 표시된다.
import type { OpsEvent } from '../events';

export function demoEvents(now: Date): OpsEvent[] {
  const ago = (days: number, hour = 10) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const rows: Omit<OpsEvent, 'id'>[] = [
    { app: 'chaeum', kind: 'client', title: '신규 법인 등록', client: '(주)한빛정밀', status: 'done', at: ago(0, 9) },
    { app: 'chaeum', kind: 'report', title: '대표용 가결산 리포트 발송', client: '(주)한빛정밀', status: 'done', at: ago(0, 15) },
    { app: 'chaeum', kind: 'consult', title: '정책자금 대비 시나리오 상담', client: '대양물산', status: 'open', amount: 1_500_000, at: ago(2) },
    { app: 'chaeum', kind: 'task', title: '회계사무실 요청서 회신 확인', client: '소망식품', status: 'open', at: ago(9) },
    { app: 'chaeum', kind: 'consult', title: '승계 대비 주식평가 상담', client: '동해기계', status: 'done', amount: 2_000_000, at: ago(6) },
    { app: 'chaeum', kind: 'report', title: '상담노트 정리', client: '동해기계', status: 'done', at: ago(8) },
    { app: 'widly', kind: 'client', title: '신규 문의 접수', client: '대양물산', status: 'open', at: ago(1, 11) },
    { app: 'widly', kind: 'consult', title: '1차 미팅', client: '그린테크', status: 'done', amount: 800_000, at: ago(3) },
    { app: 'widly', kind: 'task', title: '미팅 후속 자료 보내기', client: '그린테크', status: 'open', at: ago(3, 16) },
    { app: 'widly', kind: 'note', title: '주간 운영 점검', status: 'done', at: ago(7) },
    { app: 'widly', kind: 'task', title: '견적서 재발송', client: '동해기계', status: 'open', at: ago(12) },
  ];
  return rows.map((r, i) => ({ id: `demo-${i}`, ...r }));
}
