/*
 * 데이터 계층 (로컬 모드).
 * 로컬(데모) 모드 저장소. 화면은 src/lib/api 를 통해서만 접근하며,
 * 서버 모드는 src/lib/api/supabase.ts 가 담당합니다.
 */
import type { CommunityProblem, DuelRecord, Problem, User } from '../types';
import { PROBLEMS } from '../data/problems';
import { REVIEW_THRESHOLD, mulberry32, TIER_BASE_RATING } from './game';

const K = {
  users: 'mg.users',
  session: 'mg.session',
  community: 'mg.community',
  duels: 'mg.duels',
  lang: 'mg.lang',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full / blocked */ }
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

async function hash(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((x) => x.toString(16).padStart(2, '0')).join('');
}

/* ───────── 사용자 · 인증 ───────── */
export const listUsers = (): User[] => read<User[]>(K.users, []);
export const getUser = (id: string) => listUsers().find((u) => u.id === id) ?? null;

export function saveUser(user: User) {
  const users = listUsers();
  const i = users.findIndex((u) => u.id === user.id);
  if (i >= 0) users[i] = user; else users.push(user);
  write(K.users, users);
}

export function updateUser(id: string, fn: (u: User) => User): User | null {
  const u = getUser(id);
  if (!u) return null;
  const next = fn(structuredClone(u));
  saveUser(next);
  return next;
}

export async function signUp(username: string, email: string, password: string): Promise<User> {
  const users = listUsers();
  const e = email.trim().toLowerCase();
  const n = username.trim();
  if (users.some((u) => u.email === e || u.username.toLowerCase() === n.toLowerCase())) throw new Error('exists');
  const salt = uid();
  const user: User = {
    id: uid(), username: n, email: e, salt, passHash: await hash(password, salt), createdAt: Date.now(),
    xp: 0, rating: 1200, solved: {}, misses: {}, totalAttempts: 0, totalCorrect: 0,
    streak: { count: 0, lastDay: '' }, duels: { w: 0, l: 0, d: 0 }, approvedCount: 0,
  };
  saveUser(user);
  write(K.session, user.id);
  return user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const u = listUsers().find((x) => x.email === email.trim().toLowerCase());
  if (!u || !u.salt || (await hash(password, u.salt)) !== u.passHash) throw new Error('invalid');
  write(K.session, u.id);
  return u;
}

export const signOut = () => { try { localStorage.removeItem(K.session); } catch { /* noop */ } };
export const sessionUser = () => { const id = read<string | null>(K.session, null); return id ? getUser(id) : null; };

/* ───────── 언어 ───────── */
export const loadLang = () => read<'ko' | 'en' | null>(K.lang, null);
export const saveLang = (l: 'ko' | 'en') => write(K.lang, l);

/* ───────── 문제 ───────── */
export const listCommunity = (): CommunityProblem[] => read<CommunityProblem[]>(K.community, []);
const saveCommunity = (list: CommunityProblem[]) => write(K.community, list);

export function allProblems(): Problem[] {
  return [...PROBLEMS, ...listCommunity().filter((p) => p.status === 'approved')];
}
export const findProblem = (id: string) => allProblems().find((p) => p.id === id) ?? null;

export function submitCommunity(p: Omit<CommunityProblem, 'id' | 'status' | 'createdAt' | 'votes' | 'rating'>) {
  const list = listCommunity();
  const item: CommunityProblem = {
    ...p, id: `c-${uid()}`, status: 'pending', createdAt: Date.now(), votes: {}, rating: TIER_BASE_RATING[p.tier],
  };
  list.unshift(item);
  saveCommunity(list);
  return item;
}

/** 투표 후 상태가 바뀌면 출제자 보상까지 처리. 반환: 갱신된 문제 */
export function voteCommunity(problemId: string, voterId: string, approve: boolean, comment: string) {
  const list = listCommunity();
  const p = list.find((x) => x.id === problemId);
  if (!p || p.status !== 'pending' || p.authorId === voterId) return null;
  p.votes[voterId] = { approve, comment, at: Date.now() };
  const net = Object.values(p.votes).reduce((s, v) => s + (v.approve ? 1 : -1), 0);
  if (net >= REVIEW_THRESHOLD) {
    p.status = 'approved';
    if (p.authorId) updateUser(p.authorId, (u) => ({ ...u, xp: u.xp + 100, approvedCount: u.approvedCount + 1 }));
  } else if (net <= -REVIEW_THRESHOLD) {
    p.status = 'rejected';
  }
  saveCommunity(list);
  return p;
}

/* ───────── 대결 기록 ───────── */
export const listDuels = (userId: string): DuelRecord[] => read<DuelRecord[]>(K.duels, []).filter((d) => d.userId === userId);
export function addDuel(d: Omit<DuelRecord, 'id' | 'at'>) {
  const all = read<DuelRecord[]>(K.duels, []);
  all.unshift({ ...d, id: uid(), at: Date.now() });
  write(K.duels, all.slice(0, 500));
}

/* ───────── 랭킹용 시드 플레이어 ─────────
 * 첫 실행에도 리더보드가 비어 보이지 않도록 고정된 가상의 플레이어를 둡니다. */
export interface BoardEntry { id: string; name: string; rating: number; xp: number; approved: number; isBot: boolean }

const BOT_NAMES = [
  'Noether_fan', '리만가설', 'EulerLine', '갈루아의밤', 'Ramanujan_q', '힐베르트23', 'GaussSum', '칸토어집합',
  'Hardy_Little', '페르마의여백', 'Poincare3', '오일러상수', 'Grothendieck', '코시수열', 'Erdos_No2', '라그랑주',
  'TaoAnalysis', '디리클레', 'Abel_Prize', '르베그측도', 'Lie_E8', '피보나치', 'Banach_T', '푸앵카레',
];
export const BOTS: BoardEntry[] = BOT_NAMES.map((name, i) => {
  const r = mulberry32(i * 7919 + 17);
  const rating = Math.round(1050 + r() * 1150);
  return {
    id: `bot-${i}`, name, rating,
    xp: Math.round((rating - 900) * (3 + r() * 6)),
    approved: rating > 1800 ? Math.floor(r() * 14) : 0,
    isBot: true,
  };
});

export function leaderboard(): BoardEntry[] {
  return [
    ...BOTS,
    ...listUsers().map((u) => ({ id: u.id, name: u.username, rating: u.rating, xp: u.xp, approved: u.approvedCount, isBot: false })),
  ];
}
