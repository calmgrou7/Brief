// 데이터 저장소. NOTION_TOKEN이 있으면 노션, 없으면 메모리 속 예시 데이터(데모 모드).
import 'server-only';
import {
  CERT, COMPANY, CONTACT, DATA_SOURCES, FINANCE, GOAL, INSURANCE, LINK, MATCH, STATUS,
  type Company, type Contact, type DashLink, type Dataset, type FieldMap,
} from './schema';
import { compareSchema, createPage, decode, encode, getDataSource, NotionError, queryAll, trashPage, updatePage, type SchemaIssue } from './notion';
import { demoDataset } from './demo';
import { isNewerContact } from './derive';

const TTL_MS = 60_000;

const token = () => process.env.NOTION_TOKEN?.trim() || '';
export const isDemo = () => !token();

type Store = { data?: Dataset; at: number; demo?: Dataset };
// 개발 서버의 모듈 재로딩에도 유지되도록 전역에 둔다
const g = globalThis as unknown as { __chaeum?: Store };
const store: Store = (g.__chaeum ??= { at: 0 });

const DBS: Record<Exclude<keyof Dataset, 'loadedAt'>, [string, FieldMap]> = {
  companies: [DATA_SOURCES.companies, COMPANY],
  contacts: [DATA_SOURCES.contacts, CONTACT],
  certs: [DATA_SOURCES.certs, CERT],
  insurances: [DATA_SOURCES.insurances, INSURANCE],
  finances: [DATA_SOURCES.finances, FINANCE],
  goals: [DATA_SOURCES.goals, GOAL],
  matches: [DATA_SOURCES.matches, MATCH],
  links: [DATA_SOURCES.links, LINK],
};

const DB_LABELS: Record<keyof typeof DBS, string> = {
  companies: '기업컨설팅관리대시보드', contacts: '접촉이력', certs: '인증·솔루션 적용현황', insurances: '기업보험 계약현황',
  finances: '연도별 재무컨설팅', goals: '목표·과업', matches: '지원사업 AI 매칭', links: '연계 대시보드 링크',
};

export interface DbCheck { key: string; label: string; ok: boolean; error?: string; issues: SchemaIssue[] }

/** 배포 직후 '노션이 제대로 붙었나' 확인: 8개 DB 접근 + 속성 이름·종류 */
export async function checkConnection(): Promise<DbCheck[] | null> {
  const t = token();
  if (!t) return null;
  const out: DbCheck[] = [];
  for (const key of Object.keys(DBS) as (keyof typeof DBS)[]) {
    const [ds, map] = DBS[key];
    try {
      const src = await getDataSource(t, ds);
      const issues = compareSchema(map, src.properties, key === 'companies' ? { 관리상태: STATUS } : {});
      out.push({ key, label: DB_LABELS[key], ok: issues.length === 0, issues });
    } catch (e) {
      const error = e instanceof NotionError
        ? e.status === 401 ? '토큰이 올바르지 않습니다' : e.status === 404 ? '접근 권한 없음 — 노션에서 통합을 연결해 주세요' : `${e.status} ${e.message}`
        : '노션 서버에 연결하지 못했습니다';
      out.push({ key, label: DB_LABELS[key], ok: false, error, issues: [] });
      if (e instanceof NotionError && e.status === 401) break; // 토큰이 틀리면 나머지도 같은 결과
    }
  }
  return out;
}

async function loadFromNotion(t: string): Promise<Dataset> {
  const keys = Object.keys(DBS) as (keyof typeof DBS)[];
  // 노션 초당 요청 제한을 넘지 않도록 순서대로 읽는다
  const out: Partial<Dataset> = {};
  for (const k of keys) {
    const [ds, map] = DBS[k];
    const pages = await queryAll(t, ds);
    (out as Record<string, unknown>)[k] = pages.map((p) => decode(p, map));
  }
  return { ...(out as Dataset), loadedAt: new Date().toISOString() };
}

export async function getData(force = false): Promise<Dataset> {
  const t = token();
  if (!t) return (store.demo ??= demoDataset());
  if (!force && store.data && Date.now() - store.at < TTL_MS) return store.data;
  store.data = await loadFromNotion(t);
  store.at = Date.now();
  return store.data;
}

export function invalidate() {
  store.at = 0;
}

/* ---------- 쓰기 ---------- */

const newId = () => `demo-${Math.random().toString(36).slice(2, 10)}`;

export type CompanyInput = Partial<Omit<Company, 'id' | 'url' | 'no' | 'bizCert' | 'updatedAt'>>;

export async function createCompany(input: CompanyInput): Promise<string> {
  const t = token();
  if (!t) {
    const d = await getData();
    const id = newId();
    const no = String(Math.max(0, ...d.companies.map((c) => Number(c.no) || 0)) + 1);
    d.companies.push({ ...blankCompany(), ...input, id, no, url: '', updatedAt: new Date().toISOString() });
    return id;
  }
  const page = await createPage(t, DATA_SOURCES.companies, encode(input, COMPANY));
  invalidate();
  return page.id;
}

export async function updateCompany(id: string, input: CompanyInput) {
  const t = token();
  if (!t) {
    const c = (await getData()).companies.find((x) => x.id === id);
    if (c) Object.assign(c, input, { updatedAt: new Date().toISOString() });
    return;
  }
  await updatePage(t, id, encode(input, COMPANY));
  invalidate();
}

export async function deleteCompany(id: string) {
  const t = token();
  if (!t) {
    const d = await getData();
    d.companies = d.companies.filter((c) => c.id !== id);
    return;
  }
  await trashPage(t, id);
  invalidate();
}

export type ContactInput = Omit<Contact, 'id' | 'url'>;

/** 접촉 기록 1건 추가 + 업체의 최근 접촉일·방법을 더 최신일 때만 갱신 */
export async function addContact(input: ContactInput) {
  const t = token();
  const d = await getData();
  const company = d.companies.find((c) => c.id === input.companyIds[0]);
  const bump = company && isNewerContact(input.date, company.lastContactDate)
    ? { lastContactDate: input.date, lastContactMethod: input.method }
    : null;
  if (!t) {
    d.contacts.push({ ...input, id: newId(), url: '' });
    if (company && bump) Object.assign(company, bump);
    return;
  }
  await createPage(t, DATA_SOURCES.contacts, encode(input, CONTACT));
  if (company && bump) await updatePage(t, company.id, encode(bump, COMPANY));
  invalidate();
}

export async function setFollowUpDone(contactId: string, done: boolean) {
  const t = token();
  if (!t) {
    const c = (await getData()).contacts.find((x) => x.id === contactId);
    if (c) c.followUpDone = done;
    return;
  }
  await updatePage(t, contactId, encode({ followUpDone: done }, CONTACT));
  invalidate();
}

export async function saveLink(id: string | null, input: Omit<DashLink, 'id' | 'url'>) {
  const t = token();
  if (!t) {
    const d = await getData();
    if (id) Object.assign(d.links.find((l) => l.id === id) ?? {}, input);
    else d.links.push({ ...input, id: newId(), url: '' });
    return;
  }
  const props = encode(input as unknown as Record<string, unknown>, LINK);
  if (id) await updatePage(t, id, props);
  else await createPage(t, DATA_SOURCES.links, props);
  invalidate();
}

export async function deleteLink(id: string) {
  const t = token();
  if (!t) {
    const d = await getData();
    d.links = d.links.filter((l) => l.id !== id);
    return;
  }
  await trashPage(t, id);
  invalidate();
}

export function blankCompany(): Omit<Company, 'id' | 'url'> {
  return {
    name: '', no: '', status: '잠재', priority: '', bizNo: '', corpNo: '', bizCert: [],
    ceo: '', mobile: '', phone: '', email: '', address: '', region: '', entity: '', industry: '',
    founded: '', employees: null, revenue: null, tasks: [], interests: [], interestMemo: '',
    plannedSolution: '', nextGoal: '', nextAction: '', nextActionDate: '',
    lastContactDate: '', lastContactMethod: '', source: '직접입력', finLinked: false,
    webappId: '', note: '', updatedAt: '',
  };
}
