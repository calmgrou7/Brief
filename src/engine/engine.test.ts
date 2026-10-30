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

describe('지표 쉬운 설명과 종합 판정', async () => {
  const { RATIO_GUIDE, verdict } = await import('./explain');
  it('현재 값을 쉬운 말로', () => {
    expect(RATIO_GUIDE.interestCoverage.read(2.58)).toBe('영업이익으로 이자를 2.58번 낼 수 있음');
    expect(RATIO_GUIDE.interestCoverage.read(0.8)).toContain('이자도 다 못 내는');
    expect(RATIO_GUIDE.debtRatio.read(2.423)).toBe('자기 돈 100원당 빚이 242원');
    expect(RATIO_GUIDE.revenueGrowth.read(-0.026)).toBe('작년보다 매출 2.6% 감소');
  });
  it('샘플 기업 종합 판정 한 줄', () => {
    const a = analyze(sampleStatements, sampleCompany, { method: 'simple', remainingRevenue: 0 }, emptyLevers());
    const v = verdict(a.rows, 'projected');
    expect(v.grade).toBe('위험');
    expect(v.line).toBe('매출이 2.6% 줄었고 가지급금이 많습니다(자산의 10.4%). 미달 2개·주의 6개로, 결산 전에 개선 계획이 꼭 필요합니다.');
    expect(verdict(a.rows, 'projected', true).line).toContain('다음 결산까지 개선 계획');
  });
});

describe('확정 결산·개인사업자', () => {
  it('확정 결산은 추정 없이 그대로, 신고 법인세 유지', () => {
    const cs = { ...sampleStatements, interimDate: '2025-12-31', current: sampleStatements.prior };
    const a = analyze(cs, sampleCompany, { method: 'final', remainingRevenue: 0 }, emptyLevers());
    expect(a.final).toBe(true);
    expect(a.projected.is).toEqual(sampleStatements.prior.is);
    expect(a.scenario.is.incomeTax).toBe(62 * M);
    // 비용을 늘리면 세전이익 변화분만큼만 세금이 줄어든다
    const b = analyze(cs, sampleCompany, { method: 'final', remainingRevenue: 0 }, { ...emptyLevers(), expenseAdd: 100 * M });
    const p = TAX_PARAMETERS[2025];
    expect(b.scenario.is.incomeTax).toBe(62 * M + estimateCorporateTax(300 * M, p) - estimateCorporateTax(400 * M, p));
    expect(totals(b.scenario.bs).imbalance).toBe(0);
  });

  it('개인사업자: 세금을 재무제표에 넣지 않고 종합소득세를 따로 추정', async () => {
    const { estimatePersonalIncomeTax } = await import('./params');
    const person = { ...sampleCompany, entity: 'individual' as const };
    const a = analyze(sampleStatements, person, { method: 'simple', remainingRevenue: 0 }, emptyLevers());
    expect(a.projected.is.incomeTax).toBe(0);
    expect(a.rows.some((r) => r.key === 'capitalImpairment' || r.key === 'officerLoanShare')).toBe(false);
    expect(a.personalTax).toBe(estimatePersonalIncomeTax(profit(a.scenario.is).pretaxIncome, p2026));
    // 과세표준 1억: 1,400만×6% + 3,600만×15% + 3,800만×24% + 1,200만×35% = 1,956만 → 지방세 포함 2,151.6만
    expect(estimatePersonalIncomeTax(100 * M, p2026)).toBe(21_516_000);
    expect(totals(a.scenario.bs).imbalance).toBe(0);
  });
});
