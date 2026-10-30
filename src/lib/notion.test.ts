import { describe, expect, it } from 'vitest';
import { decode, encode } from './notion';
import { COMPANY, INSURANCE, type Company, type Insurance } from './schema';

// 노션 API가 돌려주는 형태(2025-09-03)를 축약한 예시
const page = {
  id: 'p1',
  url: 'https://www.notion.so/p1',
  properties: {
    기업명: { type: 'title', title: [{ plain_text: '채움' }, { plain_text: '정밀' }] },
    고객번호: { type: 'unique_id', unique_id: { prefix: null, number: 7 } },
    관리상태: { type: 'status', status: { name: '상담중' } },
    진행업무: { type: 'multi_select', multi_select: [{ name: '정책자금' }, { name: '기업인증' }] },
    '대표 휴대폰': { type: 'phone_number', phone_number: '010-1111-2222' },
    상시근로자수: { type: 'number', number: 12 },
    '최근매출(원)': { type: 'number', number: null },
    '재무데이터 연동': { type: 'checkbox', checkbox: true },
    '최근 접촉일': { type: 'date', date: { start: '2026-10-28T14:00:00.000+09:00', end: null } },
    사업자등록증: { type: 'files', files: [{ name: '사업자.pdf', type: 'file', file: { url: 'https://s3/x' } }] },
    최종수정: { type: 'last_edited_time', last_edited_time: '2026-10-30T01:00:00.000Z' },
  },
};

describe('노션 → 값', () => {
  it('종류별로 읽는다', () => {
    const c = decode<Company>(page, COMPANY);
    expect(c).toMatchObject({
      id: 'p1', name: '채움정밀', no: '7', status: '상담중', tasks: ['정책자금', '기업인증'],
      mobile: '010-1111-2222', employees: 12, revenue: null, finLinked: true,
      lastContactDate: '2026-10-28T14:00:00.000+09:00', bizCert: [{ name: '사업자.pdf', url: 'https://s3/x' }],
      updatedAt: '2026-10-30T01:00:00.000Z',
    });
  });
  it('없는 속성은 빈 값', () => {
    const c = decode<Company>({ id: 'p2', properties: {} }, COMPANY);
    expect(c).toMatchObject({ name: '', tasks: [], employees: null, finLinked: false, bizCert: [] });
  });
  it('계약기간(시작~종료)', () => {
    const i = decode<Insurance>({ id: 'i', properties: { 계약기간: { date: { start: '2026-01-01', end: '2026-12-31' } } } }, INSURANCE);
    expect(i.period).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });
});

describe('값 → 노션', () => {
  it('넘긴 필드만, 읽기 전용은 제외', () => {
    const p = encode({ name: ' 채움 ', status: '종료', no: '9', updatedAt: 'x', mobile: '', employees: 3, tasks: ['정책자금'] }, COMPANY);
    expect(Object.keys(p).sort()).toEqual(['관리상태', '기업명', '대표 휴대폰', '상시근로자수', '진행업무'].sort());
    expect(p['기업명']).toEqual({ title: [{ type: 'text', text: { content: '채움' } }] });
    expect(p['대표 휴대폰']).toEqual({ phone_number: null });
    expect(p['진행업무']).toEqual({ multi_select: [{ name: '정책자금' }] });
  });
  it('빈 날짜·선택은 null로 지운다', () => {
    const p = encode({ nextActionDate: '', priority: '' }, COMPANY);
    expect(p['다음 액션일']).toEqual({ date: null });
    expect(p['우선순위']).toEqual({ select: null });
  });
  it('2000자 넘는 글은 나눠 보낸다', () => {
    const p = encode({ note: 'a'.repeat(4500) }, COMPANY);
    expect(p['비고'].rich_text).toHaveLength(3);
  });
  it('NaN 숫자는 비운다', () => {
    expect(encode({ revenue: Number.NaN }, COMPANY)['최근매출(원)']).toEqual({ number: null });
  });
});
