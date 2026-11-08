import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Goal, Task } from '@/lib/types';

/** 로컬 날짜 YYYY-MM-DD */
export function today(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 서버가 무료 한도 초과로 거절했을 때 */
export class FreeLimitError extends Error {
  constructor(message = '무료 플랜 한도에 도달했어요.') {
    super(message);
  }
}

function raise(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.message.includes('FREE_GOAL_LIMIT')) throw new FreeLimitError('무료 플랜은 목표 3개까지 만들 수 있어요.');
  throw new Error(error.message);
}

// ── 목표 ─────────────────────────────
export async function listGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('id,title,due_date,status,created_at')
    .neq('status', 'archived')
    .order('created_at', { ascending: false });
  raise(error);
  return data ?? [];
}

export async function getGoal(id: string): Promise<Goal | null> {
  const { data, error } = await supabase.from('goals').select('id,title,due_date,status,created_at').eq('id', id).maybeSingle();
  raise(error);
  return data;
}

export async function createGoal(title: string, dueDate: string | null): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .insert({ title, due_date: dueDate })
    .select('id,title,due_date,status,created_at')
    .single();
  raise(error);
  return data!;
}

export async function archiveGoal(id: string) {
  const { error } = await supabase.from('goals').update({ status: 'archived' }).eq('id', id);
  raise(error);
}

// ── 할 일 ────────────────────────────
const TASK_COLS = 'id,goal_id,title,minutes,position,done_at,focus_date';

export async function listTasks(goalId: string): Promise<Task[]> {
  const { data, error } = await supabase.from('tasks').select(TASK_COLS).eq('goal_id', goalId).order('position');
  raise(error);
  return data ?? [];
}

export async function addTask(goalId: string, title: string, position: number) {
  const { error } = await supabase.from('tasks').insert({ goal_id: goalId, title, position });
  raise(error);
}

export async function setTaskDone(id: string, done: boolean) {
  const { error } = await supabase.from('tasks').update({ done_at: done ? new Date().toISOString() : null }).eq('id', id);
  raise(error);
}

export async function setTaskFocus(id: string, date: string | null) {
  const { error } = await supabase.from('tasks').update({ focus_date: date }).eq('id', id);
  raise(error);
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  raise(error);
}

/** 오늘의 DO 3 (+ 완료하지 못한 지난 포커스는 오늘로 이월해서 보여줌) */
export async function listFocus(date = today()): Promise<(Task & { goal_title: string })[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`${TASK_COLS}, goals!inner(title,status)`)
    .lte('focus_date', date)
    .or(`done_at.is.null,focus_date.eq.${date}`)
    .neq('goals.status', 'archived')
    .order('focus_date')
    .order('position');
  raise(error);
  return (data ?? []).map((row: any) => ({ ...row, goal_title: row.goals?.title ?? '' }));
}

/** 연속 실행일 (서버 함수) */
export async function getStreak(): Promise<number> {
  const { data, error } = await supabase.rpc('current_streak', { tz_today: today() });
  raise(error);
  return (data as number) ?? 0;
}

export type WeeklyReport = {
  days: { date: string; done: number }[];
  done_total: number;
  prev_done_total: number;
  focus_planned: number;
  focus_done: number;
  minutes_done: number;
  best_hour: number | null;
  top_goals: { title: string; done: number }[];
};

/** 최근 7일 실행 리포트 (서버 함수, RLS 적용) */
export async function getWeeklyReport(): Promise<WeeklyReport> {
  const { data, error } = await supabase.rpc('weekly_report', { tz_today: today() });
  raise(error);
  return data as WeeklyReport;
}

// ── AI 목표 쪼개기 ───────────────────
export async function breakdownGoal(goalId: string): Promise<{ created: number; remaining: number | null }> {
  const { data, error } = await supabase.functions.invoke('ai-breakdown', { body: { goal_id: goalId } });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => ({}));
      if (body?.code === 'FREE_LIMIT') throw new FreeLimitError(body.message);
      throw new Error(body?.message ?? 'AI 쪼개기에 실패했어요.');
    }
    throw new Error(error.message);
  }
  return data;
}

// ── 계정 ─────────────────────────────
export async function deleteMyAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) throw new Error('탈퇴 처리에 실패했어요. 잠시 후 다시 시도해 주세요.');
  await supabase.auth.signOut();
}
