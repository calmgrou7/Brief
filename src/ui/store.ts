import { emptyLevers, type CompanyProfile, type ComparativeStatements, type ProjectionInput, type ScenarioLevers } from '../engine';
import { emptyBalanceSheet, emptyIncomeStatement } from '../engine/statements';
import { sampleCompany, sampleStatements } from '../engine/sample';
import { emptyCrm, isoDate, type Crm, type Snapshot } from './crm';

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
  crm: Crm;
  history: Snapshot[];
  updatedAt: string;
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
    crm: {
      stage: '진단 완료',
      nextDate: '2026-11-12',
      nextAction: '시나리오 B 제안, 회계사무실 요청서 전달',
      memos: [{ date: '2026-10-20', text: '9월말 비교식 재무제표 수령. 내년 정책자금 신청 희망, 자녀 지분 이전 관심.' }],
    },
    history: [],
    updatedAt: isoDate(new Date()),
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
    crm: emptyCrm(),
    history: [],
    updatedAt: isoDate(new Date()),
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      if (s.cases?.length) return { ...s, cases: s.cases.map(normalizeCase) };
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

/** 예전 버전에서 저장한 자료에 새 항목 기본값을 채운다 */
export function normalizeCase(c: CaseFile): CaseFile {
  return { ...c, crm: { ...emptyCrm(), ...c.crm }, history: c.history ?? [], updatedAt: c.updatedAt ?? isoDate(new Date()) };
}

/** 백업 파일 내용 */
export function exportBackup(s: AppState): string {
  return JSON.stringify({ app: 'chaeum', version: 1, exportedAt: new Date().toISOString(), advisor: s.advisor, cases: s.cases }, null, 1);
}

/** 백업 파일 읽기. 같은 고객(id)은 백업 내용으로 바꾸고 새 고객은 추가한다 */
export function mergeBackup(s: AppState, text: string): { state: AppState; added: number; replaced: number } {
  const data = JSON.parse(text);
  if (data?.app !== 'chaeum' || !Array.isArray(data.cases)) throw new Error('채움 백업 파일이 아닙니다.');
  const incoming = (data.cases as CaseFile[]).map(normalizeCase);
  const ids = new Set(s.cases.map((c) => c.id));
  const replaced = incoming.filter((c) => ids.has(c.id)).length;
  const byId = new Map(incoming.map((c) => [c.id, c]));
  const cases = [...s.cases.map((c) => byId.get(c.id) ?? c), ...incoming.filter((c) => !ids.has(c.id))];
  return { state: { ...s, cases, advisor: data.advisor ?? s.advisor }, added: incoming.length - replaced, replaced };
}
