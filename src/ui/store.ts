import { emptyLevers, type CompanyProfile, type ComparativeStatements, type ProjectionInput, type ScenarioLevers } from '../engine';
import { emptyBalanceSheet, emptyIncomeStatement } from '../engine/statements';
import { sampleCompany, sampleStatements } from '../engine/sample';

export interface Scenario {
  name: string;
  levers: ScenarioLevers;
}

export interface Advisor {
  name: string;
  org: string;
  phone: string;
}

export interface CaseFile {
  id: string;
  company: CompanyProfile;
  statements: ComparativeStatements;
  projection: ProjectionInput;
  scenarios: Scenario[];
  activeScenario: number;
  accountingFirm: string;
  isSample?: boolean;
}

export interface AppState {
  advisor: Advisor;
  cases: CaseFile[];
  activeCase: string;
}

const KEY = 'brief.v1';
const M = 1_000_000;

export function sampleCase(): CaseFile {
  return {
    id: 'sample',
    isSample: true,
    company: { ...sampleCompany },
    statements: structuredClone(sampleStatements),
    projection: { method: 'simple', remainingRevenue: 0 },
    scenarios: [
      { name: 'A. 현재 추세 유지', levers: emptyLevers() },
      {
        name: 'B. 대출·정책자금 대비형',
        levers: { ...emptyLevers(), capitalIncrease: 300 * M, officerLoanSettle: 200 * M, officerLoanMethod: 'repay', loanAmount: 500 * M, loanTiming: 'nextYear' },
      },
      {
        name: 'C. 승계 대비형',
        levers: { ...emptyLevers(), expenseAdd: 120 * M, officerLoanSettle: 150 * M, officerLoanMethod: 'bonus', sharesToTransfer: 6_000 },
      },
    ],
    activeScenario: 1,
    accountingFirm: '○○세무회계사무소',
  };
}

export function blankCase(): CaseFile {
  const year = new Date().getFullYear();
  return {
    id: Math.random().toString(36).slice(2, 10),
    company: {
      name: '새 기업',
      ceo: '',
      industry: '',
      isSme: true,
      isRealEstateHeavy: false,
      sharesOutstanding: 10_000,
      ceoShares: 10_000,
      netIncomeTwoYearsAgo: 0,
      purposes: ['policyFund', 'bankLoan'],
    },
    statements: {
      interimDate: `${year}-09-30`,
      current: { bs: emptyBalanceSheet(), is: emptyIncomeStatement() },
      prior: { bs: emptyBalanceSheet(), is: emptyIncomeStatement() },
    },
    projection: { method: 'simple', remainingRevenue: 0 },
    scenarios: [
      { name: 'A. 현재 추세 유지', levers: emptyLevers() },
      { name: 'B. 시나리오', levers: emptyLevers() },
      { name: 'C. 시나리오', levers: emptyLevers() },
    ],
    activeScenario: 1,
    accountingFirm: '',
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      if (s.cases?.length) return s;
    }
  } catch {
    /* 저장소를 쓸 수 없으면 샘플로 시작 */
  }
  return { advisor: { name: '홍길동', org: '○○법인컨설팅', phone: '010-0000-0000' }, cases: [sampleCase()], activeCase: 'sample' };
}

export function saveState(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 무시 */
  }
}
