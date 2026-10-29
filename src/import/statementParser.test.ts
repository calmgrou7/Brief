import { describe, expect, it } from 'vitest';
import { emptyBalanceSheet, totals } from '../engine/statements';
import { parseStatements, toBalanceSheets, type TextItem } from './statementParser';

// 회계사무실 비교식 재무제표 PDF와 같은 배치를 흉내 낸 가상 데이터(실존 기업 아님).
// 계정명은 글자마다 띄어 쓰고, 금액은 당기(상세·소계)·전기(상세·소계) 네 열에 둔다.
const COLS = { cd: 400, cs: 520, pd: 640, ps: 760 };
let y = 800;
const spaced = (text: string, x: number, gap = 12): TextItem[] => [...text].map((ch, i) => ({ str: ch, x: x + i * gap, y, w: 8 }));
const amount = (v: number, right: number): TextItem => {
  const s = v < 0 ? `(${Math.abs(v).toLocaleString('en-US')})` : v.toLocaleString('en-US');
  return { str: s, x: right - s.length * 5, y, w: s.length * 5 };
};
function row(label: string, a: Partial<Record<keyof typeof COLS, number>> = {}): TextItem[] {
  y -= 20;
  return [...spaced(label, 60), ...(Object.entries(a) as [keyof typeof COLS, number][]).map(([k, v]) => amount(v, COLS[k]))];
}
function page(title: string, period: string, rows: (() => TextItem[])[]): TextItem[] {
  y = 800;
  const head = [...spaced(title, 220, 30), ...(y -= 20, spaced(period, 220, 6)), ...(y -= 20, spaced('회사명 : 주식회사 가나다테크', 46, 10))];
  return [...head, ...row('과 목'), ...row('금 액'), ...rows.flatMap((r) => r())];
}

const bs = page('재무상태표', '제 5기 2026년 09월 30일 현재', [
  () => row('자 산'),
  () => row('Ⅰ. 유 동 자 산', { cs: 900, ps: 800 }),
  () => row('(1) 당 좌 자 산', { cs: 600, ps: 500 }),
  () => row('현 금 및 현 금 성 자 산', { cd: 100, pd: 150 }),
  () => row('외 상 매 출 금', { cd: 300, pd: 250 }),
  () => row('주 임 종 단 기 채 권', { cd: 200, pd: 100 }),
  () => row('(2) 재 고 자 산', { cs: 300, ps: 300 }),
  () => row('제 품', { cd: 300, pd: 300 }),
  () => row('Ⅱ. 비 유 동 자 산', { cs: 1100, ps: 1200 }),
  () => row('(1) 유 형 자 산', { cs: 1000, ps: 1100 }),
  () => row('기 계 장 치', { cd: 1500, pd: 1500 }),
  () => row('감 가 상 각 누 계 액', { cd: -500, pd: -400 }),
  () => row('(2) 투 자 자 산', { cs: 100, ps: 100 }),
  () => row('장 기 대 여 금', { cd: 100, pd: 100 }),
  () => row('자 산 총 계', { cs: 2000, ps: 2000 }),
  () => row('부 채'),
  () => row('Ⅰ. 유 동 부 채', { cs: 700, ps: 800 }),
  () => row('외 상 매 입 금', { cd: 200, pd: 300 }),
  () => row('단 기 차 입 금', { cd: 400, pd: 500 }),
  () => row('가 수 금', { cd: 100, pd: 0 }),
  () => row('Ⅱ. 비 유 동 부 채', { cs: 500, ps: 500 }),
  () => row('장 기 차 입 금', { cd: 500, pd: 500 }),
  () => row('부 채 총 계', { cs: 1200, ps: 1300 }),
  () => row('자 본'),
  () => row('Ⅰ. 자 본 금', { cs: 100, ps: 100 }),
  () => row('자 본 금', { cd: 100, pd: 100 }),
  () => row('Ⅱ. 자 본 잉 여 금', { cs: 50, ps: 50 }),
  () => row('Ⅲ. 이 익 잉 여 금', { cs: 650, ps: 550 }),
  () => row('미 처 분 이 익 잉 여 금', { cd: 650, pd: 550 }),
  () => row('자 본 총 계', { cs: 800, ps: 700 }),
  () => row('부 채 및 자 본 총 계', { cs: 2000, ps: 2000 }),
]);

const is = page('손익계산서', '제 5(당)기 2026년 1월 1일부터 2026년 9월 30일까지', [
  () => row('Ⅰ. 매 출 액', { cs: 5000, ps: 6000 }),
  () => row('제 품 매 출', { cd: 5000, pd: 6000 }),
  () => row('Ⅱ. 매 출 원 가', { cs: 3000, ps: 3600 }),
  () => row('Ⅲ. 매 출 총 이 익', { cs: 2000, ps: 2400 }),
  () => row('Ⅳ. 판 매 비 와 관 리 비', { cs: 1500, ps: 1800 }),
  () => row('감 가 상 각 비', { cd: 40, pd: 50 }),
  () => row('Ⅴ. 영 업 이 익', { cs: 500, ps: 600 }),
  () => row('Ⅵ. 영 업 외 수 익', { cs: 30, ps: 20 }),
  () => row('Ⅶ. 영 업 외 비 용', { cs: 130, ps: 120 }),
  () => row('이 자 비 용', { cd: 100, pd: 110 }),
  () => row('잡 손 실', { cd: 30, pd: 10 }),
  () => row('Ⅷ. 법 인 세 차 감 전 이 익', { cs: 400, ps: 500 }),
  () => row('Ⅸ. 법 인 세 등', { cs: 0, ps: 50 }),
  () => row('Ⅹ. 당 기 순 이 익', { cs: 400, ps: 450 }),
]);

const mfg = page('제조원가명세서', '제5기 2026년 01월 01일부터', [
  () => row('Ⅲ. 경 비', { cs: 60, ps: 70 }),
  () => row('감 가 상 각 비', { cd: 20, pd: 25 }),
]);

describe('비교식 재무제표 PDF 읽기', () => {
  const r = parseStatements([bs, is, mfg]);

  it('회사명·기준일·페이지 종류', () => {
    expect(r.companyName).toBe('(주)가나다테크');
    expect(r.interimDate).toBe('2026-09-30');
    expect(r.pagesFound).toEqual(['재무상태표', '손익계산서', '제조원가명세서']);
  });

  it('상세 계정만 모아 원본 합계와 일치', () => {
    const { current, prior } = toBalanceSheets(r.accounts, emptyBalanceSheet);
    expect(totals(current).assets).toBe(r.reported.current.assets);
    expect(totals(current).liabilities).toBe(r.reported.current.liabilities);
    expect(totals(current).equity).toBe(r.reported.current.equity);
    expect(totals(prior).assets).toBe(2000);
  });

  it('계정 분류', () => {
    const key = (name: string) => r.accounts.find((a) => a.name === name)?.key;
    expect(key('외상매출금')).toBe('receivables');
    expect(key('주임종단기채권')).toBe('officerLoans');
    expect(key('제품')).toBe('inventory');
    expect(key('감가상각누계액')).toBe('tangibleAssets');
    expect(key('가수금')).toBe('officerAdvances');
    expect(r.accounts.find((a) => a.name === '장기대여금')?.review).toBeTruthy();
    // 상세 계정 없이 구역 금액만 있는 자본잉여금은 구역 금액을 쓴다
    expect(r.accounts.find((a) => a.name === '자본잉여금')?.key).toBe('otherEquity');
  });

  it('손익: 구역 합계 + 이자비용·감가상각비(제조원가 포함)', () => {
    expect(r.income.current).toEqual({
      revenue: 5000,
      costOfSales: 3000,
      sga: 1500,
      depreciation: 60,
      nonOperatingIncome: 30,
      interestExpense: 100,
      otherNonOperatingExpense: 30,
      incomeTax: 0,
    });
    expect(r.reported.prior.netIncome).toBe(450);
  });
});
