import { describe, expect, it } from 'vitest';
import { parseSummary, type ServiceSummary } from './contract';
import { combinedAlerts, combinedItems, countOpen, sharedClients, type LoadState } from './overview';

const now = new Date('2026-10-29T12:00:00Z');
const sum = (p: Partial<ServiceSummary>): ServiceSummary => ({ updatedAt: '2026-10-29T11:00:00Z', kpis: [], alerts: [], items: [], ...p });

describe('parseSummary', () => {
  it('잘못된 항목만 버리고 나머지는 살린다', () => {
    const s = parseSummary({
      updatedAt: '2026-10-29T10:00:00Z',
      kpis: [{ label: '진행 중', value: 3, tone: 'weird' }, { value: 1 }],
      alerts: [{ level: 'bad', message: '마감 임박' }, { level: 'x', message: '참고' }, {}],
      items: [{ title: '상담', at: '2026-10-28T10:00:00Z', status: 'open', amount: 'abc' }, { title: '날짜 없음' }],
    });
    expect(s.kpis).toEqual([{ label: '진행 중', value: 3, unit: undefined, tone: undefined, hint: undefined }]);
    expect(s.alerts.map((a) => a.level)).toEqual(['bad', 'info']);
    expect(s.items).toHaveLength(1);
    expect(s.items[0].amount).toBeUndefined();
  });
  it('kpis가 없으면 요약으로 보지 않는다', () => {
    expect(() => parseSummary({ items: [] })).toThrow();
    expect(() => parseSummary('hello')).toThrow();
  });
});

describe('종합 계산', () => {
  const states: Record<string, LoadState> = {
    a: { status: 'ok', summary: sum({ alerts: [{ level: 'info', message: 'i' }], items: [{ title: 'x', at: '2026-10-28T00:00:00Z', status: 'open', client: '(주)대양물산' }] }) },
    b: { status: 'ok', summary: sum({ updatedAt: '2026-10-27T00:00:00Z', items: [{ title: 'y', at: '2026-10-29T00:00:00Z', client: '대양 물산' }] }) },
    c: { status: 'error', error: '404' },
    d: { status: 'none' },
  };

  it('알림은 심각한 순, 연결 실패와 갱신 멈춤도 알린다', () => {
    const list = combinedAlerts(states, now);
    expect(list.map((t) => [t.service, t.value.level])).toEqual([['c', 'bad'], ['b', 'caution'], ['a', 'info']]);
  });
  it('최근 활동은 서비스를 섞어 최신순', () => {
    expect(combinedItems(states).map((t) => t.service)).toEqual(['b', 'a']);
    expect(countOpen(states)).toBe(1);
  });
  it('표기가 달라도 같은 고객으로 묶는다', () => {
    const shared = sharedClients(states);
    expect(shared).toHaveLength(1);
    expect(shared[0].services.sort()).toEqual(['a', 'b']);
  });
  it('예시 데이터는 갱신 멈춤 알림을 내지 않는다', () => {
    const list = combinedAlerts({ z: { status: 'demo', summary: sum({ updatedAt: '2020-01-01T00:00:00Z' }) } }, now);
    expect(list).toEqual([]);
  });
});
