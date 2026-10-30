'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { filterRows, fmtDate, relDay, smsHref, sortRows, telHref, type CompanyRow, type Filter, type SortKey } from '@/lib/derive';
import { PRIORITY, STATUS, TASKS } from '@/lib/schema';
import { Icon } from '../../ui/icons';
import { PriorityBadge, StatusBadge } from '../../ui/bits';

const VIEW_KEY = 'chaeum.companies.view';

export function CompanyList({ rows, today, initial }: { rows: CompanyRow[]; today: string; initial: Filter }) {
  const [f, setF] = useState<Filter>(initial);
  const [sort, setSort] = useState<SortKey>('recent');
  const [view, setView] = useState<'card' | 'table'>('card');

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === 'card' || v === 'table') setView(v);
    } catch { /* 저장소를 못 쓰면 기본값 */ }
  }, []);
  const pickView = (v: 'card' | 'table') => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* 무시 */ }
  };

  const list = useMemo(() => sortRows(filterRows(rows, f), sort), [rows, f, sort]);
  const countBy = (s: string) => filterRows(rows, { ...f, status: s }).length;
  const set = (p: Partial<Filter>) => setF((x) => ({ ...x, ...p }));

  return (
    <>
      <div className="toolbar">
        <label className="search">
          <Icon name="search" />
          <span className="sr">검색</span>
          <input type="search" value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="기업명·대표자·전화·사업자번호 검색" />
        </label>
        <div className="chips" role="group" aria-label="관리상태">
          <button type="button" className="chip" aria-pressed={!f.status} onClick={() => set({ status: '' })}>전체 <span className="n">{countBy('')}</span></button>
          {STATUS.map((s) => (
            <button type="button" key={s} className="chip" aria-pressed={f.status === s} onClick={() => set({ status: f.status === s ? '' : s })}>
              {s} <span className="n">{countBy(s)}</span>
            </button>
          ))}
        </div>
        <div className="filters">
          <select value={f.task} onChange={(e) => set({ task: e.target.value })} aria-label="진행업무">
            <option value="">진행업무 전체</option>
            {TASKS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={f.priority} onChange={(e) => set({ priority: e.target.value })} aria-label="우선순위">
            <option value="">우선순위 전체</option>
            {PRIORITY.map((p) => <option key={p} value={p}>우선 {p}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="정렬">
            <option value="recent">최근 접촉순</option>
            <option value="stale">오래 연락 안 한 순</option>
            <option value="next">다음 액션 빠른 순</option>
            <option value="name">이름순</option>
          </select>
          <button type="button" className="chip" aria-pressed={f.staleOnly} onClick={() => set({ staleOnly: !f.staleOnly })}>
            <Icon name="alert" />미접촉만
          </button>
          <div className="view-toggle" role="group" aria-label="보기 방식">
            <button type="button" aria-pressed={view === 'card'} onClick={() => pickView('card')}>카드</button>
            <button type="button" aria-pressed={view === 'table'} onClick={() => pickView('table')}>표</button>
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card empty">조건에 맞는 업체가 없습니다.</div>
      ) : view === 'card' ? (
        <div className="cards">
          {list.map((c) => <CompanyCard key={c.id} c={c} today={today} />)}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>기업명</th><th>상태</th><th>대표자</th><th>휴대폰</th><th>진행업무</th><th>최근 접촉</th><th>다음 액션</th></tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/companies/${c.id}`}>{c.name}</Link></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{c.ceo}</td>
                  <td>{c.mobile ? <a href={telHref(c.mobile)}>{c.mobile}</a> : '—'}</td>
                  <td className="wrap">{c.tasks.join(', ') || '—'}</td>
                  <td style={c.stale ? { color: 'var(--bad)', fontWeight: 700 } : undefined}>
                    {c.touch ? `${c.touch.method} · ${relDay(c.touch.date, today)}` : '기록 없음'}
                  </td>
                  <td className="wrap">{c.nextActionDate ? `${fmtDate(c.nextActionDate)} ${c.nextAction}` : c.nextAction || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function CompanyCard({ c, today }: { c: CompanyRow; today: string }) {
  return (
    <article className={`co-card${c.stale ? ' stale' : ''}`}>
      <Link href={`/companies/${c.id}`} className="co-link">
        <div className="co-top">
          <span className="co-name">{c.name}</span>
          <span className="row" style={{ flexWrap: 'nowrap' }}><PriorityBadge priority={c.priority} /><StatusBadge status={c.status} /></span>
        </div>
        <span className="co-meta">{[c.ceo && `${c.ceo}`, c.industry, c.region].filter(Boolean).join(' · ') || '정보 없음'}</span>
        {c.tasks.length > 0 && <span className="co-tags">{c.tasks.map((t) => <span key={t} className="tag">{t}</span>)}</span>}
        <span className={`co-touch${c.stale ? ' stale' : ''}`}>
          {c.stale && <Icon name="alert" />}
          {c.touch ? `최근 ${c.touch.method} · ${relDay(c.touch.date, today)}` : '접촉 기록 없음'}
        </span>
        {c.nextAction && (
          <span className="co-next"><b>{c.nextActionDate ? relDay(c.nextActionDate, today) : '다음'}</b>{c.nextAction}</span>
        )}
      </Link>
      <div className="co-actions">
        {c.mobile ? <a href={telHref(c.mobile)}><Icon name="phone" />전화</a> : <span aria-hidden><Icon name="phone" />전화</span>}
        {c.mobile ? <a href={smsHref(c.mobile)}><Icon name="message" />문자</a> : <span aria-hidden><Icon name="message" />문자</span>}
        <Link href={`/companies/${c.id}?log=1`}><Icon name="note" />기록</Link>
      </div>
    </article>
  );
}
