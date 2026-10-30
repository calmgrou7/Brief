import Link from 'next/link';
import type { Contact } from '@/lib/schema';
import { dueText, fmtDate, relDay, stageIndex, STAGES, telHref, TASK_LABEL, type Task } from '@/lib/derive';
import { Icon, METHOD_ICON, type IconName } from './icons';
import { DoneButton } from './DoneButton';

export function StatusBadge({ status }: { status: string }) {
  return status ? <span className={`badge s-${status}`}>{status}</span> : null;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return priority ? <span className={`badge p-${priority}`}>우선 {priority}</span> : null;
}

export function MethodIcon({ method }: { method: string }) {
  return <span className={`method m-${method}`} title={method}><Icon name={METHOD_ICON[method] ?? 'note'} label={method || '기록'} /></span>;
}

export function DateChip({ date }: { date: string }) {
  const [, m, d] = date.slice(0, 10).split('-');
  return <span className="date-chip"><b>{Number(d)}</b><span>{Number(m)}월</span></span>;
}

export function EmptyState({ icon = 'check', title, children }: { icon?: IconName; title: string; children?: React.ReactNode }) {
  return <div className="empty"><Icon name={icon} /><b>{title}</b>{children}</div>;
}

export function MetricCard({ label, value, unit, note, href, alert }: { label: string; value: number; unit: string; note?: string; href?: string; alert?: boolean }) {
  const body = (
    <>
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}<small>{unit}</small></span>
      {note && <span className="metric-note">{note}</span>}
    </>
  );
  const cls = `metric${alert && value > 0 ? ' alert' : ''}`;
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** 할 일 한 줄: 작업명 → 연결 업체 → 기한·상태, 오른쪽에 기록/완료 */
export function TaskRow({ t, today, showCompany = true }: { t: Task; today: string; showCompany?: boolean }) {
  const canDone = t.source === '다음 액션' || t.source === '후속조치';
  return (
    <li className={`task k-${t.kind}`}>
      <Link href={`/companies/${t.companyId}${t.source === '보험 만기' ? '?tab=insurance' : ''}`} className="task-main">
        <span className="task-title">{t.title}</span>
        {showCompany && <span className="task-co">{t.companyName}{t.detail ? ` · ${t.detail}` : ''}</span>}
        <span className="task-meta">
          <span className={`badge k-${t.kind}`}>{TASK_LABEL[t.kind]}</span>
          {t.date && <span className="due">{dueText(t.date, today)}</span>}
          {t.date && <span>{fmtDate(t.date)}</span>}
          <span>· {t.source}</span>
        </span>
      </Link>
      <div className="task-acts">
        <Link href={`/companies/${t.companyId}?log=1`} className="btn sm" aria-label={`${t.companyName} 접촉 기록`}><Icon name="note" />기록</Link>
        {canDone && <DoneButton kind={t.source === '후속조치' ? 'followup' : 'action'} companyId={t.companyId} contactId={t.contactId} title={t.title} />}
      </div>
    </li>
  );
}

export function TaskList({ items, today, showCompany = true, emptyText = '처리할 일이 없습니다.' }: { items: Task[]; today: string; showCompany?: boolean; emptyText?: string }) {
  if (!items.length) return <EmptyState title={emptyText} />;
  return <ul className="task-list">{items.map((t) => <TaskRow key={t.key} t={t} today={today} showCompany={showCompany} />)}</ul>;
}

export function ActivityRow({ c, today, companyName }: { c: Contact; today: string; companyName?: string }) {
  return (
    <Link href={`/companies/${c.companyIds[0]}?tab=contacts`} className="item">
      <MethodIcon method={c.method} />
      <span className="item-main">
        <span className="item-title" style={{ display: 'block' }}>{c.summary}</span>
        <span className="item-sub" style={{ display: 'block' }}>{companyName ? `${companyName} · ` : ''}{c.method || '기록'}</span>
      </span>
      <span className="item-side">{c.date ? relDay(c.date, today) : '-'}</span>
    </Link>
  );
}

/** 잠재 → 상담중 → 계약·진행 → 사후관리. 종료는 별도 문구 */
export function CompanyProgress({ status }: { status: string }) {
  const at = stageIndex(status);
  return (
    <div className="stack" style={{ gap: 6 }}>
      <ol className="stepper" aria-label={`진행 단계: ${status || '미지정'}`}>
        {STAGES.map((s, i) => (
          <li key={s} className={i < at ? 'done' : i === at ? 'now' : ''} aria-current={i === at ? 'step' : undefined}>{s}</li>
        ))}
      </ol>
      {at < 0 && <p className="stepper-note">{status === '종료' ? '관리가 종료된 업체입니다.' : '진행 단계가 지정되지 않았습니다.'}</p>}
    </div>
  );
}

export function PhoneLink({ value }: { value: string }) {
  return value ? <a href={telHref(value)}>{value}</a> : <>-</>;
}
