'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { Icon, type IconName } from './icons';
import { logout, refresh } from '../actions';

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: '홈', icon: 'home' },
  { href: '/companies', label: '업체', icon: 'building' },
  { href: '/links', label: '연계 대시보드', icon: 'link' },
  { href: '/admin', label: '관리자', icon: 'settings' },
];

const active = (path: string, href: string) => (href === '/' ? path === '/' : path.startsWith(href));

function RefreshButton({ className, withLabel }: { className: string; withLabel?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={className} onClick={() => start(() => refresh())} disabled={pending}
      aria-label="노션에서 새로고침" title="노션에서 새로고침">
      <Icon name="refresh" />
      {withLabel && (pending ? '불러오는 중…' : '노션 새로고침')}
    </button>
  );
}

export function SideNav({ loadedAt }: { loadedAt: string }) {
  const path = usePathname();
  return (
    <nav className="side" aria-label="주 메뉴">
      <Link href="/" className="brand">
        <span className="brand-mark" />
        <span><b>채움 기업컨설팅</b><small>관리 대시보드</small></span>
      </Link>
      {ITEMS.map((it) => (
        <Link key={it.href} href={it.href} className="nav-link" aria-current={active(path, it.href) ? 'page' : undefined}>
          <Icon name={it.icon} />{it.label}
        </Link>
      ))}
      <div className="side-foot">
        <RefreshButton className="nav-link" withLabel />
        <span className="small" style={{ color: 'var(--nav-muted)', padding: '0 12px' }}>
          불러온 시각 {new Date(loadedAt).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' })}
        </span>
        <form action={logout}><button className="nav-link"><Icon name="logout" />로그아웃</button></form>
      </div>
    </nav>
  );
}

export function TopBar() {
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand-mark" />
        <span><b>채움 기업컨설팅</b></span>
      </Link>
      <div className="topbar-actions">
        <RefreshButton className="icon-btn" />
        <form action={logout}><button className="icon-btn" aria-label="로그아웃"><Icon name="logout" /></button></form>
      </div>
    </header>
  );
}

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="하단 메뉴">
      {ITEMS.map((it) => (
        <Link key={it.href} href={it.href} className="tab" aria-current={active(path, it.href) ? 'page' : undefined}>
          <Icon name={it.icon} />{it.label === '연계 대시보드' ? '연계' : it.label}
        </Link>
      ))}
    </nav>
  );
}
