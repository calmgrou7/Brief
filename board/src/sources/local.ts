// Supabase를 아직 연결하지 않았을 때 보드에서 직접 적는 할 일. 이 브라우저에만 남는다.
import type { EventStatus, OpsEvent } from '../events';

const KEY = 'ops-board.local.v1';

export function loadLocal(): OpsEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OpsEvent[]) : [];
  } catch {
    return [];
  }
}

function save(list: OpsEvent[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 저장 불가(사생활 보호 모드 등)여도 화면은 그대로 동작한다.
  }
}

export function addLocalTask(app: string, title: string): OpsEvent {
  const e: OpsEvent = { id: `local-${Date.now()}`, app, kind: 'task', title, status: 'open', at: new Date().toISOString() };
  save([...loadLocal(), e]);
  return e;
}

/** 예시 데이터 항목도 완료 처리할 수 있게, 없는 id면 상태만 덮어쓸 항목으로 저장한다. */
export function setLocalStatus(target: OpsEvent, status: EventStatus) {
  const list = loadLocal();
  const i = list.findIndex((e) => e.id === target.id);
  if (i >= 0) list[i] = { ...list[i], status };
  else list.push({ ...target, status });
  save(list);
}
