'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { COOKIE, MAX_AGE, passwordMatches, sign, verify } from '@/lib/session';
import {
  addContact, createCompany, deleteCompany, deleteLink, getData, saveLink, setFollowUpDone, updateCompany,
  type CompanyInput,
} from '@/lib/repo';
import { NotionError } from '@/lib/notion';
import { normalizeBizNo } from '@/lib/derive';
import { INTERESTS, METHODS, STATUS, TASKS } from '@/lib/schema';

export interface FormState { error?: string; ok?: string }

async function guard() {
  // 미들웨어를 우회한 직접 호출에도 로그인 확인
  if (!(await verify((await cookies()).get(COOKIE)?.value))) redirect('/login');
}

function friendly(e: unknown): string {
  if (e instanceof NotionError) {
    if (e.status === 401) return '노션 토큰이 올바르지 않습니다. NOTION_TOKEN을 확인해 주세요.';
    if (e.status === 404) return '노션 데이터베이스에 접근할 수 없습니다. 통합(Integration)에 채움기업컨설팅관리대시보드 페이지를 연결해 주세요.';
    if (e.code === 'validation_error') return `노션이 값을 거부했습니다: ${e.message}`;
    return `노션 오류(${e.status}): ${e.message}`;
  }
  return e instanceof Error ? e.message : '알 수 없는 오류';
}

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const num = (f: FormData, k: string) => {
  const s = str(f, k).replace(/[,\s원]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const list = (f: FormData, k: string, allowed: readonly string[]) =>
  f.getAll(k).map(String).filter((v) => allowed.includes(v));

/** datetime-local(한국 시간) → 노션 날짜. 시간이 없으면 날짜만 */
const kstDate = (s: string) => (s.length > 10 ? `${s.slice(0, 16)}:00+09:00` : s);

/* ---------- 로그인 ---------- */

export async function login(_: FormState, f: FormData): Promise<FormState> {
  if (!(await passwordMatches(str(f, 'password')))) {
    // 무차별 대입을 늦춘다
    await new Promise((r) => setTimeout(r, 600));
    return { error: '비밀번호가 맞지 않습니다.' };
  }
  const token = await sign();
  if (!token) return { error: '서버에 SESSION_SECRET(32자 이상)이 설정되지 않았습니다.' };
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: MAX_AGE,
  });
  const next = str(f, 'next');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect('/login');
}

/* ---------- 동기화 ---------- */

export async function refresh() {
  await guard();
  await getData(true);
  revalidatePath('/', 'layout');
}

/* ---------- 업체 ---------- */

function companyFromForm(f: FormData): CompanyInput | string {
  const name = str(f, 'name');
  if (!name) return '기업명을 입력해 주세요.';
  const bizNo = normalizeBizNo(str(f, 'bizNo'));
  if (bizNo === null) return '사업자등록번호는 숫자 10자리입니다.';
  const status = str(f, 'status');
  return {
    name, bizNo,
    status: (STATUS as readonly string[]).includes(status) ? status : '잠재',
    priority: str(f, 'priority'), corpNo: str(f, 'corpNo'), ceo: str(f, 'ceo'),
    mobile: str(f, 'mobile'), phone: str(f, 'phone'), email: str(f, 'email'), address: str(f, 'address'),
    region: str(f, 'region'), entity: str(f, 'entity'), industry: str(f, 'industry'), founded: str(f, 'founded'),
    employees: num(f, 'employees'), revenue: num(f, 'revenue'),
    tasks: list(f, 'tasks', TASKS), interests: list(f, 'interests', INTERESTS),
    interestMemo: str(f, 'interestMemo'), plannedSolution: str(f, 'plannedSolution'), nextGoal: str(f, 'nextGoal'),
    nextAction: str(f, 'nextAction'), nextActionDate: str(f, 'nextActionDate'),
    source: str(f, 'source') || '직접입력', webappId: str(f, 'webappId'), note: str(f, 'note'),
  };
}

export async function saveCompany(_: FormState, f: FormData): Promise<FormState> {
  await guard();
  const input = companyFromForm(f);
  if (typeof input === 'string') return { error: input };
  const id = str(f, 'id');
  let target = id;
  try {
    const { companies } = await getData();
    if (input.bizNo) {
      const dup = companies.find((c) => c.bizNo === input.bizNo && c.id !== id);
      if (dup) return { error: `같은 사업자등록번호로 이미 등록된 업체가 있습니다: ${dup.name}` };
    }
    if (id) await updateCompany(id, input);
    else target = await createCompany(input);
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath('/', 'layout');
  redirect(`/companies/${target}?saved=1`);
}

export async function removeCompany(f: FormData) {
  await guard();
  await deleteCompany(str(f, 'id'));
  revalidatePath('/', 'layout');
  redirect('/admin?deleted=1');
}

/* ---------- 접촉 기록 ---------- */

export async function logContact(_: FormState, f: FormData): Promise<FormState> {
  await guard();
  const companyId = str(f, 'companyId');
  const method = str(f, 'method');
  if (!(METHODS as readonly string[]).includes(method)) return { error: '방법(방문·전화·문자 등)을 골라 주세요.' };
  const when = str(f, 'date');
  if (!when) return { error: '일시를 입력해 주세요.' };
  const content = str(f, 'content');
  const summary = str(f, 'summary') || content.split('\n')[0].slice(0, 60) || `${method} 접촉`;
  try {
    await addContact({
      summary, companyIds: [companyId], date: kstDate(when), method,
      direction: str(f, 'direction') || '발신', counterpart: str(f, 'counterpart'), content,
      detectedInterest: str(f, 'detectedInterest'), followUp: str(f, 'followUp'),
      followUpDue: str(f, 'followUpDue'), followUpDone: false,
    });
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath('/', 'layout');
  return { ok: `${method} 기록을 저장했습니다.` };
}

export async function toggleFollowUp(f: FormData) {
  await guard();
  await setFollowUpDone(str(f, 'contactId'), str(f, 'done') === '1');
  revalidatePath('/', 'layout');
}

/* ---------- 할 일 ---------- */

/** 할 일 완료: 후속조치는 '후속완료' 체크, 다음 액션은 비워서 새 다음 액션을 정할 수 있게 한다 */
export async function completeTask(_: FormState, f: FormData): Promise<FormState> {
  await guard();
  const kind = str(f, 'kind');
  try {
    if (kind === 'followup') await setFollowUpDone(str(f, 'contactId'), true);
    else if (kind === 'action') await updateCompany(str(f, 'companyId'), { nextAction: '', nextActionDate: '' });
    else return { error: '완료할 수 없는 항목입니다.' };
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath('/', 'layout');
  return { ok: '완료했습니다.' };
}

export async function saveNextAction(_: FormState, f: FormData): Promise<FormState> {
  await guard();
  const nextAction = str(f, 'nextAction');
  const nextActionDate = str(f, 'nextActionDate');
  if (!nextAction) return { error: '다음에 할 일을 입력해 주세요.' };
  if (nextActionDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextActionDate)) return { error: '날짜 형식이 올바르지 않습니다.' };
  try {
    await updateCompany(str(f, 'companyId'), { nextAction, nextActionDate });
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath('/', 'layout');
  return { ok: '다음 액션을 저장했습니다.' };
}

/* ---------- 연계 대시보드 링크 ---------- */

export async function saveDashLink(_: FormState, f: FormData): Promise<FormState> {
  await guard();
  const name = str(f, 'name');
  const href = str(f, 'href');
  if (!name) return { error: '이름을 입력해 주세요.' };
  try {
    const u = new URL(href);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
  } catch {
    return { error: '주소는 https://로 시작하는 웹 주소여야 합니다.' };
  }
  try {
    await saveLink(str(f, 'id') || null, {
      name, href, desc: str(f, 'desc'), order: num(f, 'order'), newTab: f.get('newTab') === 'on',
    });
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath('/', 'layout');
  return { ok: '저장했습니다.' };
}

export async function removeDashLink(f: FormData) {
  await guard();
  await deleteLink(str(f, 'id'));
  revalidatePath('/', 'layout');
}
