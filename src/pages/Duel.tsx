import { useEffect, useRef, useState } from 'react';
import { useApp, useAsync } from '../state';
import { api, type DuelFinal, type DuelMatch, type DuelRound } from '../lib/api';
import { AnswerInput } from '../components/AnswerInput';
import { MathText } from '../components/MathText';
import { TierBadge } from '../components/ui';
import { Icon } from '../components/Icon';

const ROUND_SECONDS = 90;
const BETWEEN_MS = 1600;

type Phase = 'lobby' | 'matching' | 'playing' | 'between' | 'result';

export function Duel() {
  const { t, lang, user, refresh } = useApp();
  const [phase, setPhase] = useState<Phase>('lobby');
  const [match, setMatch] = useState<DuelMatch | null>(null);
  const [round, setRound] = useState(0);
  const [left, setLeft] = useState(ROUND_SECONDS);
  const [results, setResults] = useState<DuelRound[]>([]);
  const [outcome, setOutcome] = useState<DuelFinal | null>(null);
  const [error, setError] = useState('');
  const sending = useRef(false);
  const history = useAsync(() => api.duelHistory(), [phase === 'lobby' || phase === 'result']);

  // 라운드 타이머
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [phase, round]);

  useEffect(() => {
    if (phase === 'playing' && left <= 0) endRound(null);
  }, [left, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  const start = async () => {
    setPhase('matching'); setResults([]); setOutcome(null); setRound(0); setError('');
    sending.current = false;
    try {
      const [m] = await Promise.all([api.startDuel(), new Promise((r) => setTimeout(r, 1000))]);
      setMatch(m);
      setLeft(ROUND_SECONDS);
      setPhase('playing');
    } catch {
      setError(t.common.error);
      setPhase('lobby');
    }
  };

  async function endRound(input: string | number | null) {
    if (!match || sending.current) return;
    sending.current = true;
    setPhase('between');
    try {
      const r = await api.duelAnswer(match, round, input, Math.max(0, left));
      setResults((prev) => [...prev, r]);
      window.setTimeout(async () => {
        sending.current = false;
        if (r.final) {
          setOutcome(r.final);
          setPhase('result');
          await refresh();
        } else {
          setRound((x) => x + 1);
          setLeft(ROUND_SECONDS);
          setPhase('playing');
        }
      }, BETWEEN_MS);
    } catch {
      sending.current = false;
      setError(t.common.error);
      setPhase('lobby');
    }
  }

  const myTotal = results.reduce((s, r) => s + r.mine, 0);
  const theirTotal = results.reduce((s, r) => s + r.theirs, 0);
  const problem = match?.problems[round];
  const plan = match?.plan[round];
  const oppDone = plan && ROUND_SECONDS - left >= plan.time;

  /* ───── 로비 ───── */
  if (phase === 'lobby' || phase === 'matching') {
    const list = (history.data ?? []).slice(0, 5);
    return (
      <div className="stack narrow">
        <header className="page-head"><h1>{t.duel.title}</h1><p className="muted">{t.duel.desc}</p></header>
        <section className="card duel-lobby">
          <div className="vs-row">
            <div className="fighter"><div className="avatar me">{user.username.slice(0, 1).toUpperCase()}</div><b>{user.username}</b><span className="mono muted">{user.rating}</span></div>
            <span className="vs">{t.duel.vs}</span>
            <div className="fighter"><div className={`avatar ${phase === 'matching' ? 'searching' : ''}`}>?</div><b>{t.duel.opponent}</b><span className="mono muted">±120</span></div>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn primary block" onClick={start} disabled={phase === 'matching'}>
            {phase === 'matching' ? '…' : <><Icon name="swords" size={18} /> {t.duel.find}</>}
          </button>
          <p className="muted small">{t.duel.note}</p>
        </section>
        {list.length > 0 && (
          <section className="card">
            <h3 className="section-title">{t.duel.history}</h3>
            <ul className="history">
              {list.map((d) => (
                <li key={d.id} className={`history-row ${d.result}`}>
                  <span className="result-dot" />
                  <span>{d.opponent} <span className="muted mono small">{d.opponentRating}</span></span>
                  <span className="mono">{d.myScore} : {d.oppScore}</span>
                  <span className={`mono ${d.ratingDelta >= 0 ? 'ok' : 'bad'}`}>{d.ratingDelta >= 0 ? '+' : ''}{d.ratingDelta}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  /* ───── 결과 ───── */
  if (phase === 'result' && outcome && match) {
    return (
      <div className="stack narrow">
        <section className={`card duel-result ${outcome.result}`}>
          <p className="eyebrow">{match.opponent} · {match.oppRating}</p>
          <h1>{t.duel[outcome.result]}</h1>
          <p className="score-big mono">{myTotal} <span>:</span> {theirTotal}</p>
          <div className="row gap center-row">
            <span className="pill">{outcome.delta >= 0 ? '+' : ''}{outcome.delta} {t.home.rating}</span>
            <span className="pill">+{outcome.xp} XP</span>
          </div>
          <ol className="round-dots">
            {results.map((r, i) => (
              <li key={i}><span className={r.myCorrect ? 'ok' : 'bad'}>{r.mine}</span><small>R{i + 1}</small><span className={r.theirCorrect ? 'ok' : 'bad'}>{r.theirs}</span></li>
            ))}
          </ol>
          <button className="btn primary block" onClick={start}>{t.duel.again}</button>
        </section>
      </div>
    );
  }

  /* ───── 진행 중 ───── */
  if (!match || !problem) return null;
  const last = phase === 'between' ? results[round] : undefined;
  return (
    <div className="stack narrow">
      <section className="scoreboard card">
        <div className="sb-side"><b>{t.duel.you}</b><span className="mono sb-score">{myTotal}</span></div>
        <div className="sb-mid">
          <span className="muted small">{t.duel.round} {round + 1}/{match.problems.length}</span>
          <span className={`timer mono ${left <= 10 ? 'urgent' : ''}`}><Icon name="clock" size={16} /> {Math.max(0, left)}s</span>
        </div>
        <div className="sb-side right"><b>{match.opponent}</b><span className="mono sb-score">{theirTotal}</span></div>
        <div className="timer-bar"><div style={{ width: `${(Math.max(0, left) / ROUND_SECONDS) * 100}%` }} /></div>
      </section>

      <article className="card problem-card">
        <div className="row gap wrap"><TierBadge tier={problem.tier} /><span className="muted small">{t.topics[problem.topic]}</span></div>
        <MathText className="statement" text={problem.statement[lang]} />
        {phase === 'playing' ? (
          <>
            <AnswerInput key={round} problem={problem} submitLabel={t.duel.submit} onSubmit={(v) => endRound(v)} />
            <button className="btn ghost block" onClick={() => endRound(null)}>{t.duel.skip}</button>
            {oppDone && <p className={`opp-status ${plan.correct ? 'ok' : 'bad'}`}>{plan.correct ? t.duel.oppSolved : t.duel.oppMissed}</p>}
          </>
        ) : last ? (
          <div className="round-summary">
            <div className={`feedback ${last.myCorrect ? 'good' : 'bad'}`}><Icon name={last.myCorrect ? 'check' : 'x'} /> {t.duel.you} +{last.mine}</div>
            <div className={`feedback ${last.theirCorrect ? 'good' : 'bad'}`}><Icon name={last.theirCorrect ? 'check' : 'x'} /> {match.opponent} +{last.theirs}</div>
          </div>
        ) : <p className="muted center">{t.common.loading}</p>}
      </article>
    </div>
  );
}
