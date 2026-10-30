import Link from 'next/link';
import type { Todo } from '@/lib/derive';
import type { Contact } from '@/lib/schema';
import { fmtDate, relDay } from '@/lib/derive';
import { Icon, METHOD_ICON } from './icons';
import { toggleFollowUp } from '../actions';

export function StatusBadge({ status }: { status: string }) {
  return status ? <span className={`badge s-${status}`}>{status}</span> : null;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return priority ? <span className={`badge p-${priority}`}>우선 {priority}</span> : null;
}

export function MethodIcon({ method }: { method: string }) {
  return <span className="method" title={method}><Icon name={METHOD_ICON[method] ?? 'note'} label={method || '기록'} /></span>;
}

export function DateChip({ date, overdue }: { date: string; overdue?: boolean }) {
  const [, m, d] = date.slice(0, 10).split('-');
  return (
    <span className={`date-chip${overdue ? ' over' : ''}`}>
      <b>{Number(d)}</b><span>{Number(m)}월</span>
    </span>
  );
}

export function TodoList({ items, today, showCompany = true }: { items: Todo[]; today: string; showCompany?: boolean }) {
  if (!items.length) return <p className="empty">이번 주 예정된 할 일이 없습니다.</p>;
  return (
    <ul className="list">
      {items.map((t) => (
        <li key={t.key}>
          <div className="item">
            <DateChip date={t.date} overdue={t.overdue} />
            <Link href={`/companies/${t.companyId}`} className="item-main" style={{ textDecoration: 'none' }}>
              <div className="item-title">{t.text}</div>
              <div className="item-sub">
                {t.overdue ? <b style={{ color: 'var(--bad)' }}>{relDay(t.date, today).replace('전', '지남')}</b> : relDay(t.date, today)} · {t.kind}{showCompany && <> · {t.companyName}</>}
              </div>
            </Link>
            {t.contactId && (
              <form action={toggleFollowUp}>
                <input type="hidden" name="contactId" value={t.contactId} />
                <input type="hidden" name="done" value="1" />
                <button className="btn sm" title="완료 처리"><Icon name="check" />완료</button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ContactLine({ c, today, companyName }: { c: Contact; today: string; companyName?: string }) {
  return (
    <div className="item">
      <MethodIcon method={c.method} />
      <div className="item-main">
        <div className="item-title">{c.summary}</div>
        <div className="item-sub">{companyName ? `${companyName} · ` : ''}{c.method} · {fmtDate(c.date)}</div>
      </div>
      <span className="item-side">{relDay(c.date, today)}</span>
    </div>
  );
}
