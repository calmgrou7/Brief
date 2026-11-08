import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../state';
import { allProblems, findProblem } from '../lib/store';
import { grade } from '../lib/game';
import { recordAttempt, revealExplanation, type AttemptResult } from '../lib/actions';
import { AnswerInput } from '../components/AnswerInput';
import { MathText } from '../components/MathText';
import { TierBadge } from '../components/ui';
import { Icon } from '../components/Icon';

export function ProblemPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { t, f, lang, user, setUser } = useApp();
  const problem = findProblem(id);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [attemptKey, setAttemptKey] = useState(0);

  if (!problem || !user) return <p className="pad">404</p>;
  const alreadySolved = !!user.solved[problem.id] && !result?.firstSolve;
  const solvedNow = result?.correct;

  const onSubmit = (input: string | number) => {
    const r = recordAttempt(user.id, problem, grade(problem.answer, input));
    if (!r) return;
    setResult(r);
    setUser(r.user);
    if (!r.correct) setAttemptKey((k) => k + 1);
  };

  const goNext = () => {
    const list = allProblems();
    const next = list.find((p) => !user.solved[p.id] && p.id !== problem.id) ?? list[(list.indexOf(problem) + 1) % list.length];
    setResult(null); setShowHint(false); setReveal(false);
    nav(`/practice/${next.id}`);
  };

  return (
    <div className="stack narrow">
      <Link to="/practice" className="back"><Icon name="back" size={18} /> {t.practice.back}</Link>
      <article className="card problem-card">
        <div className="row gap wrap">
          <TierBadge tier={problem.authorId ? 'community' : problem.tier} />
          <span className="muted small">{t.topics[problem.topic]}</span>
          <span className="muted small mono">★{problem.rating}</span>
        </div>
        <MathText className="statement" text={problem.statement[lang]} />
        <p className="source"><span>{t.practice.source}</span> <MathText text={problem.source} />
          {problem.authorName && <> · {t.practice.by} <b>{problem.authorName}</b></>}</p>

        {alreadySolved && <p className="notice">{t.practice.alreadySolved}</p>}

        {!solvedNow && (
          <AnswerInput key={`${problem.id}-${attemptKey}`} problem={problem} submitLabel={t.practice.submit} onSubmit={onSubmit} />
        )}

        {result && (
          <div className={`feedback ${result.correct ? 'good' : 'bad'}`} role="status">
            <Icon name={result.correct ? 'check' : 'x'} />
            <span>{result.correct ? t.practice.correct : t.practice.wrong}</span>
            {result.xpGained > 0 && <span className="pill">{f(t.practice.xpGain, { n: result.xpGained })}</span>}
            {result.ratingDelta !== 0 && (
              <span className="pill">{f(t.practice.ratingChange, { n: (result.ratingDelta > 0 ? '+' : '') + result.ratingDelta })}</span>
            )}
          </div>
        )}

        <div className="row gap wrap">
          {problem.hint && !solvedNow && (
            <button className="btn ghost" onClick={() => setShowHint((s) => !s)}><Icon name="bulb" size={18} /> {t.practice.showHint}</button>
          )}
          {!solvedNow && !reveal && (
            <button className="btn ghost" onClick={() => { const u = revealExplanation(user.id, problem); if (u) setUser(u); setReveal(true); }}>{t.practice.reveal}</button>
          )}
          {solvedNow && <button className="btn primary" onClick={goNext}>{t.practice.next} <Icon name="arrow" size={18} /></button>}
        </div>
        {showHint && problem.hint && <div className="hint"><b>{t.practice.hint}</b> <MathText text={problem.hint[lang]} /></div>}
        {(solvedNow || reveal || alreadySolved) && (
          <div className="explain">
            <h3>{t.practice.explanation}</h3>
            <MathText text={problem.explanation[lang]} />
          </div>
        )}
      </article>
    </div>
  );
}
