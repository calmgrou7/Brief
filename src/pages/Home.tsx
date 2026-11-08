import { Link } from 'react-router-dom';
import { useApp } from '../state';
import { COMPOSER_LEVEL, dayKey, levelProgress } from '../lib/game';
import { allProblems } from '../lib/store';
import { Bar, Stat, TierBadge, Titles } from '../components/ui';
import { MathText } from '../components/MathText';
import { Icon } from '../components/Icon';
import { TIERS } from '../types';

export function Home() {
  const { t, f, user, lang } = useApp();
  if (!user) return null;
  const prog = levelProgress(user.xp);
  const problems = allProblems();
  const solvedCount = Object.keys(user.solved).length;
  const accuracy = user.totalAttempts ? Math.round((user.totalCorrect / user.totalAttempts) * 100) : 0;

  // 오늘의 문제: 날짜로 고정된 문제
  const seed = [...dayKey()].reduce((s, c) => s + c.charCodeAt(0), 0);
  const daily = problems[seed % problems.length];
  // 이어서 풀기: 내 레이팅에 가장 가까운 미해결 문제
  const nextUp = problems.filter((p) => !user.solved[p.id]).sort((a, b) => Math.abs(a.rating - user.rating) - Math.abs(b.rating - user.rating))[0];

  return (
    <div className="stack">
      <section className="card hero-card">
        <div className="hero-card-head">
          <div>
            <p className="muted">{t.home.hello},</p>
            <h2>{user.username}</h2>
            <Titles user={user} />
          </div>
          <div className="level-ring" style={{ ['--p' as string]: prog.ratio }}>
            <span>Lv.<b>{prog.level}</b></span>
          </div>
        </div>
        <Bar ratio={prog.ratio} />
        <p className="small muted">{prog.needed - prog.current} XP {t.home.toNext}</p>
      </section>

      <section className="stats-row">
        <Stat label={t.home.rating} value={user.rating} />
        <Stat label={t.home.streak} value={<><Icon name="flame" size={18} /> {user.streak.count}{t.home.days}</>} />
        <Stat label={t.home.solved} value={`${solvedCount}/${problems.length}`} />
        <Stat label={t.home.accuracy} value={`${accuracy}%`} />
      </section>

      <div className="grid-2">
        {daily && (
          <Link to={`/practice/${daily.id}`} className="card link-card">
            <div className="row between"><span className="eyebrow"><Icon name="sparkle" size={14} /> {t.home.daily}</span><TierBadge tier={daily.tier} /></div>
            <MathText className="problem-preview" text={daily.statement[lang]} />
            <span className="cta">{t.practice.submit} <Icon name="arrow" size={16} /></span>
          </Link>
        )}
        <Link to="/duel" className="card link-card accent">
          <span className="eyebrow"><Icon name="swords" size={14} /> {t.home.quickDuel}</span>
          <p className="big-copy">{t.duel.desc}</p>
          <span className="cta">{t.duel.find} <Icon name="arrow" size={16} /></span>
        </Link>
      </div>

      {nextUp && (
        <Link to={`/practice/${nextUp.id}`} className="card row between link-card slim">
          <div>
            <span className="eyebrow">{t.home.continue}</span>
            <div className="row gap"><TierBadge tier={nextUp.tier} /><span className="muted small">{t.topics[nextUp.topic]} · ★{nextUp.rating}</span></div>
          </div>
          <Icon name="arrow" />
        </Link>
      )}

      <section className="card">
        <h3 className="section-title">{t.profile.byTier}</h3>
        <div className="tier-progress">
          {TIERS.map((tier) => {
            const list = problems.filter((p) => p.tier === tier);
            const done = list.filter((p) => user.solved[p.id]).length;
            return (
              <Link key={tier} to={`/practice?tier=${tier}`} className="tier-progress-row">
                <TierBadge tier={tier} />
                <Bar ratio={list.length ? done / list.length : 0} />
                <span className="small muted mono">{done}/{list.length}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <Link to="/lab" className="card row between link-card slim">
        <span className="row gap"><Icon name={prog.level >= COMPOSER_LEVEL ? 'flask' : 'lock'} />
          {prog.level >= COMPOSER_LEVEL ? t.home.composerOpen : f(t.home.composerLocked, { n: COMPOSER_LEVEL })}</span>
        <Icon name="arrow" />
      </Link>
    </div>
  );
}
