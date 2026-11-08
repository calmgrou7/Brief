import { useState, type FormEvent } from 'react';
import { useApp } from '../state';
import { api } from '../lib/api';
import { Logo } from '../components/Logo';
import { Icon } from '../components/Icon';
import { LangToggle } from '../components/Layout';
import { MathText } from '../components/MathText';

export function Auth() {
  const { t, setUser } = useApp();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (mode === 'signup' && (username.trim().length < 2 || password.length < 6)) return setError(t.auth.errShort);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const r = await api.signUp(username, email, password);
        if ('user' in r) setUser(r.user);
        else { setInfo(t.auth.checkEmail); setMode('login'); }
      } else {
        setUser(await api.signIn(email, password));
      }
    } catch (err) {
      setError((err as Error).message === 'exists' ? t.auth.errExists : t.auth.errInvalid);
    } finally {
      setBusy(false);
    }
  };

  const features = [
    { icon: 'book', title: t.landing.f1t, desc: t.landing.f1d },
    { icon: 'swords', title: t.landing.f2t, desc: t.landing.f2d },
    { icon: 'flask', title: t.landing.f3t, desc: t.landing.f3d },
  ];

  return (
    <div className="landing">
      <div className="landing-top"><LangToggle /></div>
      <section className="hero">
        <Logo size={96} />
        <h1>{t.appName}</h1>
        <p className="lead">{t.tagline}</p>
        <div className="hero-formula" aria-hidden="true">
          <MathText text="$e^{i\pi}+1=0$" />
        </div>
      </section>

      <div className="landing-grid">
        <ul className="features">
          {features.map((f) => (
            <li key={f.title} className="feature">
              <span className="feature-icon"><Icon name={f.icon} size={22} /></span>
              <div><h3>{f.title}</h3><p>{f.desc}</p></div>
            </li>
          ))}
        </ul>

        <form className="card auth" onSubmit={submit}>
          <div className="seg">
            <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>{t.auth.signup}</button>
            <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>{t.auth.login}</button>
          </div>
          {mode === 'signup' && (
            <label className="field"><span>{t.auth.username}</span>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="nickname" required /></label>
          )}
          <label className="field"><span>{t.auth.email}</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
          <label className="field"><span>{t.auth.password}</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /></label>
          {error && <p className="error">{error}</p>}
          {info && <p className="ok small">{info}</p>}
          <button className="btn primary block" disabled={busy}>{mode === 'signup' ? t.landing.start : t.auth.login}</button>
          {api.mode === 'local' && <p className="muted small">{t.auth.localNote}</p>}
        </form>
      </div>
    </div>
  );
}
