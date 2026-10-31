import Link from 'next/link';
import { getData } from '@/lib/repo';
import { byNewest, homeStats, INSURANCE_ALERT_DAYS, STALE_DAYS, tasks, todayKST, weekday } from '@/lib/derive';
import { Icon } from '../ui/icons';
import { ActivityRow, EmptyState, MetricCard, TaskList } from '../ui/bits';

export default async function Home() {
  const data = await getData();
  const today = todayKST();
  const list = tasks(data, today);
  const over = list.filter((t) => t.kind === 'over').length;
  const todayN = list.filter((t) => t.kind === 'today').length;
  const stale = list.filter((t) => t.kind === 'stale').length;
  const s = homeStats(data, today);
  const names = new Map(data.companies.map((c) => [c.id, c.name]));
  const recent = [...data.contacts]
    .filter((c) => names.has(c.companyIds[0]) && c.date)
    .sort(byNewest)
    .slice(0, 5);
  const priority = list.filter((t) => t.kind !== 'soon').slice(0, 5);
  const [, m, d] = today.split('-');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>오늘의 업무</h1>
          <p>{Number(m)}월 {Number(d)}일 {weekday(today)}요일 · {over + todayN ? `처리할 일 ${over + todayN}건이 있습니다` : '오늘 급한 일은 없습니다'}</p>
        </div>
      </div>

      <section className="today-strip" aria-label="오늘 요약">
        <Link href="/tasks?f=now" className="today-item today"><span>오늘 처리할 일</span><b>{todayN}<small>건</small></b></Link>
        <Link href="/tasks?f=now" className="today-item over"><span>지난 일</span><b>{over}<small>건</small></b></Link>
        <Link href="/tasks?f=stale" className="today-item stale"><span>연락 필요 업체</span><b>{stale}<small>곳</small></b></Link>
      </section>

      <nav className="quick" aria-label="빠른 작업">
        <Link href="/companies"><span className="qi c1"><Icon name="building" /></span>업체 관리</Link>
        <Link href="/companies?status=계약·진행"><span className="qi c2"><Icon name="chart" /></span>진행 현황</Link>
        <Link href="/schedule"><span className="qi c3"><Icon name="calendar" /></span>일정</Link>
        <Link href="/tasks?f=stale"><span className="qi c4"><Icon name="phone" /></span>연락 필요</Link>
      </nav>

      <div className="home-grid">
        <div className="home-col">
          <section className="card" aria-labelledby="h-priority">
            <div className="card-head">
              <h2 id="h-priority">우선 처리할 일 <span className="count">{list.filter((t) => t.kind !== 'soon').length}</span></h2>
              <Link href="/tasks">전체 보기<Icon name="chevron" /></Link>
            </div>
            <TaskList items={priority} today={today} emptyText="급하게 처리할 일이 없습니다" />
          </section>
        </div>

        <div className="home-col">
          <section className="metrics" aria-label="핵심 지표">
            <MetricCard label="관리 업체" value={s.managed} unit="곳" note="종료 업체 제외" href="/companies" />
            <MetricCard label="이번 달 접촉" value={s.contactsThisMonth} unit="회" note="방문·전화·문자·이메일·화상" />
            <MetricCard label={`${STALE_DAYS}일 이상 미접촉`} value={s.stale} unit="곳" note="상담중·계약·사후관리 업체" href="/tasks?f=stale" alert />
            <MetricCard label={`보험 만기 ${INSURANCE_ALERT_DAYS}일`} value={s.insuranceDue} unit="건" note="해지·실효 제외" href="/tasks?f=ins" />
          </section>

          <section className="card" aria-labelledby="h-recent">
            <div className="card-head"><h2 id="h-recent">최근 활동</h2></div>
            {recent.length === 0 ? <EmptyState icon="note" title="아직 접촉 기록이 없습니다">하단의 등록 버튼으로 첫 기록을 남겨 보세요.</EmptyState> : (
              <ul className="feed">
                {recent.map((c) => <li key={c.id}><ActivityRow c={c} today={today} companyName={names.get(c.companyIds[0])} /></li>)}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
