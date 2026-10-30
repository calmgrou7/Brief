// 화면에 보여줄 값 계산(순수 함수). 노션/데모 어느 쪽 데이터든 같은 규칙.
import { ACTIVE_STATUS, type Company, type Contact, type Dataset } from './schema';

export const STALE_DAYS = 30;
export const INSURANCE_ALERT_DAYS = 90;
export const TODO_DAYS = 7;

/** 한국 시간 기준 오늘 YYYY-MM-DD */
export function todayKST(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);
}

/** 한국 시간 기준 지금 YYYY-MM-DDTHH:mm (datetime-local 기본값용) */
export function nowKST(now = new Date()): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}`;
}

const day = (s: string) => s.slice(0, 10);

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(day(to)) - Date.parse(day(from))) / 86_400_000);
}

export function isNewerContact(date: string, last: string): boolean {
  if (!date) return false;
  return !last || day(date) >= day(last);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${day(date)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 사업자등록번호 → 000-00-00000. 10자리가 아니면 null */
export function normalizeBizNo(s: string): string | null {
  const d = s.replace(/\D/g, '');
  if (!d) return '';
  if (d.length !== 10) return null;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export const telHref = (s: string) => `tel:${s.replace(/[^\d+]/g, '')}`;
export const smsHref = (s: string) => `sms:${s.replace(/[^\d+]/g, '')}`;

export function contactsOf(data: Pick<Dataset, 'contacts'>, companyId: string): Contact[] {
  return data.contacts
    .filter((c) => c.companyIds.includes(companyId))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface LastTouch { date: string; method: string }

/**
 * 최근 접촉: 업체 마스터의 값과 접촉이력 중 더 최신.
 * 노션에서 접촉이력만 직접 입력해도 대시보드에는 바로 반영되게 한다.
 */
export function lastTouch(company: Company, contacts: Contact[]): LastTouch | null {
  let best: LastTouch | null = company.lastContactDate
    ? { date: company.lastContactDate, method: company.lastContactMethod }
    : null;
  for (const c of contacts) {
    if (!c.date || !c.companyIds.includes(company.id)) continue;
    if (!best || day(c.date) > day(best.date)) best = { date: c.date, method: c.method };
  }
  return best;
}

export interface CompanyRow extends Company {
  touch: LastTouch | null;
  daysSince: number | null;
  stale: boolean;
}

export function companyRows(data: Pick<Dataset, 'companies' | 'contacts'>, today: string): CompanyRow[] {
  return data.companies.map((c) => {
    const touch = lastTouch(c, data.contacts);
    const daysSince = touch ? daysBetween(touch.date, today) : null;
    const stale = ACTIVE_STATUS.includes(c.status) && (daysSince === null || daysSince > STALE_DAYS);
    return { ...c, touch, daysSince, stale };
  });
}

export interface Todo {
  key: string;
  companyId: string;
  companyName: string;
  date: string;
  text: string;
  kind: '다음 액션' | '후속조치';
  overdue: boolean;
  contactId?: string;
}

/** 기한이 오늘+N일 이내(지난 것 포함)인 다음 액션과 미완료 후속조치 */
export function todos(data: Pick<Dataset, 'companies' | 'contacts'>, today: string, days = TODO_DAYS): Todo[] {
  const until = addDays(today, days);
  const names = new Map(data.companies.map((c) => [c.id, c]));
  const out: Todo[] = [];
  for (const c of data.companies) {
    if (c.status === '종료' || !c.nextActionDate || day(c.nextActionDate) > until) continue;
    out.push({
      key: `a-${c.id}`, companyId: c.id, companyName: c.name, date: day(c.nextActionDate),
      text: c.nextAction || '다음 액션', kind: '다음 액션', overdue: day(c.nextActionDate) < today,
    });
  }
  for (const k of data.contacts) {
    const company = names.get(k.companyIds[0]);
    if (!company || k.followUpDone || !k.followUpDue || day(k.followUpDue) > until) continue;
    out.push({
      key: `f-${k.id}`, companyId: company.id, companyName: company.name, date: day(k.followUpDue),
      text: k.followUp || k.summary, kind: '후속조치', overdue: day(k.followUpDue) < today, contactId: k.id,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export interface HomeStats {
  managed: number;
  inProgress: number;
  contactsThisMonth: number;
  stale: number;
  insuranceDue: number;
}

export function homeStats(data: Dataset, today: string): HomeStats {
  const rows = companyRows(data, today);
  const month = today.slice(0, 7);
  const live = new Set(data.companies.map((c) => c.id));
  return {
    managed: rows.filter((c) => c.status !== '종료').length,
    inProgress: rows.filter((c) => c.status === '계약·진행').length,
    contactsThisMonth: data.contacts.filter((k) => k.date.slice(0, 7) === month && live.has(k.companyIds[0])).length,
    stale: rows.filter((c) => c.stale).length,
    insuranceDue: insuranceDue(data, today).length,
  };
}

export function insuranceDue(data: Pick<Dataset, 'insurances' | 'companies'>, today: string, days = INSURANCE_ALERT_DAYS) {
  const until = addDays(today, days);
  const live = new Set(data.companies.map((c) => c.id));
  return data.insurances
    .filter((i) => i.maturity && day(i.maturity) >= today && day(i.maturity) <= until)
    .filter((i) => live.has(i.companyIds[0]) && !['해지', '실효'].includes(i.payStatus))
    .sort((a, b) => a.maturity.localeCompare(b.maturity));
}

export interface Filter {
  q: string;
  status: string;
  priority: string;
  task: string;
  staleOnly: boolean;
}

export function filterRows(rows: CompanyRow[], f: Filter): CompanyRow[] {
  const q = f.q.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  return rows.filter((c) => {
    if (f.status && c.status !== f.status) return false;
    if (f.priority && c.priority !== f.priority) return false;
    if (f.task && !c.tasks.includes(f.task)) return false;
    if (f.staleOnly && !c.stale) return false;
    if (!q) return true;
    const hay = [c.name, c.ceo, c.industry, c.address, c.note].join(' ').toLowerCase();
    if (hay.includes(q)) return true;
    // 숫자로 검색하면 사업자번호·전화번호에서도 찾는다
    return digits.length >= 3 && [c.bizNo, c.mobile, c.phone].some((v) => v.replace(/\D/g, '').includes(digits));
  });
}

export type SortKey = 'recent' | 'stale' | 'name' | 'next';

export function sortRows(rows: CompanyRow[], key: SortKey): CompanyRow[] {
  const r = [...rows];
  const lastDate = (c: CompanyRow) => c.touch?.date ?? '';
  switch (key) {
    case 'recent': return r.sort((a, b) => lastDate(b).localeCompare(lastDate(a)));
    case 'stale': return r.sort((a, b) => lastDate(a).localeCompare(lastDate(b)));
    case 'name': return r.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    case 'next':
      return r.sort((a, b) => (a.nextActionDate || '9999').localeCompare(b.nextActionDate || '9999'));
  }
}

/** '오늘', '어제', 'n일 전', 'n일 후' */
export function relDay(date: string, today: string): string {
  const n = daysBetween(date, today);
  if (n === 0) return '오늘';
  if (n === 1) return '어제';
  if (n === -1) return '내일';
  return n > 0 ? `${n}일 전` : `${-n}일 후`;
}

export function won(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e8) return `${(n / 1e8).toFixed(abs >= 1e10 ? 0 : 1).replace(/\.0$/, '')}억원`;
  if (abs >= 1e4) return `${Math.round(n / 1e4).toLocaleString('ko-KR')}만원`;
  return `${n.toLocaleString('ko-KR')}원`;
}

export function fmtDate(s: string): string {
  if (!s) return '—';
  const [y, m, d] = s.slice(0, 10).split('-');
  const t = s.length > 10 ? ` ${s.slice(11, 16)}` : '';
  return `${y}.${m}.${d}${t}`;
}

/* ---------- 할 일(업무관리) ---------- */

export type TaskKind = 'over' | 'today' | 'stale' | 'ins' | 'soon';
export const TASK_LABEL: Record<TaskKind, string> = { over: '지난 일', today: '오늘', stale: '연락 필요', ins: '보험 만기', soon: '예정' };
export type TaskSource = '다음 액션' | '후속조치' | '연락 필요' | '보험 만기';

export interface Task {
  key: string;
  kind: TaskKind;
  source: TaskSource;
  title: string;
  companyId: string;
  companyName: string;
  date: string; // '' = 기한 없음
  detail: string;
  contactId?: string;
}

const kindOf = (date: string, today: string): TaskKind =>
  !date ? 'soon' : day(date) < today ? 'over' : day(date) === today ? 'today' : 'soon';

/**
 * 할 일 = 업체의 다음 액션 + 미완료 후속조치 + 연락이 끊긴 진행 업체 + 90일 내 보험 만기.
 * 별도 할 일 DB 없이 노션에 이미 있는 값에서 계산한다.
 */
export function tasks(data: Pick<Dataset, 'companies' | 'contacts' | 'insurances'>, today: string): Task[] {
  const live = new Map(data.companies.filter((c) => c.status !== '종료').map((c) => [c.id, c]));
  const out: Task[] = [];
  for (const c of live.values()) {
    if (c.nextAction || c.nextActionDate) {
      out.push({
        key: `a-${c.id}`, kind: kindOf(c.nextActionDate, today), source: '다음 액션',
        title: c.nextAction || '다음 액션', companyId: c.id, companyName: c.name,
        date: c.nextActionDate ? day(c.nextActionDate) : '', detail: [c.industry, c.region].filter(Boolean).join(' · '),
      });
    }
  }
  for (const k of data.contacts) {
    const c = live.get(k.companyIds[0]);
    if (!c || !k.followUp || k.followUpDone) continue;
    out.push({
      key: `f-${k.id}`, kind: kindOf(k.followUpDue, today), source: '후속조치', title: k.followUp,
      companyId: c.id, companyName: c.name, date: k.followUpDue ? day(k.followUpDue) : '',
      detail: `${k.method} 접촉(${fmtDate(k.date)}) 후속`, contactId: k.id,
    });
  }
  for (const r of companyRows({ companies: [...live.values()], contacts: data.contacts }, today)) {
    if (!r.stale) continue;
    out.push({
      key: `s-${r.id}`, kind: 'stale', source: '연락 필요',
      title: r.daysSince === null ? '접촉 기록 없음' : `${r.daysSince}일째 연락 없음`,
      companyId: r.id, companyName: r.name, date: '',
      detail: r.touch ? `최근 ${r.touch.method} ${fmtDate(r.touch.date)}` : '첫 접촉을 기록해 주세요',
    });
  }
  for (const i of insuranceDue({ insurances: data.insurances, companies: [...live.values()] }, today)) {
    const c = live.get(i.companyIds[0])!;
    out.push({
      key: `i-${i.id}`, kind: 'ins', source: '보험 만기', title: `${i.product} 만기`,
      companyId: c.id, companyName: c.name, date: day(i.maturity),
      detail: [i.insurer, i.managed ? '채움 관리' : '타사 계약'].filter(Boolean).join(' · '),
    });
  }
  const rank: Record<TaskKind, number> = { over: 0, today: 1, stale: 2, ins: 3, soon: 4 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || (a.date || '9999').localeCompare(b.date || '9999'));
}

export type TaskFilter = 'all' | 'now' | 'stale' | 'ins' | 'soon';
export const TASK_FILTERS: { key: TaskFilter; label: string }[] = [
  { key: 'all', label: '전체' }, { key: 'now', label: '지금' }, { key: 'stale', label: '연락 필요' },
  { key: 'ins', label: '보험 만기' }, { key: 'soon', label: '예정' },
];
export function filterTasks(list: Task[], f: TaskFilter): Task[] {
  if (f === 'all') return list;
  if (f === 'now') return list.filter((t) => t.kind === 'over' || t.kind === 'today');
  return list.filter((t) => t.kind === f);
}

/** '2일 지남' · '오늘' · 'D-3' · '기한 없음' */
export function dueText(date: string, today: string): string {
  if (!date) return '기한 없음';
  const n = daysBetween(today, date);
  return n < 0 ? `${-n}일 지남` : n === 0 ? '오늘' : `D-${n}`;
}

/* ---------- 진행 단계 ---------- */

export const STAGES = ['잠재', '상담중', '계약·진행', '사후관리'] as const;
/** 단계 표시줄용 현재 위치. 종료나 미지정은 -1 */
export const stageIndex = (status: string) => (STAGES as readonly string[]).indexOf(status);

/* ---------- 일정 ---------- */

export type EventType = '다음 액션' | '후속조치' | '보험 만기' | '인증 만료' | '공고 마감';
export interface CalEvent { key: string; date: string; type: EventType; title: string; companyId: string; companyName: string; done: boolean }

export function calendarEvents(data: Pick<Dataset, 'companies' | 'contacts' | 'insurances' | 'certs' | 'matches'>): CalEvent[] {
  const names = new Map(data.companies.map((c) => [c.id, c.name]));
  const out: CalEvent[] = [];
  const push = (key: string, date: string, type: EventType, title: string, companyId: string | undefined, done = false) => {
    if (!date || !companyId || !names.has(companyId)) return;
    out.push({ key, date: day(date), type, title, companyId, companyName: names.get(companyId)!, done });
  };
  for (const c of data.companies) if (c.status !== '종료') push(`a-${c.id}`, c.nextActionDate, '다음 액션', c.nextAction || '다음 액션', c.id);
  for (const k of data.contacts) if (k.followUp) push(`f-${k.id}`, k.followUpDue, '후속조치', k.followUp, k.companyIds[0], k.followUpDone);
  for (const i of data.insurances) if (!['해지', '실효'].includes(i.payStatus)) push(`i-${i.id}`, i.maturity, '보험 만기', `${i.product} 만기`, i.companyIds[0]);
  for (const t of data.certs) if (t.status !== '만료·탈락') push(`t-${t.id}`, t.expires, '인증 만료', `${t.name} 만료`, t.companyIds[0]);
  for (const m of data.matches) if (!['제외', '선정'].includes(m.status)) push(`m-${m.id}`, m.deadline, '공고 마감', `${m.title} 접수 마감`, m.companyIds[0]);
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** 달력 칸: 일요일 시작, 앞뒤 달 날짜 포함 6주 이하 */
export function monthGrid(month: string): string[][] {
  const first = `${month}-01`;
  const start = addDays(first, -new Date(`${first}T00:00:00Z`).getUTCDay());
  const weeks: string[][] = [];
  for (let d = start; weeks.length < 6; ) {
    const w = Array.from({ length: 7 }, (_, i) => addDays(d, i));
    if (weeks.length && w[0].slice(0, 7) !== month) break;
    weeks.push(w);
    d = addDays(d, 7);
  }
  return weeks;
}

export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
export const weekday = (date: string) => WEEKDAYS[new Date(`${day(date)}T00:00:00Z`).getUTCDay()];

/** 전년 대비 증감률(%). 둘 중 하나라도 없거나 0이면 계산하지 않는다 */
export function yoy(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null || prev === 0) return null;
  return Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10;
}
