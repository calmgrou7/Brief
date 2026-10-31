import type { Metadata } from 'next';
import Link from 'next/link';
import { getData } from '@/lib/repo';
import { calendarEvents, dueText, monthGrid, shiftMonth, todayKST, weekday, type CalEvent } from '@/lib/derive';
import { Icon } from '../../ui/icons';
import { EmptyState } from '../../ui/bits';

export const metadata: Metadata = { title: '일정' };

const TYPE_ICON = { '다음 액션': 'tasks', '후속조치': 'note', '보험 만기': 'shield', '인증 만료': 'check', '공고 마감': 'file' } as const;

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  const sp = await searchParams;
  const today = todayKST();
  const month = /^\d{4}-\d{2}$/.test(sp.m ?? '') ? sp.m! : today.slice(0, 7);
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? '') ? sp.d! : month === today.slice(0, 7) ? today : `${month}-01`;
  const data = await getData();
  const events = calendarEvents(data);
  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) (byDay.get(e.date) ?? byDay.set(e.date, []).get(e.date)!).push(e);
  const weeks = monthGrid(month);
  const dayList = byDay.get(selected) ?? [];
  const upcoming = events.filter((e) => e.date >= today && !e.done).slice(0, 8);
  const [y, m] = month.split('-').map(Number);
  const href = (mm: string, d?: string) => `/schedule?m=${mm}${d ? `&d=${d}` : ''}`;

  return (
    <>
      <div className="page-head">
        <div><h1>일정</h1><p>다음 액션·후속조치·보험 만기·인증 만료·공고 마감을 날짜별로 봅니다.</p></div>
      </div>
      <div className="sched-grid">
        <section className="cal" aria-label={`${y}년 ${m}월 달력`}>
          <div className="cal-head">
            <Link href={href(shiftMonth(month, -1))} className="btn sm ghost" aria-label="이전 달"><Icon name="back" /></Link>
            <h2>{y}년 {m}월</h2>
            <div className="row" style={{ gap: 4 }}>
              {month !== today.slice(0, 7) && <Link href="/schedule" className="btn sm">오늘</Link>}
              <Link href={href(shiftMonth(month, 1))} className="btn sm ghost" aria-label="다음 달"><Icon name="chevron" /></Link>
            </div>
          </div>
          <div className="cal-grid">
            {['일', '월', '화', '수', '목', '금', '토'].map((w) => <span key={w} className="wd" aria-hidden>{w}</span>)}
            {weeks.flat().map((d) => {
              const ev = byDay.get(d) ?? [];
              const open = ev.filter((e) => !e.done);
              return (
                <Link key={d} href={href(month, d)} scroll={false}
                  className={`cal-day${d.slice(0, 7) !== month ? ' out' : ''}${d === today ? ' today' : ''}`}
                  aria-current={d === selected ? 'date' : undefined}
                  aria-label={`${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일 ${weekday(d)}요일${open.length ? `, 일정 ${open.length}건` : ''}`}>
                  <span className="d">{Number(d.slice(8))}</span>
                  <span className="dots" aria-hidden>
                    {open.slice(0, 3).map((e) => <i key={e.key} className={`t-${e.type.replace(' ', '')}${d < today ? ' over' : ''}`} />)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="stack" style={{ gap: 16 }}>
          <section className="card" aria-live="polite">
            <div className="card-head"><h2>{Number(selected.slice(5, 7))}월 {Number(selected.slice(8))}일 {weekday(selected)}요일</h2><span className="small muted">{dueText(selected, today)}</span></div>
            {dayList.length === 0 ? <EmptyState icon="calendar" title="이 날은 일정이 없습니다">하단의 등록 → ‘할 일·일정’으로 업체의 다음 액션 날짜를 정하면 여기에 표시됩니다.</EmptyState> : <EventList events={dayList} />}
          </section>
          <section className="card">
            <div className="card-head"><h2>다가오는 일정</h2></div>
            {upcoming.length === 0 ? <EmptyState icon="calendar" title="예정된 일정이 없습니다" /> : <EventList events={upcoming} showDate today={today} />}
          </section>
        </div>
      </div>
    </>
  );
}

function EventList({ events, showDate, today }: { events: CalEvent[]; showDate?: boolean; today?: string }) {
  return (
    <ul className="feed">
      {events.map((e) => (
        <li key={e.key}>
          <Link href={`/companies/${e.companyId}${e.type === '다음 액션' ? '?next=1' : e.type === '보험 만기' ? '?tab=insurance' : e.type === '후속조치' ? '?tab=contacts' : e.type === '인증 만료' ? '?tab=certs' : '?tab=matches'}`} className="item">
            <span className="method"><Icon name={TYPE_ICON[e.type]} /></span>
            <span className="item-main">
              <span className="item-title" style={{ display: 'block', textDecoration: e.done ? 'line-through' : undefined }}>{e.title}</span>
              <span className="item-sub" style={{ display: 'block' }}>{e.companyName} · {e.type}{e.done ? ' · 완료' : ''}</span>
            </span>
            {showDate && today && <span className="item-side">{Number(e.date.slice(5, 7))}/{Number(e.date.slice(8))}<br />{dueText(e.date, today)}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
