import { describe, expect, it } from 'vitest';
import { demoDataset } from './demo';
import {
  companyRows, filterRows, homeStats, insuranceDue, isNewerContact, lastTouch, normalizeBizNo,
  nowKST, relDay, todayKST, todos, won,
} from './derive';

const TODAY = '2026-10-30';

describe('날짜', () => {
  it('한국 시간 기준으로 오늘을 계산한다', () => {
    // UTC 10/30 16:00 = KST 10/31 01:00
    expect(todayKST(new Date('2026-10-30T16:00:00Z'))).toBe('2026-10-31');
    expect(nowKST(new Date('2026-10-30T16:05:00Z'))).toBe('2026-10-31T01:05');
  });
  it('상대 날짜 표기', () => {
    expect(relDay('2026-10-30T09:00:00+09:00', TODAY)).toBe('오늘');
    expect(relDay('2026-10-27', TODAY)).toBe('3일 전');
    expect(relDay('2026-11-02', TODAY)).toBe('3일 후');
  });
  it('같은 날 접촉도 최신으로 본다', () => {
    expect(isNewerContact('2026-10-30', '2026-10-30')).toBe(true);
    expect(isNewerContact('2026-10-29', '2026-10-30')).toBe(false);
    expect(isNewerContact('2026-10-01', '')).toBe(true);
  });
});

describe('사업자등록번호', () => {
  it('숫자 10자리를 000-00-00000으로 맞춘다', () => {
    expect(normalizeBizNo('1234567890')).toBe('123-45-67890');
    expect(normalizeBizNo('123 45 67890')).toBe('123-45-67890');
    expect(normalizeBizNo('12345')).toBeNull();
    expect(normalizeBizNo('')).toBe('');
  });
});

describe('업체 집계', () => {
  const data = demoDataset(TODAY);

  it('접촉이력이 마스터보다 최신이면 이력을 쓴다', () => {
    const e = data.companies.find((c) => c.name.includes('대한물류'))!;
    // 마스터는 20일 전 방문, 이력에 6일 전 전화가 있다
    expect(lastTouch(e, data.contacts)).toMatchObject({ method: '전화' });
  });

  it('진행 중인 업체만 30일 미접촉 경고', () => {
    const rows = companyRows(data, TODAY);
    const stale = rows.filter((r) => r.stale).map((r) => r.name);
    expect(stale).toEqual(['[예시] 그린에너지솔루션(주)']); // 41일 전 문자, 상담중
    // 잠재 업체는 접촉 기록이 없어도 경고하지 않는다
    expect(rows.find((r) => r.name.includes('온새미로'))!.stale).toBe(false);
  });

  it('할 일: 7일 이내 다음 액션과 미완료 후속조치, 날짜순', () => {
    const t = todos(data, TODAY);
    expect(t.map((x) => x.date)).toEqual([...t.map((x) => x.date)].sort());
    expect(t.filter((x) => x.overdue).length).toBe(2); // 해솔푸드 다음 액션(어제) + 후속조치(2일 전)
    expect(t.some((x) => x.kind === '후속조치' && x.companyName.includes('채움정밀'))).toBe(true);
  });

  it('완료한 후속조치는 할 일에서 빠진다', () => {
    const d2 = demoDataset(TODAY);
    d2.contacts.forEach((k) => (k.followUpDone = true));
    expect(todos(d2, TODAY).every((x) => x.kind === '다음 액션')).toBe(true);
  });

  it('홈 KPI', () => {
    expect(homeStats(data, TODAY)).toEqual({ managed: 5, inProgress: 2, contactsThisMonth: expect.any(Number), stale: 1, insuranceDue: 2 });
    expect(insuranceDue(data, TODAY).map((i) => i.product)).toEqual(['CEO 정기보험', '공장 화재보험']);
  });

  it('검색: 이름·대표자, 숫자는 전화·사업자번호', () => {
    const rows = companyRows(data, TODAY);
    const f = { q: '', status: '', priority: '', task: '', staleOnly: false };
    expect(filterRows(rows, { ...f, q: '박대표' })).toHaveLength(1);
    expect(filterRows(rows, { ...f, q: '010-4567-8901' })[0].name).toContain('대한물류');
    expect(filterRows(rows, { ...f, q: '234-56-78901' })[0].name).toContain('해솔푸드');
    expect(filterRows(rows, { ...f, task: '기업보험' })).toHaveLength(2);
  });
});

describe('금액 표기', () => {
  it('억·만 단위', () => {
    expect(won(8_600_000_000)).toBe('86억원');
    expect(won(150_000_000)).toBe('1.5억원');
    expect(won(4_560_000)).toBe('456만원');
    expect(won(null)).toBe('—');
  });
});

import { calendarEvents, dueText, filterTasks, monthGrid, shiftMonth, stageIndex, tasks, weekday, yoy } from './derive';

describe('할 일', () => {
  const data = demoDataset(TODAY);
  const list = tasks(data, TODAY);

  it('지난 일 → 오늘 → 연락 필요 → 보험 만기 → 예정 순', () => {
    const order = ['over', 'today', 'stale', 'ins', 'soon'];
    const ranks = list.map((t) => order.indexOf(t.kind));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });
  it('네 종류의 출처를 모두 모은다', () => {
    expect(new Set(list.map((t) => t.source))).toEqual(new Set(['다음 액션', '후속조치', '연락 필요', '보험 만기']));
  });
  it('완료한 후속조치·종료 업체는 빠진다', () => {
    const d2 = demoDataset(TODAY);
    d2.contacts.forEach((k) => (k.followUpDone = true));
    d2.companies.find((c) => c.name.includes('해솔'))!.status = '종료';
    const l2 = tasks(d2, TODAY);
    expect(l2.some((t) => t.source === '후속조치')).toBe(false);
    expect(l2.some((t) => t.companyName.includes('해솔'))).toBe(false);
  });
  it('필터: 지금 = 지난 일 + 오늘', () => {
    expect(filterTasks(list, 'now').every((t) => t.kind === 'over' || t.kind === 'today')).toBe(true);
    expect(filterTasks(list, 'all')).toHaveLength(list.length);
  });
  it('기한 표기', () => {
    expect(dueText('2026-10-28', TODAY)).toBe('2일 지남');
    expect(dueText('2026-10-30', TODAY)).toBe('오늘');
    expect(dueText('2026-11-02', TODAY)).toBe('D-3');
    expect(dueText('', TODAY)).toBe('기한 없음');
  });
});

describe('일정·단계·재무', () => {
  it('달력은 일요일 시작, 그 달을 모두 덮는다', () => {
    const g = monthGrid('2026-10');
    expect(g[0][0]).toBe('2026-09-27'); // 10/1은 목요일
    expect(weekday(g[0][0])).toBe('일');
    expect(g.flat()).toContain('2026-10-31');
    expect(g.every((w) => w.length === 7)).toBe(true);
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
  it('일정에는 날짜 있는 항목만, 날짜순', () => {
    const ev = calendarEvents(demoDataset(TODAY));
    expect(ev.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date))).toBe(true);
    expect(ev.map((e) => e.date)).toEqual([...ev.map((e) => e.date)].sort());
    expect(new Set(ev.map((e) => e.type))).toEqual(new Set(['다음 액션', '후속조치', '보험 만기', '인증 만료', '공고 마감']));
  });
  it('진행 단계 위치', () => {
    expect(stageIndex('계약·진행')).toBe(2);
    expect(stageIndex('종료')).toBe(-1);
  });
  it('전년비는 두 값이 있을 때만', () => {
    expect(yoy(86, 74)).toBe(16.2);
    expect(yoy(86, null)).toBeNull();
    expect(yoy(86, 0)).toBeNull();
  });
});

import { instant, isNewerContact as newer, lastTouch as touch } from './derive';

describe('접촉 시각 비교 (같은 날)', () => {
  it('날짜만 있으면 한국 시간 0시, 시차 없는 값은 한국 시간', () => {
    expect(instant('2026-10-30')).toBe(Date.parse('2026-10-29T15:00:00Z'));
    expect(instant('2026-10-30T14:30')).toBe(Date.parse('2026-10-30T05:30:00Z'));
    expect(instant('2026-10-30T05:30:00.000Z')).toBe(instant('2026-10-30T14:30:00+09:00'));
  });
  it('같은 날 더 이른 기록은 최근 접촉을 덮어쓰지 않는다', () => {
    expect(newer('2026-10-30T09:00:00+09:00', '2026-10-30T15:00:00+09:00')).toBe(false);
    expect(newer('2026-10-30T16:00:00+09:00', '2026-10-30T15:00:00+09:00')).toBe(true);
    expect(newer('2026-10-30T09:00:00+09:00', '2026-10-30')).toBe(true);
  });
  it('같은 날 노션에 직접 넣은 더 늦은 접촉이 마스터 값을 이긴다', () => {
    const d = demoDataset(TODAY);
    const c = { ...d.companies[0], lastContactDate: '2026-10-30T10:00:00+09:00', lastContactMethod: '전화' };
    const k = { ...d.contacts[0], companyIds: [c.id], date: '2026-10-30T15:00:00.000+09:00', method: '방문' };
    expect(touch(c, [k])).toMatchObject({ method: '방문' });
    expect(touch(c, [{ ...k, date: '2026-10-30T08:00:00.000+09:00' }])).toMatchObject({ method: '전화' });
  });
});
