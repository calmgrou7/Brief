import { describe, expect, it } from 'vitest';
import {
  TAX_PARAMETERS,
  analyze,
  applyScenario,
  emptyLevers,
  estimateCashFlow,
  estimateCorporateTax,
  estimateGiftTax,
  monthsElapsed,
  profit,
  progressiveTax,
  projectYearEnd,
  ratios,
  signalFor,
  totals,
  valueShares,
} from './index';
import { sampleCompany, sampleStatements } from './sample';

const M = 1_000_000;
const p2026 = TAX_PARAMETERS[2026];

describe('세금', () => {
  it('법인세 누진 계산 (2026년 세율)', () => {
    expect(progressiveTax(200 * M, p2026.corporateTax)).toBe(20 * M);
    expect(progressiveTax(500 * M, p2026.corporateTax)).toBe(20 * M + 60 * M);
    // 지방소득세 10% 포함
    expect(estimateCorporateTax(500 * M, p2026)).toBe(88 * M);
    expect(estimateCorporateTax(-10 * M, p2026)).toBe(0);
  });

  it('증여세: 5천만원 공제 후 누진, 신고세액공제 3%', () => {
    // 과세표준 3억 → 1억×10% + 2억×20% = 5천만 → ×0.97
    expect(estimateGiftTax(350 * M, p2026)).toBe(48_500_000);
    expect(estimateGiftTax(40 * M, p2026)).toBe(0);
  });
});

describe('재무상태표 균형', () => {
  it('샘플 비교식 재무제표는 차대 일치', () => {
    expect(totals(sampleStatements.current.bs).imbalance).toBe(0);
    expect(totals(sampleStatements.prior.bs).imbalance).toBe(0);
  });

  it('연말 예상 후에도 차대 일치', () => {
    const proj = projectYearEnd(sampleStatements, { method: 'simple', remainingRevenue: 0 });
    expect(totals(proj.bs).imbalance).toBe(0);
    expect(proj.is.revenue).toBe(7600 * M);
  });

  it('모든 레버를 동시에 적용해도 차대 일치', () => {
    const proj = projectYearEnd(sampleStatements, { method: 'simple', remainingRevenue: 0 });
    const lv = {
      ...emptyLevers(),
      revenueAdd: 500 * M,
      revenueCostRatio: 0.8,
      expenseAdd: 50 * M,
      inventoryAdd: 100 * M,
      loanAmount: 300 * M,
      repayAmount: 200 * M,
      capitalIncrease: 200 * M,
      capitalReduction: 50 * M,
      officerLoanSettle: 100 * M,
      officerLoanMethod: 'bonus' as const,
    };
    const s = applyScenario(proj, lv, p2026, 9);
    expect(totals(s.bs).imbalance).toBe(0);
    expect(s.is.incomeTax).toBe(estimateCorporateTax(profit(s.is).pretaxIncome, p2026));
  });
});

describe('연환산', () => {
  it('기준일까지 경과 개월', () => {
    expect(monthsElapsed('2026-09-30')).toBe(9);
    expect(monthsElapsed('2026-10-31')).toBe(10);
  });

  it('대표 예상: 남은 매출을 더하고 원가는 누적 원가율', () => {
    const proj = projectYearEnd(sampleStatements, { method: 'ceoForecast', remainingRevenue: 2300 * M });
    expect(proj.is.revenue).toBe(8000 * M);
    expect(proj.is.costOfSales).toBe(Math.round(8000 * M * (4617 / 5700)));
  });
});

describe('시나리오 레버', () => {
  const proj = projectYearEnd(sampleStatements, { method: 'simple', remainingRevenue: 0 });
  const run = (patch: Partial<ReturnType<typeof emptyLevers>>) => applyScenario(proj, { ...emptyLevers(), ...patch }, p2026, 9);

  it('재고 매입은 손익에 영향이 없다', () => {
    const s = run({ inventoryAdd: 300 * M });
    expect(profit(s.is).netIncome).toBe(profit(proj.is).netIncome);
    expect(s.bs.inventory).toBe(proj.bs.inventory + 300 * M);
  });

  it('유상증자는 부채비율을 낮춘다', () => {
    const before = ratios(proj.bs, proj.is).debtRatio!;
    const after = ratios(run({ capitalIncrease: 300 * M }).bs, proj.is).debtRatio!;
    expect(after).toBeLessThan(before);
  });

  it('내년 대출은 올해 재무제표에 반영하지 않는다', () => {
    const s = run({ loanAmount: 500 * M, loanTiming: 'nextYear' });
    expect(s.bs.longTermBorrowings).toBe(proj.bs.longTermBorrowings);
    expect(s.deferred).toHaveLength(1);
    expect(s.nextYearInterest).toBe(25 * M);
  });

  it('올해 대출은 남은 기간 이자를 반영한다', () => {
    const s = run({ loanAmount: 400 * M, loanTiming: 'thisYear', loanRate: 0.06 });
    expect(s.is.interestExpense - proj.is.interestExpense).toBe(6 * M);
  });

  it('추가 비용은 법인세를 줄인다', () => {
    const s = run({ expenseAdd: 100 * M });
    expect(s.is.incomeTax).toBeLessThan(proj.is.incomeTax);
  });

  it('무상감자는 결손이 없으면 자본총계 변화 없음 + 경고', () => {
    const s = run({ capitalReduction: 100 * M });
    expect(totals(s.bs).equity).toBe(totals(proj.bs).equity);
    expect(s.warnings.length).toBeGreaterThan(0);
  });
});

describe('추정 현금흐름', () => {
  it('합계는 현금 증감과 일치', () => {
    const cf = estimateCashFlow(sampleStatements.prior.bs, sampleStatements.current.bs, sampleStatements.current.is);
    expect(cf.netChange).toBe(sampleStatements.current.bs.cash - sampleStatements.prior.bs.cash);
    expect(cf.topUses[0].label).toBe('매출채권 증감');
  });
});

describe('비상장주식 평가', () => {
  it('순손익가치 3 : 순자산가치 2 가중', () => {
    const v = valueShares(
      { sharesOutstanding: 10_000, netIncomes: [60 * M, 60 * M, 60 * M], equity: 500 * M, isRealEstateHeavy: false, isSme: true },
      p2026,
    );
    // 순손익가치 = 6,000 / 10% = 60,000원, 순자산가치 50,000원
    expect(v.incomeValuePerShare).toBe(60_000);
    expect(v.netAssetValuePerShare).toBe(50_000);
    expect(v.valuePerShare).toBe(56_000);
    expect(v.floorApplied).toBe(false);
  });

  it('순자산가치 80% 하한', () => {
    const v = valueShares(
      { sharesOutstanding: 10_000, netIncomes: [-50 * M, 0, 0], equity: 500 * M, isRealEstateHeavy: false, isSme: true },
      p2026,
    );
    expect(v.valuePerShare).toBe(40_000);
    expect(v.floorApplied).toBe(true);
  });
});

describe('진단', () => {
  it('신호등 방향', () => {
    const r = ratios(sampleStatements.prior.bs, sampleStatements.prior.is);
    expect(signalFor('debtRatio', 1.5, { direction: 'max', target: 2, caution: 3 }, r)).toBe('good');
    expect(signalFor('debtRatio', 2.5, { direction: 'max', target: 2, caution: 3 }, r)).toBe('caution');
    expect(signalFor('currentRatio', 0.8, { direction: 'min', target: 1.5, caution: 1 }, r)).toBe('bad');
  });

  it('샘플 분석: 이익을 줄이면 대출 지표는 나빠지고 주식가치는 내려간다', () => {
    const base = analyze(sampleStatements, sampleCompany, { method: 'simple', remainingRevenue: 0 }, emptyLevers());
    const cut = analyze(sampleStatements, sampleCompany, { method: 'simple', remainingRevenue: 0 }, { ...emptyLevers(), expenseAdd: 150 * M });
    expect(cut.valuation.scenario.valuePerShare).toBeLessThan(base.valuation.scenario.valuePerShare);
    const oi = (a: typeof base) => a.rows.find((r) => r.key === 'operatingMargin')!.scenario!;
    expect(oi(cut)).toBeLessThan(oi(base));
    expect(base.rows.find((r) => r.key === 'officerLoanShare')!.scenarioSignal).toBe('bad');
  });
});

describe('리포트 문장', () => {
  it('세 줄 결론과 상담 질문을 만든다', async () => {
    const { headline, consultingQuestions } = await import('./narrative');
    const a = analyze(sampleStatements, sampleCompany, { method: 'simple', remainingRevenue: 0 }, { ...emptyLevers(), capitalIncrease: 300 * M });
    const lines = headline(a, sampleCompany, '부채비율 개선형');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('가지급금 비중');
    expect(consultingQuestions(a, sampleCompany).length).toBeGreaterThan(3);
  });
});
