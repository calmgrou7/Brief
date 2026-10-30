import Link from 'next/link';
import { getData } from '@/lib/repo';
import { companyRows, fmtDate, homeStats, insuranceDue, relDay, STALE_DAYS, todayKST, todos, won } from '@/lib/derive';
import { ContactLine, DateChip, StatusBadge, TodoList } from '../ui/bits';

export default async function Home() {
  const data = await getData();
  const today = todayKST();
  const s = homeStats(data, today);
  const rows = companyRows(data, today);
  const stale = rows.filter((r) => r.stale).sort((a, b) => (b.daysSince ?? 1e9) - (a.daysSince ?? 1e9));
  const names = new Map(data.companies.map((c) => [c.id, c.name]));
  const recent = [...data.contacts]
    .filter((c) => names.has(c.companyIds[0]))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);
  const due = insuranceDue(data, today);
  const [y, m, d] = today.split('-');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>오늘의 대시보드</h1>
          <p>{y}년 {Number(m)}월 {Number(d)}일 · 관리 업체 {s.managed}곳</p>
        </div>
        <Link href="/admin/new" className="btn primary">+ 업체 추가</Link>
      </div>

      <section className="kpis" aria-label="요약">
        <Link href="/companies" className="kpi"><span className="kpi-label">관리 업체</span><span className="kpi-value">{s.managed}<small>곳</small></span></Link>
        <Link href="/companies?status=계약·진행" className="kpi"><span className="kpi-label">계약·진행</span><span className="kpi-value">{s.inProgress}<small>곳</small></span></Link>
        <div className="kpi"><span className="kpi-label">이번 달 접촉</span><span className="kpi-value">{s.contactsThisMonth}<small>회</small></span></div>
        <Link href="/companies?stale=1" className={`kpi${s.stale ? ' alert' : ''}`}><span className="kpi-label">{STALE_DAYS}일+ 미접촉</span><span className="kpi-value">{s.stale}<small>곳</small></span></Link>
        <div className={`kpi${s.insuranceDue ? ' alert' : ''}`}><span className="kpi-label">90일 내 보험 만기</span><span className="kpi-value">{s.insuranceDue}<small>건</small></span></div>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>이번 주 할 일 <span className="count">{todos(data, today).length}</span></h2></div>
          <TodoList items={todos(data, today)} today={today} />
        </section>

        <section className="card">
          <div className="card-head">
            <h2>연락이 뜸한 업체 <span className="count">{stale.length}</span></h2>
            {stale.length > 0 && <Link href="/companies?stale=1">전체 보기</Link>}
          </div>
          {stale.length === 0 ? <p className="empty">진행 중인 업체 모두 {STALE_DAYS}일 안에 연락했습니다.</p> : (
            <ul className="list">
              {stale.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link href={`/companies/${c.id}`} className="item">
                    <div className="item-main">
                      <div className="item-title">{c.name}</div>
                      <div className="item-sub">{c.ceo} · {c.touch ? `${c.touch.method} ${fmtDate(c.touch.date)}` : '접촉 기록 없음'}</div>
                    </div>
                    <span className="badge warn">{c.daysSince === null ? '기록 없음' : `${c.daysSince}일`}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>최근 활동</h2></div>
          {recent.length === 0 ? <p className="empty">아직 접촉 기록이 없습니다.</p> : (
            <ul className="list">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link href={`/companies/${c.companyIds[0]}?tab=contacts`} style={{ textDecoration: 'none' }}>
                    <ContactLine c={c} today={today} companyName={names.get(c.companyIds[0])} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>보험 만기 임박 <span className="count">{due.length}</span></h2></div>
          {due.length === 0 ? <p className="empty">90일 안에 만기되는 보험이 없습니다.</p> : (
            <ul className="list">
              {due.map((i) => (
                <li key={i.id}>
                  <Link href={`/companies/${i.companyIds[0]}?tab=insurance`} className="item">
                    <DateChip date={i.maturity} />
                    <div className="item-main">
                      <div className="item-title">{i.product}</div>
                      <div className="item-sub">{names.get(i.companyIds[0])} · {i.insurer} · 연 {won(i.yearly)}</div>
                    </div>
                    <span className="item-side">{relDay(i.maturity, today)}{!i.managed && <><br /><span className="badge accent">타사 계약</span></>}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <p className="small muted" style={{ marginTop: 16 }}>관리상태 기준: <StatusBadge status="상담중" /> <StatusBadge status="계약·진행" /> <StatusBadge status="사후관리" /> 업체만 미접촉 경고에 포함합니다.</p>
    </>
  );
}
