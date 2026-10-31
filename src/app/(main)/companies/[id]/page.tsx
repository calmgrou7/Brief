import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getData } from '@/lib/repo';
import {
  companyRows, contactsOf, fmtDate, nowKST, relDay, smsHref, tasks, telHref, todayKST, won, yoy,
} from '@/lib/derive';
import { NOTION_URLS, type Cert, type Dataset, type Finance, type FileRef, type Goal, type Insurance, type Match } from '@/lib/schema';
import { Icon } from '../../../ui/icons';
import { ActivityRow, CompanyProgress, EmptyState, MethodIcon, PhoneLink, PriorityBadge, StatusBadge, TaskList } from '../../../ui/bits';
import { toggleFollowUp } from '../../../actions';
import { Tabs } from './Tabs';
import { QuickContact } from './QuickContact';
import { NextAction } from './NextAction';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = (await getData()).companies.find((x) => x.id === id);
  return { title: c?.name ?? '업체' };
}

const of = <T extends { companyIds: string[] }>(rows: T[], id: string) => rows.filter((r) => r.companyIds.includes(id));
const mapHref = (address: string) => `https://map.naver.com/p/search/${encodeURIComponent(address)}`;

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
  const myTasks = tasks({ companies: [c], contacts, insurances }, today).filter((t) => t.source !== '다음 액션');
  const files = [
    ...c.bizCert.map((f) => ({ ...f, from: '사업자등록증' })),
    ...certs.flatMap((t) => t.proof.map((f) => ({ ...f, from: `${t.name} 증빙` }))),
    ...insurances.flatMap((i) => i.policy.map((f) => ({ ...f, from: `${i.product} 증권` }))),
  ];

  return (
    <>
      {sp.saved && <p className="notice ok" role="status">저장했습니다. 노션에도 반영되었습니다.</p>}
      <Link href="/companies" className="back"><Icon name="back" />업체 목록</Link>
      <header className="hero">
        <div className="hero-top">
          <div style={{ minWidth: 0 }}>
            <div className="row" style={{ marginBottom: 4 }}>
              <StatusBadge status={c.status} /><PriorityBadge priority={c.priority} />
              {c.no && <span className="badge">No.{c.no}</span>}
              {c.stale && <span className="badge warn">연락 필요</span>}
            </div>
            <h1>{c.name}</h1>
            <div className="hero-sub">
              {c.ceo && <span>대표 {c.ceo}</span>}
              {(c.industry || c.region) && <span>{[c.industry, c.region].filter(Boolean).join(' · ')}</span>}
              <span>{c.touch ? `최근 ${c.touch.method} ${relDay(c.touch.date, today)}` : '접촉 기록 없음'}</span>
            </div>
          </div>
          <div className="hero-actions">
            {c.mobile ? <a className="btn" href={telHref(c.mobile)}><Icon name="phone" />전화</a>
              : <span className="btn" aria-disabled="true" title="대표 휴대폰 없음"><Icon name="phone" />전화</span>}
            {c.mobile ? <a className="btn" href={smsHref(c.mobile)}><Icon name="message" />문자</a>
              : <span className="btn" aria-disabled="true" title="대표 휴대폰 없음"><Icon name="message" />문자</span>}
            {c.address ? <a className="btn" href={mapHref(c.address)} target="_blank" rel="noreferrer"><Icon name="map" />위치</a>
              : <span className="btn" aria-disabled="true" title="주소 없음"><Icon name="map" />위치</span>}
            <QuickContact companyId={c.id} companyName={c.name} now={nowKST()} autoOpen={sp.log === '1'} />
            <Link className="btn hide-m" href={`/admin/${c.id}`}><Icon name="edit" />수정</Link>
          </div>
        </div>
        <CompanyProgress status={c.status} />
        <NextAction companyId={c.id} text={c.nextAction} date={c.nextActionDate} today={today} autoOpen={sp.next === '1'} />
      </header>

      <Tabs
        initial={sp.tab ?? 'overview'}
        tabs={[
          { key: 'overview', label: '개요', content: <Overview c={c} tasks={myTasks} contacts={contacts.slice(0, 3)} goals={goals} today={today} /> },
          { key: 'contacts', label: '활동', count: contacts.length, content: <Timeline contacts={contacts} today={today} /> },
          { key: 'finance', label: '재무', count: finances.length, content: <Finances rows={finances} /> },
          { key: 'certs', label: '정책자금·인증', count: certs.length, content: <Certs rows={certs} /> },
          { key: 'insurance', label: '보험', count: insurances.length, content: <Insurances rows={insurances} today={today} /> },
          { key: 'docs', label: '문서', count: files.length, content: <Docs files={files} /> },
          { key: 'goals', label: '로드맵', count: goals.length, content: <Goals rows={goals} /> },
          { key: 'matches', label: 'AI 매칭', count: matches.length, content: <Matches rows={matches} today={today} /> },
        ]}
      />
    </>
  );
}

function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  const empty = v === '' || v === null || v === undefined || v === false;
  return <div><dt>{k}</dt><dd className={empty ? 'none' : undefined}>{empty ? '정보 없음' : v}</dd></div>;
}

function NotionFoot({ db, label }: { db: keyof typeof NOTION_URLS; label: string }) {
  return (
    <p className="small muted" style={{ marginTop: 12 }}>
      {label}은(는) 노션에서 추가·수정합니다 · <a href={NOTION_URLS[db]} target="_blank" rel="noreferrer">노션에서 열기</a>
    </p>
  );
}

function Overview({ c, tasks: items, contacts, goals, today }: {
  c: Dataset['companies'][number]; tasks: ReturnType<typeof tasks>; contacts: Dataset['contacts']; goals: Goal[]; today: string;
}) {
  const active = goals.filter((g) => g.status === '진행');
  return (
    <div className="stack">
      <div className="notes">
        <div className="note"><h3>대표 관심사</h3>
          {c.interests.length > 0 && <div className="row" style={{ gap: 4 }}>{c.interests.map((i) => <span key={i} className="tag">{i}</span>)}</div>}
          <p className="prose">{c.interestMemo || (c.interests.length ? '' : '정보 없음')}</p>
        </div>
        <div className="note"><h3>제공 예정 솔루션</h3><p className="prose">{c.plannedSolution || '정보 없음'}</p></div>
        <div className="note"><h3>내년 목표</h3><p className="prose">{c.nextGoal || '정보 없음'}</p></div>
      </div>
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>진행 중 과제 · 할 일</h2></div>
          {c.tasks.length > 0 && <div className="row" style={{ gap: 4, marginBottom: 8 }}>{c.tasks.map((t) => <span key={t} className="tag">{t}</span>)}</div>}
          {active.length > 0 && (
            <ul className="feed" style={{ marginBottom: 8 }}>
              {active.map((g) => <li key={g.id}><div className="item"><span className="method"><Icon name="chart" /></span><span className="item-main"><span className="item-title" style={{ display: 'block' }}>{g.title}</span><span className="item-sub" style={{ display: 'block' }}>{[g.quarter && `${g.year ?? ''} ${g.quarter}`, g.area].filter(Boolean).join(' · ')}</span></span><span className="badge accent">진행</span></div></li>)}
            </ul>
          )}
          <TaskList items={items} today={today} showCompany={false} emptyText="후속조치·만기 할 일이 없습니다" />
        </section>
        <section className="card">
          <div className="card-head"><h2>최근 활동</h2>{contacts.length > 0 && <Link href={`/companies/${c.id}?tab=contacts`}>전체<Icon name="chevron" /></Link>}</div>
          {contacts.length === 0 ? <EmptyState icon="note" title="접촉 기록이 없습니다">위의 ‘기록’으로 첫 접촉을 남겨 주세요.</EmptyState> : (
            <ul className="feed">{contacts.map((k) => <li key={k.id}><ActivityRow c={k} today={today} /></li>)}</ul>
          )}
        </section>
      </div>
      <section className="card">
        <div className="card-head"><h2>기본 정보</h2><Link href={`/admin/${c.id}`}><Icon name="edit" />수정</Link></div>
        <dl className="facts">
          <Fact k="사업자등록번호" v={c.bizNo} />
          <Fact k="법인등록번호" v={c.corpNo} />
          <Fact k="대표자" v={c.ceo} />
          <Fact k="대표 휴대폰" v={c.mobile && <PhoneLink value={c.mobile} />} />
          <Fact k="회사 전화" v={c.phone && <PhoneLink value={c.phone} />} />
          <Fact k="이메일" v={c.email && <a href={`mailto:${c.email}`}>{c.email}</a>} />
          <Fact k="기업형태" v={c.entity} />
          <Fact k="설립일" v={c.founded && fmtDate(c.founded)} />
          <Fact k="상시근로자" v={c.employees !== null && `${c.employees.toLocaleString('ko-KR')}명`} />
          <Fact k="최근 매출" v={c.revenue !== null && won(c.revenue)} />
          <Fact k="주소" v={c.address} />
          <Fact k="데이터 출처" v={c.source} />
        </dl>
        {c.note && <p className="prose small muted" style={{ marginTop: 12 }}>{c.note}</p>}
      </section>
    </div>
  );
}

function Timeline({ contacts, today }: { contacts: Dataset['contacts']; today: string }) {
  return (
    <section className="card">
      {contacts.length === 0 ? <EmptyState icon="note" title="아직 접촉 기록이 없습니다">위의 ‘기록’ 버튼으로 남겨 보세요.</EmptyState> : (
        <ol className="timeline">
          {contacts.map((k) => (
            <li key={k.id}>
              <MethodIcon method={k.method} />
              <div style={{ minWidth: 0 }}>
                <div className="tl-head">
                  <b>{k.summary}</b>
                  <span>{[k.method, k.direction, k.counterpart].filter(Boolean).join(' · ')} · {k.date ? `${fmtDate(k.date)} (${relDay(k.date, today)})` : '일시 없음'}</span>
                </div>
                {k.content && k.content !== k.summary && <p className="tl-body">{k.content}</p>}
                {k.detectedInterest && <p className="small" style={{ marginTop: 4 }}><span className="tag">관심사</span> {k.detectedInterest}</p>}
                {k.followUp && (
                  <div className={`tl-follow${k.followUpDone ? ' done' : ''}`}>
                    <span>후속: {k.followUp}{k.followUpDue && ` (기한 ${fmtDate(k.followUpDue)})`}</span>
                    {k.followUpDone && <span className="badge ok">완료</span>}
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

function Finances({ rows }: { rows: Finance[] }) {
  if (rows.length === 0) {
    return (
      <section className="card">
        <EmptyState icon="chart" title="재무 기록이 없습니다">기업컨설팅 웹앱 연동(P3) 또는 노션 ‘연도별 재무컨설팅’에 입력하면 연도별로 쌓입니다.</EmptyState>
        <NotionFoot db="finances" label="재무 기록" />
      </section>
    );
  }
  const max = Math.max(1, ...rows.map((r) => r.revenue ?? 0));
  const byYear = new Map(rows.map((r) => [r.year, r]));
  const delta = (r: Finance, k: 'revenue' | 'opProfit' | 'netIncome') => {
    const prev = r.year !== null ? byYear.get(r.year - 1) : undefined;
    const v = yoy(r[k], prev ? prev[k] : null);
    return v === null ? null : <span className={v >= 0 ? 'delta-up' : 'delta-down'}> {v >= 0 ? '▲' : '▼'}{Math.abs(v)}%</span>;
  };
  return (
    <section className="card stack">
      <div>
        <div className="card-head"><h2>연도별 매출</h2><span className="small muted">단위: 원 (억·만 단위로 표기)</span></div>
        <div className="fin-chart">
          {rows.map((r) => (
            <div key={r.id} className="bar-row">
              <span>{r.year ?? '연도 없음'}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${((r.revenue ?? 0) / max) * 100}%` }} /></div>
              <span className="v">{won(r.revenue)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <caption>전년비는 바로 전 회계연도 기록이 있을 때만 표시합니다. 기준일 = 컨설팅일</caption>
          <thead><tr><th>회계연도</th><th>구분 · 기준일</th><th className="num">매출</th><th className="num">영업이익</th><th className="num">순이익</th><th className="num">부채비율</th><th className="num">차입금</th><th>등급</th><th>핵심 이슈 · 제안</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.year ?? '-'}</td><td>{r.title || '-'}<br /><span className="small muted">{fmtDate(r.date)}</span></td>
                <td className="num">{won(r.revenue)}{delta(r, 'revenue')}</td>
                <td className="num">{won(r.opProfit)}{delta(r, 'opProfit')}</td>
                <td className="num">{won(r.netIncome)}{delta(r, 'netIncome')}</td>
                <td className="num">{r.debtRatio !== null ? `${r.debtRatio}%` : '-'}</td><td className="num">{won(r.borrowings)}</td>
                <td>{r.grade || '-'}</td>
                <td className="wrap">{[r.issues, r.suggestions && `→ ${r.suggestions}`].filter(Boolean).join(' ') || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <NotionFoot db="finances" label="재무 기록" />
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
      {rows.length === 0 && <EmptyState icon="shield" title="등록된 정책자금·인증이 없습니다">검토 단계부터 노션에 기록하면 상태 변화가 여기에 보입니다.</EmptyState>}
      {groups.filter((g) => g.items.length).map((g) => (
        <div key={g.label}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>{g.label} <span className="muted small">{g.items.length}건</span></h3>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>구분</th><th>항목</th><th>상태</th><th>기관</th><th>취득·선정일</th><th>만료일</th><th className="num">금액</th></tr></thead>
              <tbody>
                {g.items.map((r) => (
                  <tr key={r.id}>
                    <td><span className="tag">{r.kind || '-'}</span></td><td>{r.name}</td>
                    <td><span className={`badge ${r.status === '취득·선정' ? 'ok' : r.status === '만료·탈락' ? 'warn' : ''}`}>{r.status || '-'}</span></td>
                    <td>{r.agency || '-'}</td><td>{r.acquired ? fmtDate(r.acquired) : '-'}</td><td>{r.expires ? fmtDate(r.expires) : '-'}</td>
                    <td className="num">{r.amount !== null ? won(r.amount) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <NotionFoot db="certs" label="정책자금·인증" />
    </section>
  );
}

function Insurances({ rows, today }: { rows: Insurance[]; today: string }) {
  const live = rows.filter((r) => !['해지', '실효'].includes(r.payStatus));
  const sum = (k: 'monthly' | 'coverage') => live.some((r) => r[k] !== null) ? live.reduce((s, r) => s + (r[k] ?? 0), 0) : null;
  return (
    <section className="card stack">
      {rows.length === 0 ? <EmptyState icon="shield" title="등록된 보험이 없습니다" /> : (
        <>
          <div className="metrics">
            <div className="metric"><span className="metric-label">월 보험료 합계</span><span className="metric-value" style={{ fontSize: 20 }}>{won(sum('monthly'))}</span><span className="metric-note">유지 중인 {live.length}건</span></div>
            <div className="metric"><span className="metric-label">보장금액 합계</span><span className="metric-value" style={{ fontSize: 20 }}>{won(sum('coverage'))}</span><span className="metric-note">해지·실효 제외</span></div>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>상품명</th><th>종류</th><th>보험사</th><th className="num">월 보험료</th><th className="num">보장금액</th><th>계약기간</th><th>만기</th><th>납입</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.product}{r.managed && <> <span className="badge accent">채움</span></>}</td>
                    <td>{r.kind || '-'}</td><td>{r.insurer || '-'}</td>
                    <td className="num">{won(r.monthly)}</td><td className="num">{won(r.coverage)}</td>
                    <td>{r.period.start ? `${fmtDate(r.period.start)} ~ ${r.period.end ? fmtDate(r.period.end) : ''}` : '-'}</td>
                    <td>{r.maturity ? <>{fmtDate(r.maturity)} <span className="muted small">({relDay(r.maturity, today)})</span></> : '-'}</td>
                    <td>{r.payStatus || '-'}</td>
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

function Docs({ files }: { files: (FileRef & { from: string })[] }) {
  return (
    <section className="card">
      {files.length === 0 ? <EmptyState icon="file" title="첨부 문서가 없습니다">사업자등록증, 인증 증빙, 보험 증권을 노션에 올리면 여기에 모입니다.</EmptyState> : (
        <ul className="files">
          {files.map((f, i) => (
            <li key={`${f.url}-${i}`}>
              <span className="fi"><Icon name="file" /></span>
              <span className="item-main"><b style={{ display: 'block', fontSize: 14 }}>{f.name}</b><span className="small muted">{f.from}</span></span>
              {f.url ? <a className="btn sm" href={f.url} target="_blank" rel="noreferrer"><Icon name="external" />열기</a> : <span className="small muted">링크 없음</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="small muted" style={{ marginTop: 12 }}>파일 링크는 노션 보안 정책상 약 1시간 뒤 만료됩니다. 열리지 않으면 새로고침해 주세요.</p>
    </section>
  );
}

function Goals({ rows }: { rows: Goal[] }) {
  const goals = rows.filter((r) => r.type === '목표');
  const tasksList = rows.filter((r) => r.type !== '목표').sort((a, b) => (a.quarter || '9').localeCompare(b.quarter || '9'));
  return (
    <section className="card stack">
      {rows.length === 0 && <EmptyState icon="chart" title="차년도 로드맵이 없습니다">대표님 목표와 분기별 과업을 노션에 기록해 주세요.</EmptyState>}
      {goals.length > 0 && <div className="notes">{goals.map((g) => <div key={g.id} className="note"><h3>{g.year ?? ''} 목표</h3><p><b>{g.title}</b></p></div>)}</div>}
      {tasksList.length > 0 && (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>분기</th><th>과업</th><th>분야</th><th>상태</th><th>기한</th><th>연관 목표</th><th>예상효과</th></tr></thead>
            <tbody>
              {tasksList.map((t) => (
                <tr key={t.id}>
                  <td>{t.year ? `${t.year} ` : ''}{t.quarter || '-'}</td><td>{t.title}</td><td>{t.area || '-'}</td>
                  <td><span className={`badge ${t.status === '완료' ? 'ok' : t.status === '진행' ? 'accent' : ''}`}>{t.status || '-'}</span></td>
                  <td>{t.due ? fmtDate(t.due) : '-'}</td><td>{t.related || '-'}</td><td className="wrap">{t.effect || '-'}</td>
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
      {rows.length === 0 ? <EmptyState icon="search" title="매칭된 지원사업이 없습니다">AI 매칭은 P3 단계에서 추가됩니다.</EmptyState> : (
        <ul className="feed">
          {rows.map((m) => (
            <li key={m.id}>
              <div className="item">
                <span className="date-chip" title="적합도"><b>{m.score ?? '-'}</b><span>적합도</span></span>
                <span className="item-main">
                  <span className="item-title" style={{ display: 'block', whiteSpace: 'normal' }}>{m.link ? <a href={m.link} target="_blank" rel="noreferrer">{m.title}</a> : m.title}</span>
                  <span className="item-sub" style={{ display: 'block', whiteSpace: 'normal' }}>{[m.agency, m.area, m.size, m.deadline && `마감 ${fmtDate(m.deadline)} (${relDay(m.deadline, today)})`].filter(Boolean).join(' · ')}</span>
                  {m.reason && <span className="small muted" style={{ display: 'block' }}>{m.reason}</span>}
                </span>
                <span className="badge">{m.status || '-'}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="small muted" style={{ marginTop: 12 }}>AI 추천은 컨설턴트가 자격요건을 확인한 뒤에만 대표님께 제안합니다. · <a href={NOTION_URLS.matches} target="_blank" rel="noreferrer">노션에서 검토</a></p>
    </section>
  );
}
