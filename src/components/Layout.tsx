import { NavLink, Outlet } from 'react-router-dom';
import { useApp } from '../state';
import { Logo } from './Logo';
import { Icon } from './Icon';
import { levelFromXp } from '../lib/game';

export function LangToggle() {
  const { lang, setLang } = useApp();
  return (
    <button className="chip lang" onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')} aria-label="Language">
      <Icon name="globe" size={16} /> {lang === 'ko' ? 'EN' : '한국어'}
    </button>
  );
}

export function Layout() {
  const { t, user } = useApp();
  const items = [
    { to: '/', icon: 'home', label: t.nav.home, end: true },
    { to: '/practice', icon: 'book', label: t.nav.practice },
    { to: '/duel', icon: 'swords', label: t.nav.duel },
    { to: '/ranking', icon: 'trophy', label: t.nav.ranking },
    { to: '/lab', icon: 'flask', label: t.nav.lab },
    { to: '/profile', icon: 'user', label: t.nav.profile },
  ];
  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand"><Logo size={34} /><span>{t.appName}</span></NavLink>
        <nav className="topnav">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className="topnav-link">{i.label}</NavLink>
          ))}
        </nav>
        <div className="topbar-right">
          <LangToggle />
          {user && <span className="lv-pill">Lv.{levelFromXp(user.xp)}</span>}
        </div>
      </header>
      <main className="content"><Outlet /></main>
      <nav className="tabbar">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className="tab">
            <Icon name={i.icon} size={22} /><span>{i.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
