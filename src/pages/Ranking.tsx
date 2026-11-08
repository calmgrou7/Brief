import { useState } from 'react';
import { useApp, useAsync } from '../state';
import { api, type Board, type BoardEntry } from '../lib/api';
import { levelFromXp } from '../lib/game';

export function Ranking() {
  const { t, user } = useApp();
  const [board, setBoard] = useState<Board>('rating');
  const { data, error, reload } = useAsync(() => api.leaderboard(board), [board, user?.rating, user?.xp]);
  const key: (e: BoardEntry) => number = board === 'rating' ? (e) => e.rating : board === 'xp' ? (e) => e.xp : (e) => e.approved;
  const rows = data?.rows ?? [];
  const myValue = user ? (board === 'rating' ? user.rating : board === 'xp' ? user.xp : user.approvedCount) : 0;
  const top3 = rows.slice(0, 3);

  return (
    <div className="stack narrow">
      <header className="page-head"><h1>{t.ranking.title}</h1></header>
      <div className="seg">
        {(['rating', 'xp', 'researchers'] as Board[]).map((b) => (
          <button key={b} className={board === b ? 'on' : ''} onClick={() => setBoard(b)}>{t.ranking[b]}</button>
        ))}
      </div>

      {error && <p className="error">{t.common.error} <button className="chip" onClick={reload}>{t.common.retry}</button></p>}
      {!data && !error && <p className="muted center pad">{t.common.loading}</p>}
      {data && rows.length === 0 && <p className="muted center pad">{t.practice.empty}</p>}

      {top3.length === 3 && (
        <div className="podium">
          {[top3[1], top3[0], top3[2]].map((e, i) => (
            <div key={e.id} className={`podium-col p${[2, 1, 3][i]}`}>
              <div className="avatar">{e.name.slice(0, 1).toUpperCase()}</div>
              <b className="ellipsis">{e.name}</b>
              <span className="mono">{key(e).toLocaleString()}</span>
              <div className="podium-block">{[2, 1, 3][i]}</div>
            </div>
          ))}
        </div>
      )}

      {data?.myRank && (
        <div className="card me-rank row between">
          <span>{t.ranking.you} · <b>#{data.myRank}</b> / {data.total}</span>
          <span className="mono">{myValue.toLocaleString()}</span>
        </div>
      )}

      {rows.length > 0 && <ol className="board card">
        {rows.map((e, i) => (
          <li key={e.id} className={`board-row ${e.id === user?.id ? 'me' : ''}`}>
            <span className="rank mono">{i + 1}</span>
            <span className="avatar sm">{e.name.slice(0, 1).toUpperCase()}</span>
            <span className="name"><span className="ellipsis">{e.name}</span>{e.approved >= 3 && <span className="title-researcher sm">✦</span>}</span>
            <span className="muted small">Lv.{levelFromXp(e.xp)}</span>
            <span className="mono val">{key(e).toLocaleString()}</span>
          </li>
        ))}
      </ol>}
    </div>
  );
}
