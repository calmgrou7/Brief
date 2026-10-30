import {
  DEFAULT_THRESHOLDS,
  estimatePersonalIncomeTax,
  RATIO_LABELS,
  taxParametersFor,
  type RatioKey,
  type Threshold,
} from './params';
import { estimateCashFlow, type CashFlowEstimate } from './cashflow';
import { fiscalYear, monthsElapsed, projectYearEnd } from './projection';
import { applyScenario, type ScenarioLevers, type ScenarioResult } from './scenario';
import { profit, ratios, totals, type Ratios } from './statements';
import { estimateGiftTax, valueShares, type ValuationResult } from './valuation';
import type { CompanyProfile, ComparativeStatements, ProjectionInput, Purpose, Statements } from './types';

export type Signal = 'good' | 'caution' | 'bad' | 'na';

export function signalFor(key: RatioKey, value: number | null, th: Threshold, r: Ratios): Signal {
  if (value === null) {
    if (key === 'interestCoverage') return 'good'; // 이자비용 없음
    if (key === 'debtRatio' && r.capitalImpairment !== null && r.capitalImpairment >= 1) return 'bad'; // 완전자본잠식
    return 'na';
  }
  if (th.direction === 'max') return value <= th.target ? 'good' : value <= th.caution ? 'caution' : 'bad';
  return value >= th.target ? 'good' : value >= th.caution ? 'caution' : 'bad';
}

/** 선택한 목적들의 목표치를 합친다. 같은 지표는 더 엄격한 기준을 쓴다 */
export function mergedThresholds(
  purposes: Purpose[],
  overrides: Partial<Record<RatioKey, Threshold>> = {},
): Partial<Record<RatioKey, Threshold>> {
  const merged: Partial<Record<RatioKey, Threshold>> = {};
  for (const p of purposes) {
    for (const [k, th] of Object.entries(DEFAULT_THRESHOLDS[p]) as [RatioKey, Threshold][]) {
      const cur = merged[k];
      if (!cur) merged[k] = th;
      else if (th.direction === 'max') merged[k] = { ...th, target: Math.min(cur.target, th.target), caution: Math.min(cur.caution, th.caution) };
      else merged[k] = { ...th, target: Math.max(cur.target, th.target), caution: Math.max(cur.caution, th.caution) };
    }
  }
  for (const [k, th] of Object.entries(overrides) as [RatioKey, Threshold][]) if (merged[k]) merged[k] = th;
  return merged;
}

export interface RatioRow {
  key: RatioKey;
  label: string;
  unit: '%' | '배';
  hint: string;
  threshold: Threshold;
  prior: number | null;
  projected: number | null;
  scenario: number | null;
  priorSignal: Signal;
  projectedSignal: Signal;
  scenarioSignal: Signal;
}

export interface Analysis {
  year: number;
  months: number;
  /** 신고 후 확정 결산 진단이면 true(가결산이면 false) */
  final: boolean;
  individual: boolean;
  /** 개인사업자: 사업소득 기준 종합소득세 추정(지방세 포함) */
  personalTax: number | null;
  interimTotals: ReturnType<typeof totals>;
  priorTotals: ReturnType<typeof totals>;
  projected: Statements;
  scenario: ScenarioResult;
  cashFlow: CashFlowEstimate;
  rows: RatioRow[];
  valuation: { projected: ValuationResult; scenario: ValuationResult };
  giftTax: { shares: number; projected: number; scenario: number };
  actions: Action[];
}

export interface Action {
  when: '올해 안에' | '내년';
  title: string;
  detail: string;
}

export function analyze(
  cs: ComparativeStatements,
  company: CompanyProfile,
  projection: ProjectionInput,
  levers: ScenarioLevers,
  overrides: Partial<Record<RatioKey, Threshold>> = {},
): Analysis {
  const year = fiscalYear(cs.interimDate);
  const params = taxParametersFor(year);
  const final = projection.method === 'final';
  const individual = company.entity === 'individual';
  const months = final ? 12 : monthsElapsed(cs.interimDate);
  const projected = projectYearEnd(cs, projection, !individual);
  const scenario = applyScenario(projected, levers, params, months, !individual);
  const priorRevenue = cs.prior.is.revenue;

  const rPrior = ratios(cs.prior.bs, cs.prior.is);
  const rProj = ratios(projected.bs, projected.is, priorRevenue);
  const rScen = ratios(scenario.bs, scenario.is, priorRevenue);
  const thresholds = mergedThresholds(individual ? company.purposes.filter((p) => p !== 'succession') : company.purposes, overrides);
  // 개인사업자는 자본금·가지급금 개념이 없다
  if (individual) {
    delete thresholds.capitalImpairment;
    delete thresholds.officerLoanShare;
  }
  const rows: RatioRow[] = (Object.entries(thresholds) as [RatioKey, Threshold][]).map(([key, th]) => ({
    key,
    ...RATIO_LABELS[key],
    threshold: th,
    prior: rPrior[key],
    projected: rProj[key],
    scenario: rScen[key],
    priorSignal: signalFor(key, rPrior[key], th, rPrior),
    projectedSignal: signalFor(key, rProj[key], th, rProj),
    scenarioSignal: signalFor(key, rScen[key], th, rScen),
  }));

  // 내년에 지분을 옮긴다면: 올해 결산(가장 최근 연도, 가중치 3)이 주식가치를 좌우한다
  const priorNet = profit(cs.prior.is).netIncome;
  const value = (s: Statements) =>
    valueShares(
      {
        sharesOutstanding: company.sharesOutstanding,
        netIncomes: [profit(s.is).netIncome, priorNet, company.netIncomeTwoYearsAgo],
        equity: totals(s.bs).equity,
        isRealEstateHeavy: company.isRealEstateHeavy,
        isSme: company.isSme,
      },
      params,
    );
  const valuation = { projected: value(projected), scenario: value(scenario) };
  const shares = levers.sharesToTransfer;
  const giftTax = {
    shares,
    projected: estimateGiftTax(shares * valuation.projected.valuePerShare, params),
    scenario: estimateGiftTax(shares * valuation.scenario.valuePerShare, params),
  };

  return {
    year,
    months,
    final,
    individual,
    personalTax: individual ? estimatePersonalIncomeTax(profit(scenario.is).pretaxIncome, params) : null,
    interimTotals: totals(cs.current.bs),
    priorTotals: totals(cs.prior.bs),
    projected,
    scenario,
    cashFlow: estimateCashFlow(cs.prior.bs, cs.current.bs, cs.current.is),
    rows,
    valuation,
    giftTax,
    actions: recommendActions(rows, individual ? { ...company, purposes: company.purposes.filter((p) => p !== 'succession') } : company, projected, levers, scenario),
  };
}

/** 규칙 기반 추천 액션. 시나리오에 이미 반영한 조치는 '실행 계획'으로 정리한다 */
function recommendActions(
  rows: RatioRow[],
  company: CompanyProfile,
  projected: Statements,
  lv: ScenarioLevers,
  scenario: ScenarioResult,
): Action[] {
  const actions: Action[] = [];
  const weak = (k: RatioKey) => rows.find((r) => r.key === k && r.scenarioSignal !== 'good' && r.scenarioSignal !== 'na');

  if (lv.revenueAdd > 0) actions.push({ when: '올해 안에', title: '연내 매출 확정', detail: '추가 매출의 세금계산서 발행·인도를 12월 31일 이전에 완료' });
  if (lv.expenseAdd > 0) actions.push({ when: '올해 안에', title: '연내 비용 집행', detail: '필요 비용의 지출 증빙을 결산 전에 확보' });
  if (lv.loanAmount > 0)
    actions.push({
      when: lv.loanTiming === 'thisYear' ? '올해 안에' : '내년',
      title: lv.loanTiming === 'thisYear' ? '대출 연내 실행' : '대출은 결산 후 실행',
      detail: lv.loanTiming === 'thisYear' ? '올해 재무제표에 차입금이 반영됨' : '올해 결산 비율을 지킨 뒤 새 재무제표로 신청',
    });
  if (lv.repayAmount > 0) actions.push({ when: '올해 안에', title: '차입금 일부 상환', detail: '결산일 전 상환으로 부채비율·차입금의존도 개선' });
  if (lv.capitalIncrease > 0) actions.push({ when: '올해 안에', title: '유상증자', detail: '이사회·주총 결의, 주금 납입, 변경등기까지 결산일 전에 완료' });
  if (lv.capitalReduction > 0) actions.push({ when: '올해 안에', title: lv.capitalReductionPaid ? '유상감자' : '무상감자(결손 보전)', detail: '주총 특별결의·채권자 보호절차 기간(1개월 이상) 고려해 일정 확정' });
  if (lv.officerLoanSettle > 0) actions.push({ when: '올해 안에', title: '가지급금 정리', detail: '정리 방법별 대표 개인 세금을 세무사와 확인' });

  if (weak('debtRatio') && lv.capitalIncrease === 0) actions.push({ when: '올해 안에', title: '부채비율 개선 검토', detail: '유상증자, 가수금 출자전환, 연내 일부 상환, 신규 대출 내년 이연' });
  if (weak('currentRatio')) actions.push({ when: '올해 안에', title: '유동비율 개선 검토', detail: '단기차입금의 장기 전환, 매출채권 회수 독려' });
  if (weak('interestCoverage')) actions.push({ when: '내년', title: '이자보상배율 관리', detail: '고금리 차입 대환, 영업이익 개선 계획 수립' });
  if (weak('capitalImpairment') && lv.capitalIncrease === 0) actions.push({ when: '올해 안에', title: '자본잠식 해소', detail: '증자 또는 무상감자 — 정책자금 신청 결격 사유가 될 수 있음' });
  if (weak('officerLoanShare') && lv.officerLoanSettle === 0) actions.push({ when: '올해 안에', title: '가지급금 정리 계획', detail: '인정이자로 법인세·대표 소득세 부담, 대출 심사 감점 요인' });

  if (company.purposes.includes('succession')) {
    const up = profit(scenario.is).netIncome >= profit(projected.is).netIncome;
    actions.push({
      when: '내년',
      title: '지분 이전 시점 판단',
      detail: up
        ? '올해 이익이 늘면 내년 주식가치가 오름 — 이전은 이익이 낮은 해 결산 직후가 유리'
        : '올해 이익 조정으로 주식가치가 낮아짐 — 내년 상반기 이전을 검토',
    });
  }
  return actions;
}
