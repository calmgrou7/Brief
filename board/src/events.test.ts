import { describe, expect, it } from 'vitest';
import { mergeEvents, openItems, sharedClients, summarizeApp, weekStart, type OpsEvent } from './events';

const now = new Date('2026-10-29T12:00:00'); // 목요일

function ev(p: Partial<OpsEvent> & Pick<OpsEvent, 'id' | 'app' | 'at'>): OpsEvent {
  return { kind: 'consult', title: p.id, status: 'done', ...p };
}

describe('weekStart', () => {
  it('월요일 0시로 맞춘다', () => {
    expect(weekStart(now).toISOString()).toBe(new Date('2026-10-26T00:00:00').toISOString());
    expect(weekStart(new Date('2026-11-01T09:00:00')).getDate()).toBe(26); // 일요일
  });
});

describe('summarizeApp', () => {
  const events = [
    ev({ id: 'a', app: 'chaeum', at: '2026-10-28T10:00:00', client: '(주)한빛정밀', amount: 1_000_000 }),
    ev({ id: 'b', app: 'chaeum', at: '2026-10-21T10:00:00', client: '한빛 정밀', status: 'open' }),
    ev({ id: 'c', app: 'chaeum', at: '2026-09-30T10:00:00', amount: 5_000_000 }),
    ev({ id: 'd', app: 'widly', at: '2026-10-29T09:00:00' }),
  ];
  const s = summarizeApp(events, 'chaeum', now);

  it('이번 주와 지난주를 나눠 센다', () => {
    expect(s.thisWeek).toBe(1);
    expect(s.lastWeek).toBe(1);
  });
  it('열린 건 중 7일 넘은 것을 밀림으로 센다', () => {
    expect(s.open).toBe(1);
    expect(s.stale).toBe(1);
  });
  it('표기가 달라도 같은 고객은 하나로 센다', () => {
    expect(s.clients).toBe(1);
  });
  it('이번 달 금액만 더한다', () => {
    expect(s.amountThisMonth).toBe(1_000_000);
  });
  it('최근 활동은 최신순', () => {
    expect(s.lastActivity).toBe('2026-10-28T10:00:00');
    expect(s.recent.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('sharedClients', () => {
  it('두 앱에 모두 나온 고객만 고른다', () => {
    const list = sharedClients([
      ev({ id: '1', app: 'chaeum', at: '2026-10-01T00:00:00', client: '㈜대양물산' }),
      ev({ id: '2', app: 'widly', at: '2026-10-20T00:00:00', client: '대양물산' }),
      ev({ id: '3', app: 'chaeum', at: '2026-10-02T00:00:00', client: '소망식품' }),
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].apps.sort()).toEqual(['chaeum', 'widly']);
    expect(list[0].lastAt).toBe('2026-10-20T00:00:00');
  });
});

describe('openItems / mergeEvents', () => {
  it('열린 항목을 오래된 순으로', () => {
    const items = openItems([
      ev({ id: 'x', app: 'chaeum', at: '2026-10-20T00:00:00', status: 'open' }),
      ev({ id: 'y', app: 'chaeum', at: '2026-10-10T00:00:00', status: 'open' }),
      ev({ id: 'z', app: 'chaeum', at: '2026-10-01T00:00:00' }),
    ]);
    expect(items.map((e) => e.id)).toEqual(['y', 'x']);
  });
  it('같은 id는 뒤의 값으로 덮는다', () => {
    const merged = mergeEvents([ev({ id: 'k', app: 'chaeum', at: '2026-10-01T00:00:00', status: 'open' })], [ev({ id: 'k', app: 'chaeum', at: '2026-10-01T00:00:00', status: 'done' })]);
    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe('done');
  });
});
