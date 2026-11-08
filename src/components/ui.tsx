import type { ReactNode } from 'react';
import { useApp } from '../state';
import { rankOf, researcherOf, levelFromXp } from '../lib/game';
import type { Tier, User } from '../types';

export function Bar({ ratio }: { ratio: number }) {
  return <div className="bar"><div className="bar-fill" style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }} /></div>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function TierBadge({ tier }: { tier: Tier | 'community' }) {
  const { t } = useApp();
  return <span className={`tier tier-${tier}`}>{t.tiers[tier]}</span>;
}

export function Titles({ user }: { user: Pick<User, 'xp' | 'approvedCount'> }) {
  const { t } = useApp();
  const r = researcherOf(user);
  return (
    <span className="titles">
      <span className="title-rank">{t.ranks[rankOf(levelFromXp(user.xp))]}</span>
      {r !== 'none' && <span className="title-researcher">✦ {t.researcher[r]}</span>}
    </span>
  );
}
