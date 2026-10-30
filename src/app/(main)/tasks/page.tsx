import type { Metadata } from 'next';
import Link from 'next/link';
import { getData } from '@/lib/repo';
import { filterTasks, TASK_FILTERS, tasks, todayKST, weekday, type TaskFilter } from '@/lib/derive';
import { TaskList } from '../../ui/bits';

export const metadata: Metadata = { title: '할 일' };

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const filter: TaskFilter = TASK_FILTERS.some((x) => x.key === f) ? (f as TaskFilter) : 'all';
  const data = await getData();
  const today = todayKST();
  const all = tasks(data, today);
  const shown = filterTasks(all, filter);
  const [, m, d] = today.split('-');
  const label = TASK_FILTERS.find((x) => x.key === filter)!.label;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>할 일</h1>
          <p>{Number(m)}월 {Number(d)}일 {weekday(today)}요일 · 급한 순서(지난 일 → 오늘 → 연락 필요 → 보험 만기 → 예정)</p>
        </div>
      </div>
      <nav className="chips" aria-label="할 일 거르기" style={{ marginBottom: 14 }}>
        {TASK_FILTERS.map((x) => (
          <Link key={x.key} href={x.key === 'all' ? '/tasks' : `/tasks?f=${x.key}`} className="chip" aria-current={filter === x.key ? 'page' : undefined}>
            {x.label} <span className="n">{filterTasks(all, x.key).length}</span>
          </Link>
        ))}
      </nav>
      <section className="card" aria-label={`${label} 할 일`}>
        <TaskList items={shown} today={today} emptyText={filter === 'all' ? '처리할 일이 없습니다' : `‘${label}’에 해당하는 일이 없습니다`} />
      </section>
      <p className="small muted" style={{ marginTop: 12 }}>
        할 일은 업체의 다음 액션, 접촉 기록의 후속조치, {`30일 넘게 연락하지 않은 진행 업체`}, 90일 안의 보험 만기에서 자동으로 모입니다.
        다음 액션을 완료하면 비워지므로 업체 화면에서 새 다음 액션을 정해 주세요.
      </p>
    </>
  );
}
