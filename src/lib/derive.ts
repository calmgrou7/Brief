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
