import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../state';
import { BOTS, addDuel, allProblems, listDuels, updateUser } from '../lib/store';
import { eloDelta, expected, grade, nextStreak } from '../lib/game';
import type { Problem } from '../types';
import { AnswerInput } from '../components/AnswerInput';
import { MathText } from '../components/MathText';
import { TierBadge } from '../components/ui';
import { Icon } from '../components/Icon';

const ROUNDS = 5;
const ROUND_SECONDS = 90;
const DUEL_XP = { win: 60, draw: 30, loss: 15 } as const;

interface BotPlan { correct: boolean; time: number }
interface RoundResult { mine: number; theirs: number; myCorrect: boolean; theirCorrect: boolean }
interface Match { opponent: string; oppRating: number; problems: Problem[]; plan: BotPlan[] }

function makeMatch(rating: number): Match {
  const bot = BOTS[Math.floor(Math.random() * BOTS.length)];
  const oppRating = Math.round(rating + (Math.random() * 240 - 120));
  const pool = [...allProblems()].sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating)).slice(0, 14);
  const problems = pool.sort(() => Math.random() - 0.5).slice(0, ROUNDS).sort((a, b) => a.rating - b.rating);
  const plan = problems.map((p) => ({
    correct: Math.random() < expected(oppRating, p.rating),
    time: Math.round(12 + Math.random() * 62),
  }));
  return { opponent: bot.name, oppRating, problems, plan };
}

export function Duel() {
  const { t, lang, user, setUser } = useApp();
  const [phase, setPhase] = useState<'lobby' | 'matching' | 'playing' | 'between' | 'result'>('lobby');
  const [match, setMatch] = useState<Match | null>(null);
  const [round, setRound] = useState(0);
  const [left, setLeft] = useState(ROUND_SECONDS);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [outcome, setOutcome] = useState<{ result: 'win' | 'loss' | 'draw'; delta: number; xp: number } | null>(null);
  const finishing = useRef(false);

  const history = useMemo(() => (user ? listDuels(user.id).slice(0, 5) : []), [user, phase]);

  // 라운드 타이머
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [phase, round]);

  useEffect(() => {
    if (phase === 'playing' && left <= 0) endRound(false);
  }, [left, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  const start = () => {
    setPhase('matching');
    setResults([]);
    setOutcome(null);
    setRound(0);
    finishing.current = false;
    window.setTimeout(() => {
      setMatch(makeMatch(user.rating));
      setLeft(ROUND_SECONDS);
      setPhase('playing');
    }, 1400);
  };

  function endRound(myCorrect: boolean) {
    if (!match || finishing.current) return;
    finishing.current = true;
    const plan = match.plan[round];
    const r: RoundResult = {
      myCorrect,
      mine: myCorrect ? 100 + Math.max(0, left) : 0,
      theirCorrect: plan.correct,
      theirs: plan.correct ? 100 + (ROUND_SECONDS - plan.time) : 0,
    };
    const all = [...results, r];
    setResults(all);
    setPhase('between');
    window.setTimeout(() => {
      finishing.current = false;
      if (round + 1 < ROUNDS) {
        setRound(round + 1);
        setLeft(ROUND_SECONDS);
        setPhase('playing');
      } else {
        finish(all);
      }
    }, 1600);
  }

  function finish(all: RoundResult[]) {
    if (!match || !user) return;
    const my = all.reduce((s, r) => s + r.mine, 0);
    const their = all.reduce((s, r) => s + r.theirs, 0);
    const result = my > their ? 'win' : my < their ? 'loss' : 'draw';
    const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    const delta = eloDelta(user.rating, match.oppRating, score, 32);
    const xp = DUEL_XP[result];
    const updated = updateUser(user.id, (u) => {
      u.rating = Math.max(100, u.rating + delta);
      u.xp += xp;
      u.streak = nextStreak(u.streak);
      u.duels = { w: u.duels.w + (result === 'win' ? 1 : 0), l: u.duels.l + (result === 'loss' ? 1 : 0), d: u.duels.d + (result === 'draw' ? 1 : 0) };
      return u;
    });
    addDuel({ userId: user.id, opponent: match.opponent, opponentRating: match.oppRating, myScore: my, oppScore: their, result, ratingDelta: delta });
    if (updated) setUser(updated);
    setOutcome({ result, delta, xp });
    setPhase('result');
  }

  const myTotal = results.reduce((s, r) => s + r.mine, 0);
  const theirTotal = results.reduce((s, r) => s + r.theirs, 0);
  const problem = match?.problems[round];
  const plan = match?.plan[round];
  const elapsed = ROUND_SECONDS - left;
  const oppDone = plan && elapsed >= plan.time;

  /* ───── 로비 ───── */
  if (phase === 'lobby' || phase === 'matching') {
    return (
      <div className="stack narrow">
        <header className="page-head"><h1>{t.duel.title}</h1><p className="muted">{t.duel.desc}</p></header>
        <section className="card duel-lobby">
          <div className="vs-row">
            <div className="fighter"><div className="avatar me">{user.username.slice(0, 1).toUpperCase()}</div><b>{user.username}</b><span className="mono muted">{user.rating}</span></div>
            <span className="vs">{t.duel.vs}</span>
            <div className="fighter"><div className={`avatar ${phase === 'matching' ? 'searching' : ''}`}>?</div><b>{t.duel.opponent}</b><span className="mono muted">±120</span></div>
          </div>
          <button className="btn primary block" onClick={start} disabled={phase === 'matching'}>
            {phase === 'matching' ? '…' : <><Icon name="swords" size={18} /> {t.duel.find}</>}
          </button>
          <p className="muted small">{t.duel.note}</p>
        </section>
        {history.length > 0 && (
          <section className="card">
            <h3 className="section-title">{t.duel.history}</h3>
            <ul className="history">
              {history.map((d) => (
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
  const last = results[round];
  return (
    <div className="stack narrow">
      <section className="scoreboard card">
        <div className="sb-side"><b>{t.duel.you}</b><span className="mono sb-score">{myTotal}</span></div>
        <div className="sb-mid">
          <span className="muted small">{t.duel.round} {round + 1}/{ROUNDS}</span>
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
            <AnswerInput key={round} problem={problem} submitLabel={t.duel.submit} onSubmit={(v) => endRound(grade(problem.answer, v))} />
            <button className="btn ghost block" onClick={() => endRound(false)}>{t.duel.skip}</button>
            {oppDone && <p className={`opp-status ${plan.correct ? 'ok' : 'bad'}`}>{plan.correct ? t.duel.oppSolved : t.duel.oppMissed}</p>}
          </>
        ) : last && (
          <div className="round-summary">
            <div className={`feedback ${last.myCorrect ? 'good' : 'bad'}`}><Icon name={last.myCorrect ? 'check' : 'x'} /> {t.duel.you} +{last.mine}</div>
            <div className={`feedback ${last.theirCorrect ? 'good' : 'bad'}`}><Icon name={last.theirCorrect ? 'check' : 'x'} /> {match.opponent} +{last.theirs}</div>
          </div>
        )}
      </article>
    </div>
  );
}
