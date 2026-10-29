import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EventKind, EventStatus, OpsEvent } from '../events';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;

interface Row {
  id: string;
  app: string;
  kind: EventKind;
  title: string;
  client: string | null;
  status: EventStatus;
  amount: number | null;
  link: string | null;
  at: string;
}

function fromRow(r: Row): OpsEvent {
  return {
    id: r.id,
    app: r.app,
    kind: r.kind,
    title: r.title,
    client: r.client ?? undefined,
    status: r.status,
    amount: r.amount ?? undefined,
    link: r.link ?? undefined,
    at: r.at,
  };
}

/** 최근 90일 + 아직 열린 항목. 보드가 보여주는 범위는 이걸로 충분하다. */
export async function fetchEvents(): Promise<OpsEvent[]> {
  if (!supabase) return [];
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('ops_events')
    .select('id,app,kind,title,client,status,amount,link,at')
    .or(`at.gte.${since},status.eq.open`)
    .order('at', { ascending: false })
    .limit(2000);
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function addTask(app: string, title: string): Promise<OpsEvent> {
  if (!supabase) throw new Error('Supabase 미연결');
  const { data, error } = await supabase
    .from('ops_events')
    .insert({ app, kind: 'task', title, status: 'open' })
    .select('id,app,kind,title,client,status,amount,link,at')
    .single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function setStatus(id: string, status: EventStatus): Promise<void> {
  if (!supabase) throw new Error('Supabase 미연결');
  const { error } = await supabase.from('ops_events').update({ status }).eq('id', id);
  if (error) throw error;
}
