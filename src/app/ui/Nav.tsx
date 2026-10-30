'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Icon, type IconName } from './icons';
import { logout, refresh } from '../actions';

export interface CompanyLite { id: string; name: string; ceo: string; status: string; digits: string }

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: '오늘', icon: 'home' },
  { href: '/tasks', label: '할 일', icon: 'tasks' },
  { href: '/companies', label: '업체', icon: 'building' },
  { href: '/schedule', label: '일정', icon: 'calendar' },
  { href: '/more', label: '더보기', icon: 'more' },
];

const isActive = (path: string, href: string) => (href === '/' ? path === '/' : path.startsWith(href));
const MORE_PATHS = ['/more', '/links', '/admin'];

type Mode = 'contact' | 'next';

/** 화면 틀: 데스크톱 사이드바, 모바일 상단바·하단 탭. 등록 시트와 업체 검색을 함께 관리한다 */
export function AppChrome({ companies, urgent, loadedAt, children }: {
  companies: CompanyLite[]; urgent: number; loadedAt: string; children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const registerRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [q, setQ] = useState('');
  const [pending, start] = useTransition();

  // 업체 상세에서 등록을 누르면 그 업체로 바로 연결한다
  const currentCompany = path.match(/^\/companies\/([^/?]+)/)?.[1] ?? null;

  const openDialog = (d: HTMLDialogElement | null) => {
    opener.current = document.activeElement as HTMLElement;
    d?.showModal();
  };
  const closeAll = () => {
    registerRef.current?.close();
    searchRef.current?.close();
  };
  useEffect(() => {
    // 대화상자를 닫으면 연 버튼으로 포커스를 돌려준다
    const restore = () => { setMode(null); setQ(''); opener.current?.focus?.(); };
    const r = registerRef.current, s = searchRef.current;
    r?.addEventListener('close', restore);
    s?.addEventListener('close', restore);
    return () => { r?.removeEventListener('close', restore); s?.removeEventListener('close', restore); };
  }, []);
  useEffect(() => { closeAll(); }, [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const openSearch = () => { openDialog(searchRef.current); setTimeout(() => searchInput.current?.focus(), 30); };
  const openRegister = () => openDialog(registerRef.current);
  const go = (mode: Mode, id: string) => router.push(`/companies/${id}?${mode === 'contact' ? 'log' : 'next'}=1`);
  const pickMode = (m: Mode) => {
    // 업체 화면 안에서는 그 화면의 입력 창을 바로 연다
    if (currentCompany) { closeAll(); window.dispatchEvent(new CustomEvent('chaeum:register', { detail: m })); return; }
    setMode(m);
  };

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const d = t.replace(/\D/g, '');
    return companies.filter((c) => !t || `${c.name} ${c.ceo}`.toLowerCase().includes(t) || (d.length >= 3 && c.digits.includes(d))).slice(0, 8);
  }, [q, companies]);

  const syncTime = new Date(loadedAt).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' });
  const moreActive = MORE_PATHS.some((p) => path.startsWith(p));

  return (
    <div className="shell">
      <nav className="side" aria-label="주 메뉴">
        <Link href="/" className="brand"><span className="brand-mark" aria-hidden /><span><b>채움 기업컨설팅</b><small>자문 업무 데스크</small></span></Link>
        <button type="button" className="side-search" onClick={openSearch}><Icon name="search" />업체 검색 <span className="muted small" style={{ marginLeft: 'auto' }}>/</span></button>
        <button type="button" className="btn primary side-register" onClick={openRegister}><Icon name="plus" />등록</button>
        {NAV.map((it) => (
          <Link key={it.href} href={it.href} className="nav-link"
            aria-current={(it.href === '/more' ? moreActive : isActive(path, it.href)) ? 'page' : undefined}>
            <Icon name={it.icon} />{it.label}
            {it.href === '/tasks' && urgent > 0 && <span className="count" aria-label={`처리할 일 ${urgent}건`}>{urgent}</span>}
          </Link>
        ))}
        <div className="side-foot">
          <span className="sync">노션 동기화 {syncTime}</span>
          <button type="button" className="nav-link" onClick={() => start(() => refresh())} disabled={pending}><Icon name="refresh" />{pending ? '불러오는 중…' : '노션 새로고침'}</button>
          <form action={logout}><button className="nav-link"><Icon name="logout" />로그아웃</button></form>
        </div>
      </nav>

      <div className="content">
        <header className="topbar">
          <Link href="/" className="brand"><span className="brand-mark" aria-hidden /><span><b>채움 기업컨설팅</b><small>자문 업무 데스크</small></span></Link>
          <button type="button" className="icon-btn" onClick={openSearch} aria-label="업체 검색"><Icon name="search" /></button>
          <Link href="/tasks?f=now" className="icon-btn" aria-label={urgent ? `처리할 일 ${urgent}건` : '처리할 일 없음'}>
            <Icon name="bell" />{urgent > 0 && <span className="dot" aria-hidden>{urgent > 9 ? '9+' : urgent}</span>}
          </Link>
        </header>
        <main className="main" id="main">{children}</main>
      </div>

      <nav className="bottomnav" aria-label="하단 메뉴">
        {NAV.slice(0, 1).concat(NAV.slice(2, 3)).map((it) => (
          <Link key={it.href} href={it.href} className="tab"
            aria-current={isActive(path, it.href) || (it.href === '/' && path.startsWith('/tasks')) ? 'page' : undefined}><Icon name={it.icon} />{it.label}</Link>
        ))}
        <button type="button" className="tab tab-plus" onClick={openRegister} aria-label="등록"><span className="plus"><Icon name="plus" /></span>등록</button>
        {[NAV[3], NAV[4]].map((it) => (
          <Link key={it.href} href={it.href} className="tab"
            aria-current={(it.href === '/more' ? moreActive : isActive(path, it.href)) ? 'page' : undefined}>
            <Icon name={it.icon} />{it.label}
          </Link>
        ))}
      </nav>

      <dialog ref={registerRef} className="sheet" aria-labelledby="reg-title" onClick={(e) => { if (e.target === e.currentTarget) closeAll(); }}>
        <div className="sheet-in">
          <div className="sheet-head">
            <h2 id="reg-title">{mode ? (mode === 'contact' ? '어느 업체와 접촉했나요?' : '어느 업체의 할 일인가요?') : '무엇을 등록할까요?'}</h2>
            <button type="button" className="btn ghost sm" onClick={closeAll} aria-label="닫기"><Icon name="close" /></button>
          </div>
          {!mode ? (
            <div className="pick-list">
              <Link href="/admin/new" className="pick" onClick={closeAll}>
                <span className="mi qi c1"><Icon name="building" /></span><span><b>신규 업체</b><small>노션 업체 DB에 새 업체 등록</small></span>
              </Link>
              <button type="button" className="pick" onClick={() => pickMode('contact')}>
                <span className="mi qi c2"><Icon name="phone" /></span><span><b>접촉 기록</b><small>방문·전화·문자 내용 남기기</small></span>
              </button>
              <button type="button" className="pick" onClick={() => pickMode('next')}>
                <span className="mi qi c3"><Icon name="tasks" /></span><span><b>할 일 · 일정</b><small>업체의 다음 액션과 날짜 정하기 (일정에 표시)</small></span>
              </button>
            </div>
          ) : (
            <>
              <label className="search">
                <Icon name="search" /><span className="sr">업체 검색</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="업체명·대표자" autoComplete="off" />
              </label>
              <div className="pick-list">
                {results.length === 0 ? <p className="empty">찾는 업체가 없습니다.</p> : results.map((c) => (
                  <button key={c.id} type="button" className="pick" onClick={() => { closeAll(); go(mode, c.id); }}>
                    <span className="mi qi c1"><Icon name="building" /></span><span><b>{c.name}</b><small>{[c.ceo, c.status].filter(Boolean).join(' · ')}</small></span>
                  </button>
                ))}
              </div>
              <button type="button" className="btn ghost" onClick={() => { setMode(null); setQ(''); }}><Icon name="back" />등록 종류 다시 고르기</button>
            </>
          )}
        </div>
      </dialog>

      <dialog ref={searchRef} className="sheet" aria-labelledby="search-title" onClick={(e) => { if (e.target === e.currentTarget) closeAll(); }}>
        <form className="sheet-in" onSubmit={(e) => { e.preventDefault(); if (results[0]) { closeAll(); router.push(`/companies/${results[0].id}`); } }}>
          <div className="sheet-head">
            <h2 id="search-title">업체 검색</h2>
            <button type="button" className="btn ghost sm" onClick={closeAll} aria-label="닫기"><Icon name="close" /></button>
          </div>
          <label className="search">
            <Icon name="search" /><span className="sr">업체명, 대표자, 전화번호 또는 사업자번호</span>
            <input ref={searchInput} value={q} onChange={(e) => setQ(e.target.value)} placeholder="업체명·대표자·전화·사업자번호" autoComplete="off" />
          </label>
          <div className="pick-list" aria-live="polite">
            {results.length === 0 ? <p className="empty">찾는 업체가 없습니다.</p> : results.map((c) => (
              <Link key={c.id} href={`/companies/${c.id}`} className="pick" onClick={closeAll}>
                <span className="mi qi c1"><Icon name="building" /></span><span><b>{c.name}</b><small>{[c.ceo, c.status].filter(Boolean).join(' · ')}</small></span>
              </Link>
            ))}
          </div>
          {q.trim() && <Link href={`/companies?q=${encodeURIComponent(q.trim())}`} className="text-link" onClick={closeAll}>업체 목록에서 전체 결과 보기<Icon name="chevron" /></Link>}
        </form>
      </dialog>
    </div>
  );
}
