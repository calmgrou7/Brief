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
