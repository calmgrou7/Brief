import { useApp } from '../state';
import { api } from '../lib/api';
import { levelProgress } from '../lib/game';
import { Bar, Stat, TierBadge, Titles } from '../components/ui';
import { TIERS } from '../types';

export function Profile() {
  const { t, lang, setLang, user, setUser, refresh, problems } = useApp();
  if (!user) return null;
  const prog = levelProgress(user.xp);
  const accuracy = user.totalAttempts ? Math.round((user.totalCorrect / user.totalAttempts) * 100) : 0;

  return (
    <div className="stack narrow">
      <section className="card profile-head">
        <div className="avatar xl">{user.username.slice(0, 1).toUpperCase()}</div>
        <div>
          <h1>{user.username}</h1>
          <Titles user={user} />
          <p className="muted small">{t.profile.joined} {new Date(user.createdAt).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')}</p>
        </div>
      </section>

      <section className="card">
        <div className="row between"><b>Lv.{prog.level}</b><span className="mono muted small">{user.xp.toLocaleString()} XP</span></div>
        <Bar ratio={prog.ratio} />
      </section>

      <section className="stats-row">
        <Stat label={t.home.rating} value={user.rating} />
        <Stat label={t.home.accuracy} value={`${accuracy}%`} sub={`${user.totalCorrect}/${user.totalAttempts}`} />
        <Stat label={t.profile.duels} value={`${user.duels.w}${t.profile.w} ${user.duels.l}${t.profile.l}`} sub={`${user.duels.d}${t.profile.d}`} />
        <Stat label={t.ranking.approved} value={user.approvedCount} />
      </section>

      <section className="card">
        <h3 className="section-title">{t.profile.byTier}</h3>
        <div className="tier-progress">
          {TIERS.map((tier) => {
            const list = problems.filter((p) => p.tier === tier);
            const done = list.filter((p) => user.solved[p.id]).length;
            return (
              <div key={tier} className="tier-progress-row">
                <TierBadge tier={tier} /><Bar ratio={list.length ? done / list.length : 0} /><span className="small muted mono">{done}/{list.length}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card row between">
        <span>{t.profile.lang}</span>
        <div className="seg compact">
          <button className={lang === 'ko' ? 'on' : ''} onClick={() => setLang('ko')}>한국어</button>
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>English</button>
        </div>
      </section>

      {import.meta.env.DEV && api.devBoost && (
        <button className="btn ghost" onClick={async () => { await api.devBoost?.(1000); await refresh(); }}>
          {t.profile.demoBoost}
        </button>
      )}
      <button className="btn danger" onClick={async () => { await api.signOut(); setUser(null); }}>{t.auth.logout}</button>
    </div>
  );
}
