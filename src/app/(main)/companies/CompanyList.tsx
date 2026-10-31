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
  const [sort, setSort] = useState<SortKey>('stale');
  const [view, setView] = useState<'list' | 'table'>('list');

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === 'list' || v === 'table') setView(v);
    } catch { /* 저장소를 못 쓰면 기본값 */ }
  }, []);
  const pickView = (v: 'list' | 'table') => {
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
          <span className="sr">업체 검색</span>
          <input type="search" value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="업체명·대표자·전화·사업자번호" />
        </label>
        <div className="chips" role="group" aria-label="진행 단계">
          <button type="button" className="chip" aria-pressed={!f.status} onClick={() => set({ status: '' })}>전체 <span className="n">{countBy('')}</span></button>
          {STATUS.map((s) => (
            <button type="button" key={s} className="chip" aria-pressed={f.status === s} onClick={() => set({ status: f.status === s ? '' : s })}>
              {s} <span className="n">{countBy(s)}</span>
            </button>
          ))}
        </div>
        <div className="filters">
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="정렬">
            <option value="stale">오래 연락 안 한 순</option>
            <option value="recent">최근 접촉순</option>
            <option value="next">다음 할 일 빠른 순</option>
            <option value="name">이름순</option>
          </select>
          <select value={f.task} onChange={(e) => set({ task: e.target.value })} aria-label="진행업무">
            <option value="">진행업무 전체</option>
            {TASKS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={f.priority} onChange={(e) => set({ priority: e.target.value })} aria-label="우선순위">
            <option value="">우선순위 전체</option>
            {PRIORITY.map((p) => <option key={p} value={p}>우선 {p}</option>)}
          </select>
          <button type="button" className="chip" aria-pressed={f.staleOnly} onClick={() => set({ staleOnly: !f.staleOnly })}>
            <Icon name="alert" />미접촉만
          </button>
          <div className="view-toggle" role="group" aria-label="보기 방식">
            <button type="button" aria-pressed={view === 'list'} onClick={() => pickView('list')}>목록</button>
            <button type="button" aria-pressed={view === 'table'} onClick={() => pickView('table')}>표</button>
          </div>
        </div>
      </div>

      <p className="small muted" aria-live="polite" style={{ marginBottom: 8 }}>{list.length}곳</p>

      {list.length === 0 ? (
        <div className="card empty"><b>조건에 맞는 업체가 없습니다</b>검색어나 필터를 바꿔 보세요.</div>
      ) : view === 'list' ? (
        <div className="co-rows">
          {list.map((c) => <CompanyRowItem key={c.id} c={c} today={today} />)}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>업체명</th><th>진행 단계</th><th>대표자</th><th>업종·지역</th><th>최근 접촉</th><th>다음 할 일</th></tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/companies/${c.id}`}>{c.name}</Link></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{c.ceo || '-'}</td>
                  <td>{[c.industry, c.region].filter(Boolean).join(' · ') || '-'}</td>
                  <td style={c.stale ? { color: 'var(--danger-ink)', fontWeight: 700 } : undefined}>
                    {c.touch ? `${c.touch.method} · ${relDay(c.touch.date, today)}` : '기록 없음'}
                  </td>
                  <td className="wrap">{c.nextAction ? `${c.nextActionDate ? fmtDate(c.nextActionDate) + ' ' : ''}${c.nextAction}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function CompanyRowItem({ c, today }: { c: CompanyRow; today: string }) {
  return (
    <article className="co-row">
      <Link href={`/companies/${c.id}`} className="co-link">
        <span className="co-l1"><span className="co-name">{c.name}</span><StatusBadge status={c.status} /><PriorityBadge priority={c.priority === 'A' ? 'A' : ''} /></span>
        <span className="co-l2">{[c.ceo && `대표 ${c.ceo}`, c.industry, c.region].filter(Boolean).join(' · ') || '정보 없음'}</span>
        <span className="co-l3">
          <span className={`co-touch${c.stale ? ' stale' : ''}`}>
            {c.stale && <Icon name="alert" />}
            {c.touch ? `${c.stale ? '연락 필요 · ' : ''}${c.touch.method} ${relDay(c.touch.date, today)}` : c.stale ? '연락 필요 · 접촉 기록 없음' : '접촉 기록 없음'}
          </span>
          {c.nextAction && <span className="co-next"><b>{c.nextActionDate ? relDay(c.nextActionDate, today) : '다음'}</b>{c.nextAction}</span>}
        </span>
      </Link>
      <div className="co-acts">
        {c.mobile
          ? <a className="btn" href={telHref(c.mobile)} aria-label={`${c.name} 전화`}><Icon name="phone" /><span>전화</span></a>
          : <span className="btn" aria-disabled="true" title="휴대폰 번호 없음"><Icon name="phone" /><span>전화</span></span>}
        {c.mobile
          ? <a className="btn" href={smsHref(c.mobile)} aria-label={`${c.name} 문자`}><Icon name="message" /><span>문자</span></a>
          : <span className="btn" aria-disabled="true" title="휴대폰 번호 없음"><Icon name="message" /><span>문자</span></span>}
        <Link className="btn" href={`/companies/${c.id}?log=1`} aria-label={`${c.name} 접촉 기록`}><Icon name="note" /><span>기록</span></Link>
      </div>
    </article>
  );
}
