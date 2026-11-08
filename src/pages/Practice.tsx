import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../state';
import { TIERS, type Tier } from '../types';
import { TierBadge } from '../components/ui';
import { MathText } from '../components/MathText';
import { Icon } from '../components/Icon';

type Filter = Tier | 'community' | 'all';

export function Practice() {
  const { t, lang, user, problems } = useApp();
  const [params, setParams] = useSearchParams();
  const filter = (params.get('tier') as Filter) || 'all';
  const list = problems.filter((p) =>
    filter === 'all' ? true : filter === 'community' ? !!p.authorId : p.tier === filter && !p.authorId);
  const tabs: Filter[] = ['all', ...TIERS, 'community'];

  return (
    <div className="stack">
      <header className="page-head">
        <h1>{t.practice.title}</h1>
        {filter !== 'all' && <p className="muted">{t.tierDesc[filter]}</p>}
      </header>
      <div className="tabs-scroll" role="tablist">
        {tabs.map((tab) => (
          <button key={tab} role="tab" aria-selected={filter === tab} className={`chip ${filter === tab ? 'on' : ''}`}
            onClick={() => setParams(tab === 'all' ? {} : { tier: tab })}>
            {tab === 'all' ? t.practice.all : t.tiers[tab]}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="muted center pad">{t.practice.empty}</p>}
      <ul className="problem-list">
        {list.map((p) => {
          const solved = !!user?.solved[p.id];
          return (
            <li key={p.id}>
              <Link to={`/practice/${p.id}`} className={`problem-row ${solved ? 'solved' : ''}`}>
                <div className="problem-row-meta">
                  <TierBadge tier={p.authorId ? 'community' : p.tier} />
                  <span className="muted small">{t.topics[p.topic]}</span>
                  <span className="muted small mono">★{p.rating}</span>
                  {solved && <span className="ok small"><Icon name="check" size={14} /> {t.practice.solvedTag}</span>}
                </div>
                <MathText className="problem-row-text" text={p.statement[lang]} />
                <div className="muted small source-line">
                  <MathText text={p.source} />{p.authorName && ` · ${t.practice.by} ${p.authorName}`}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
