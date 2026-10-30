import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getData } from '@/lib/repo';
import {
  companyRows, contactsOf, fmtDate, nowKST, relDay, smsHref, telHref, todayKST, todos, won,
} from '@/lib/derive';
import { NOTION_URLS, type Cert, type Dataset, type Finance, type Goal, type Insurance, type Match } from '@/lib/schema';
import { Icon } from '../../../ui/icons';
import { MethodIcon, PriorityBadge, StatusBadge, TodoList } from '../../../ui/bits';
import { toggleFollowUp } from '../../../actions';
import { Tabs } from './Tabs';
import { QuickContact } from './QuickContact';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = (await getData()).companies.find((x) => x.id === id);
  return { title: c?.name ?? '업체' };
}

const of = <T extends { companyIds: string[] }>(rows: T[], id: string) => rows.filter((r) => r.companyIds.includes(id));

export default async function CompanyPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const data = await getData();
  const today = todayKST();
  const c = companyRows(data, today).find((x) => x.id === id);
  if (!c) notFound();

  const contacts = contactsOf(data, id);
  const certs = of(data.certs, id);
  const insurances = of(data.insurances, id);
  const finances = of(data.finances, id).sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  const goals = of(data.goals, id);
  const matches = of(data.matches, id).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const myTodos = todos({ companies: [c], contacts }, today, 30);

  return (
    <>
      {sp.saved && <p className="notice ok" role="status">저장했습니다. 노션에도 반영되었습니다.</p>}
      <header className="hero">
        <div className="hero-top">
          <div>
            <div className="row" style={{ marginBottom: 4 }}>
              <StatusBadge status={c.status} /><PriorityBadge priority={c.priority} />
              {c.no && <span className="badge">No.{c.no}</span>}
              {c.finLinked && <span className="badge accent">재무 연동</span>}
            </div>
            <h1>{c.name}</h1>
            <div className="hero-sub">
              {c.ceo && <span>대표 {c.ceo}</span>}
              {c.industry && <span>{c.industry}</span>}
              {c.region && <span>{c.region}</span>}
              <span style={c.stale ? { color: 'var(--bad)', fontWeight: 700 } : undefined}>
                {c.touch ? `최근 ${c.touch.method} ${relDay(c.touch.date, today)}` : '접촉 기록 없음'}
              </span>
            </div>
          </div>
          <div className="hero-actions">
            {c.mobile && <a className="btn" href={telHref(c.mobile)}><Icon name="phone" />전화</a>}
            {c.mobile && <a className="btn" href={smsHref(c.mobile)}><Icon name="message" />문자</a>}
            <QuickContact companyId={c.id} companyName={c.name} now={nowKST()} autoOpen={sp.log === '1'} />
            <Link className="btn" href={`/admin/${c.id}`}><Icon name="edit" />수정</Link>
            {c.url && <a className="btn ghost" href={c.url} target="_blank" rel="noreferrer"><Icon name="notion" />노션</a>}
          </div>
        </div>
      </header>

      <Tabs
        initial={sp.tab ?? 'overview'}
        tabs={[
          { key: 'overview', label: '개요', content: <Overview c={c} todos={myTodos} today={today} /> },
          { key: 'contacts', label: '접촉', count: contacts.length, content: <Timeline contacts={contacts} today={today} /> },
          { key: 'certs', label: '인증·솔루션', count: certs.length, content: <Certs rows={certs} /> },
          { key: 'insurance', label: '보험', count: insurances.length, content: <Insurances rows={insurances} today={today} /> },
          { key: 'finance', label: '재무', count: finances.length, content: <Finances rows={finances} /> },
          { key: 'goals', label: '목표·과업', count: goals.length, content: <Goals rows={goals} /> },
          { key: 'matches', label: 'AI 매칭', count: matches.length, content: <Matches rows={matches} today={today} /> },
        ]}
      />
    </>
  );
}

function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return <div><dt>{k}</dt><dd>{v || '—'}</dd></div>;
}

function NotionFoot({ db, label }: { db: keyof typeof NOTION_URLS; label: string }) {
  return (
    <p className="small muted" style={{ marginTop: 12 }}>
      {label}은(는) 노션에서 추가·수정합니다 → <a href={NOTION_URLS[db]} target="_blank" rel="noreferrer">노션에서 열기</a>
    </p>
  );
}

function Overview({ c, todos: items, today }: { c: Dataset['companies'][number]; todos: ReturnType<typeof todos>; today: string }) {
  return (
    <div className="stack">
      <div className="info-grid">
        <div className="callout"><h3>대표 관심사</h3>
          {c.interests.length > 0 && <div className="co-tags" style={{ marginBottom: 6 }}>{c.interests.map((i) => <span key={i} className="tag">{i}</span>)}</div>}
          <p className="prose">{c.interestMemo || (c.interests.length ? '' : '아직 기록이 없습니다.')}</p>
        </div>
        <div className="callout"><h3>제공 예정 솔루션</h3><p className="prose">{c.plannedSolution || '아직 기록이 없습니다.'}</p></div>
        <div className="callout"><h3>내년 목표</h3><p className="prose">{c.nextGoal || '아직 기록이 없습니다.'}</p></div>
      </div>
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>기본 정보</h2></div>
          <dl className="facts">
            <Fact k="사업자등록번호" v={c.bizNo} />
            <Fact k="법인등록번호" v={c.corpNo} />
            <Fact k="대표자" v={c.ceo} />
            <Fact k="대표 휴대폰" v={c.mobile && <a href={telHref(c.mobile)}>{c.mobile}</a>} />
            <Fact k="회사 전화" v={c.phone && <a href={telHref(c.phone)}>{c.phone}</a>} />
            <Fact k="이메일" v={c.email && <a href={`mailto:${c.email}`}>{c.email}</a>} />
            <Fact k="기업형태" v={c.entity} />
            <Fact k="설립일" v={c.founded && fmtDate(c.founded)} />
            <Fact k="상시근로자" v={c.employees !== null && `${c.employees}명`} />
            <Fact k="최근 매출" v={c.revenue !== null && won(c.revenue)} />
            <Fact k="주소" v={c.address} />
            <Fact k="데이터 출처" v={c.source} />
          </dl>
          {c.bizCert.length > 0 && (
            <p className="small" style={{ marginTop: 12 }}>사업자등록증: {c.bizCert.map((f) => <a key={f.url} href={f.url} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>{f.name}</a>)}</p>
          )}
          {c.note && <p className="prose small muted" style={{ marginTop: 12 }}>{c.note}</p>}
        </section>
        <section className="card">
          <div className="card-head"><h2>진행 업무 · 할 일</h2></div>
          <div className="co-tags" style={{ marginBottom: 12 }}>
            {c.tasks.length ? c.tasks.map((t) => <span key={t} className="tag">{t}</span>) : <span className="muted small">진행업무 없음</span>}
          </div>
          <TodoList items={items} today={today} showCompany={false} />
        </section>
      </div>
    </div>
  );
}

function Timeline({ contacts, today }: { contacts: Dataset['contacts']; today: string }) {
  return (
    <section className="card">
      {contacts.length === 0 ? <p className="empty">아직 접촉 기록이 없습니다. 위의 ‘접촉 기록’ 버튼으로 남겨 보세요.</p> : (
        <ol className="timeline">
          {contacts.map((k) => (
            <li key={k.id}>
              <MethodIcon method={k.method} />
              <div>
                <div className="tl-head">
                  <b>{k.summary}</b>
                  <span>{k.method}{k.direction && ` · ${k.direction}`}{k.counterpart && ` · ${k.counterpart}`} · {fmtDate(k.date)} ({relDay(k.date, today)})</span>
                </div>
                {k.content && k.content !== k.summary && <p className="tl-body">{k.content}</p>}
                {k.detectedInterest && <p className="small" style={{ marginTop: 4 }}><span className="tag">관심사</span> {k.detectedInterest}</p>}
                {k.followUp && (
                  <div className={`tl-follow${k.followUpDone ? ' done' : ''}`}>
                    <span>후속: {k.followUp}{k.followUpDue && ` (기한 ${fmtDate(k.followUpDue)})`}</span>
                    <form action={toggleFollowUp} style={{ marginLeft: 'auto' }}>
                      <input type="hidden" name="contactId" value={k.id} />
                      <input type="hidden" name="done" value={k.followUpDone ? '0' : '1'} />
                      <button className="btn sm">{k.followUpDone ? '되돌리기' : '완료'}</button>
                    </form>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      <NotionFoot db="contacts" label="지난 기록 수정" />
    </section>
  );
}

function Certs({ rows }: { rows: Cert[] }) {
  const groups = [
    { label: '채움 수행', items: rows.filter((r) => r.by === '채움 수행') },
    { label: '기존 보유·기타', items: rows.filter((r) => r.by !== '채움 수행') },
  ];
  return (
    <section className="card stack">
      {rows.length === 0 && <p className="empty">등록된 인증·솔루션이 없습니다.</p>}
      {groups.filter((g) => g.items.length).map((g) => (
        <div key={g.label}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>{g.label} <span className="muted small">{g.items.length}</span></h3>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>구분</th><th>항목</th><th>상태</th><th>기관</th><th>취득일</th><th>만료일</th><th className="num">금액</th></tr></thead>
              <tbody>
                {g.items.map((r) => (
                  <tr key={r.id}>
                    <td><span className="tag">{r.kind || '—'}</span></td><td>{r.name}</td>
                    <td><span className={`badge ${r.status === '취득·선정' ? 'ok' : r.status === '만료·탈락' ? 'warn' : ''}`}>{r.status || '—'}</span></td>
                    <td>{r.agency || '—'}</td><td>{fmtDate(r.acquired)}</td><td>{fmtDate(r.expires)}</td>
                    <td className="num">{r.amount !== null ? won(r.amount) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <NotionFoot db="certs" label="인증·솔루션" />
    </section>
  );
}

function Insurances({ rows, today }: { rows: Insurance[]; today: string }) {
  const live = rows.filter((r) => !['해지', '실효'].includes(r.payStatus));
  const sum = (k: 'monthly' | 'yearly' | 'coverage') => live.reduce((s, r) => s + (r[k] ?? 0), 0);
  return (
    <section className="card stack">
      {rows.length === 0 ? <p className="empty">등록된 보험이 없습니다.</p> : (
        <>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', marginBottom: 0 }}>
            <div className="kpi"><span className="kpi-label">월 보험료 합계</span><span className="kpi-value" style={{ fontSize: 22 }}>{won(sum('monthly'))}</span></div>
            <div className="kpi"><span className="kpi-label">연 보험료 합계</span><span className="kpi-value" style={{ fontSize: 22 }}>{won(sum('yearly'))}</span></div>
            <div className="kpi"><span className="kpi-label">보장금액 합계</span><span className="kpi-value" style={{ fontSize: 22 }}>{won(sum('coverage'))}</span></div>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>상품명</th><th>종류</th><th>보험사</th><th className="num">월 보험료</th><th className="num">보장금액</th><th>계약기간</th><th>만기</th><th>납입</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.product}{r.managed && <> <span className="badge accent">채움</span></>}</td>
                    <td>{r.kind || '—'}</td><td>{r.insurer || '—'}</td>
                    <td className="num">{won(r.monthly)}</td><td className="num">{won(r.coverage)}</td>
                    <td>{r.period.start ? `${fmtDate(r.period.start)} ~ ${fmtDate(r.period.end)}` : '—'}</td>
                    <td>{r.maturity ? <>{fmtDate(r.maturity)} <span className="muted small">({relDay(r.maturity, today)})</span></> : '—'}</td>
                    <td>{r.payStatus || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <NotionFoot db="insurances" label="보험 계약" />
    </section>
  );
}

function Finances({ rows }: { rows: Finance[] }) {
  const max = Math.max(1, ...rows.map((r) => r.revenue ?? 0));
  return (
    <section className="card stack">
      {rows.length === 0 ? <p className="empty">재무컨설팅 기록이 없습니다. 기업컨설팅 웹앱 연동(P3) 후 자동으로 채워집니다.</p> : (
        <>
          <div>
            <h3 style={{ fontSize: 15, marginBottom: 10 }}>연도별 매출</h3>
            <div className="bar-chart">
              {rows.map((r) => (
                <div key={r.id} className="bar-row">
                  <span>{r.year ?? '—'}</span>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${((r.revenue ?? 0) / max) * 100}%` }} /></div>
                  <span className="v">{won(r.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>회계연도</th><th>구분</th><th className="num">매출</th><th className="num">영업이익</th><th className="num">순이익</th><th className="num">부채비율</th><th className="num">차입금</th><th>등급</th><th>핵심 이슈 · 제안</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.year ?? '—'}</td><td>{r.title}</td>
                    <td className="num">{won(r.revenue)}</td><td className="num">{won(r.opProfit)}</td><td className="num">{won(r.netIncome)}</td>
                    <td className="num">{r.debtRatio !== null ? `${r.debtRatio}%` : '—'}</td><td className="num">{won(r.borrowings)}</td>
                    <td>{r.grade || '—'}</td>
                    <td className="wrap">{[r.issues, r.suggestions && `→ ${r.suggestions}`].filter(Boolean).join(' ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <NotionFoot db="finances" label="재무 기록" />
    </section>
  );
}

function Goals({ rows }: { rows: Goal[] }) {
  const goals = rows.filter((r) => r.type === '목표');
  const tasks = rows.filter((r) => r.type !== '목표').sort((a, b) => (a.quarter || '9').localeCompare(b.quarter || '9'));
  return (
    <section className="card stack">
      {rows.length === 0 && <p className="empty">차년도 목표·과업이 없습니다.</p>}
      {goals.length > 0 && (
        <div className="info-grid">{goals.map((g) => <div key={g.id} className="callout"><h3>{g.year ?? ''} 목표</h3><p><b>{g.title}</b></p></div>)}</div>
      )}
      {tasks.length > 0 && (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>분기</th><th>과업</th><th>분야</th><th>상태</th><th>기한</th><th>연관 목표</th><th>예상효과</th></tr></thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.year ? `${t.year} ` : ''}{t.quarter || '—'}</td><td>{t.title}</td><td>{t.area || '—'}</td>
                  <td><span className={`badge ${t.status === '완료' ? 'ok' : t.status === '진행' ? 'accent' : ''}`}>{t.status || '—'}</span></td>
                  <td>{fmtDate(t.due)}</td><td>{t.related || '—'}</td><td className="wrap">{t.effect || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <NotionFoot db="goals" label="목표·과업" />
    </section>
  );
}

function Matches({ rows, today }: { rows: Match[]; today: string }) {
  return (
    <section className="card">
      {rows.length === 0 ? <p className="empty">매칭된 지원사업이 없습니다. AI 매칭은 P3 단계에서 추가됩니다.</p> : (
        <ul className="list">
          {rows.map((m) => (
            <li key={m.id}>
              <div className="item">
                <span className="date-chip" title="적합도"><b>{m.score ?? '—'}</b><span>적합도</span></span>
                <div className="item-main">
                  <div className="item-title">{m.link ? <a href={m.link} target="_blank" rel="noreferrer">{m.title}</a> : m.title}</div>
                  <div className="item-sub">{[m.agency, m.area, m.size, m.deadline && `마감 ${fmtDate(m.deadline)} (${relDay(m.deadline, today)})`].filter(Boolean).join(' · ')}</div>
                  {m.reason && <div className="small muted" style={{ whiteSpace: 'normal' }}>{m.reason}</div>}
                </div>
                <span className="badge">{m.status}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <NotionFoot db="matches" label="매칭 결과 검토" />
    </section>
  );
}
