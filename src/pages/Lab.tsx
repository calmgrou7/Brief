import { useState, type FormEvent } from 'react';
import { useApp, useAsync } from '../state';
import { api } from '../lib/api';
import { COMPOSER_LEVEL, RESEARCHER_APPROVALS, levelFromXp, parseNumber, xpForLevel } from '../lib/game';
import { TIERS, TOPICS, type Answer, type CommunityProblem, type Tier, type Topic } from '../types';
import { MathText } from '../components/MathText';
import { Bar, TierBadge } from '../components/ui';
import { Icon } from '../components/Icon';

type Tab = 'create' | 'review' | 'mine';

export function Lab() {
  const { t, f, user } = useApp();
  const [tab, setTab] = useState<Tab>('create');
  const level = user ? levelFromXp(user.xp) : 0;
  const unlocked = level >= COMPOSER_LEVEL;
  const queue = useAsync(() => (unlocked ? api.reviewQueue() : Promise.resolve([])), [unlocked, tab]);
  const mineQ = useAsync(() => (unlocked ? api.myProblems() : Promise.resolve([])), [unlocked, tab]);
  if (!user) return null;

  if (level < COMPOSER_LEVEL) {
    const need = xpForLevel(COMPOSER_LEVEL);
    return (
      <div className="stack narrow">
        <header className="page-head"><h1>{t.lab.title}</h1></header>
        <section className="card locked">
          <span className="lock-icon"><Icon name="lock" size={32} /></span>
          <h2>{f(t.lab.locked, { n: COMPOSER_LEVEL })}</h2>
          <p className="muted">{f(t.lab.progress, { lv: level, xp: (need - user.xp).toLocaleString() })}</p>
          <Bar ratio={user.xp / need} />
          <p className="small muted">{f(t.lab.researcherInfo, { n: RESEARCHER_APPROVALS })}</p>
        </section>
      </div>
    );
  }

  const pending = queue.data ?? [];
  const mine = mineQ.data ?? [];
  const loadingList = tab === 'review' ? !queue.data : tab === 'mine' ? !mineQ.data : false;

  return (
    <div className="stack narrow">
      <header className="page-head">
        <h1>{t.lab.title}</h1>
        <p className="muted small">{f(t.lab.researcherInfo, { n: RESEARCHER_APPROVALS })}</p>
      </header>
      <div className="seg">
        <button className={tab === 'create' ? 'on' : ''} onClick={() => setTab('create')}>{t.lab.create}</button>
        <button className={tab === 'review' ? 'on' : ''} onClick={() => setTab('review')}>{t.lab.review}{pending.length > 0 && <span className="count">{pending.length}</span>}</button>
        <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>{t.lab.mine}</button>
      </div>
      {tab === 'create' && <Composer onDone={() => setTab('mine')} />}
      {loadingList && <p className="muted center pad">{t.common.loading}</p>}
      {tab === 'review' && (
        queue.data && (pending.length === 0 ? <p className="muted center pad">{t.lab.noPending}</p>
          : pending.map((p) => <ReviewCard key={p.id} p={p} onVoted={queue.reload} />))
      )}
      {tab === 'mine' && (
        mineQ.data && (mine.length === 0 ? <p className="muted center pad">{t.lab.noMine}</p>
          : mine.map((p) => <MineCard key={p.id} p={p} />))
      )}
    </div>
  );
}

function Composer({ onDone }: { onDone: () => void }) {
  const { t, lang } = useApp();
  const [tier, setTier] = useState<Tier>('undergrad');
  const [topic, setTopic] = useState<Topic>('analysis');
  const [stKo, setStKo] = useState('');
  const [stEn, setStEn] = useState('');
  const [exKo, setExKo] = useState('');
  const [exEn, setExEn] = useState('');
  const [source, setSource] = useState('');
  const [kind, setKind] = useState<Answer['kind']>('numeric');
  const [value, setValue] = useState('');
  const [options, setOptions] = useState('');
  const [correct, setCorrect] = useState(1);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const buildAnswer = (): Answer | null => {
    if (kind === 'numeric') {
      const n = parseNumber(value);
      return n === null ? null : { kind, value: n, tolerance: Math.abs(n) < 1 ? 1e-6 : undefined };
    }
    if (kind === 'short') {
      const accepted = value.split(',').map((s) => s.trim()).filter(Boolean);
      return accepted.length ? { kind, accepted } : null;
    }
    const opts = options.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const [k, e] = l.split('|').map((s) => s.trim());
      return { ko: k, en: e || k };
    });
    return opts.length >= 2 && correct >= 1 && correct <= opts.length ? { kind, options: opts, correct: correct - 1 } : null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const answer = buildAnswer();
    if (!answer || !stKo.trim() || !stEn.trim() || !exKo.trim() || !source.trim()) return setError(t.lab.required);
    setBusy(true); setError('');
    try {
      await api.submitProblem({
        tier, topic, source: source.trim(), answer,
        statement: { ko: stKo.trim(), en: stEn.trim() },
        explanation: { ko: exKo.trim(), en: (exEn || exKo).trim() },
      });
      setOk(true);
      window.setTimeout(onDone, 900);
    } catch {
      setError(t.common.error);
    } finally {
      setBusy(false);
    }
  };

  const preview = lang === 'ko' ? stKo : stEn;

  return (
    <form className="card composer" onSubmit={submit}>
      <div className="grid-2 tight">
        <label className="field"><span>Tier</span>
          <select className="input" value={tier} onChange={(e) => setTier(e.target.value as Tier)}>
            {TIERS.map((x) => <option key={x} value={x}>{t.tiers[x]}</option>)}
          </select></label>
        <label className="field"><span>Topic</span>
          <select className="input" value={topic} onChange={(e) => setTopic(e.target.value as Topic)}>
            {TOPICS.map((x) => <option key={x} value={x}>{t.topics[x]}</option>)}
          </select></label>
      </div>
      <label className="field"><span>{t.lab.statementKo} *</span>
        <textarea className="input" rows={3} value={stKo} onChange={(e) => setStKo(e.target.value)} placeholder="$\int_0^1 x^2\,dx$ 의 값은?" /></label>
      <label className="field"><span>{t.lab.statementEn} *</span>
        <textarea className="input" rows={3} value={stEn} onChange={(e) => setStEn(e.target.value)} placeholder="Evaluate $\int_0^1 x^2\,dx$." /></label>
      {preview && <div className="preview"><span className="eyebrow">{t.lab.preview}</span><MathText className="statement" text={preview} /></div>}
      <label className="field"><span>{t.lab.source} *</span>
        <input className="input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Rudin, Principles of Mathematical Analysis Ch.6" /></label>

      <div className="field"><span>{t.lab.answerType}</span>
        <div className="seg compact">
          {(['numeric', 'choice', 'short'] as const).map((k) => (
            <button type="button" key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{t.lab[k]}</button>
          ))}
        </div>
      </div>
      {kind === 'choice' ? (
        <>
          <label className="field"><span>{t.lab.options}</span>
            <textarea className="input mono" rows={4} value={options} onChange={(e) => setOptions(e.target.value)} placeholder={'$1/3$\n$1/2$\n$1$'} /></label>
          <label className="field"><span>{t.lab.correctIndex}</span>
            <input className="input" type="number" min={1} value={correct} onChange={(e) => setCorrect(Number(e.target.value))} /></label>
        </>
      ) : (
        <label className="field"><span>{kind === 'numeric' ? t.lab.answerValue : t.lab.accepted} *</span>
          <input className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={kind === 'numeric' ? '1/3' : 'Z x Z, Z^2'} /></label>
      )}

      <label className="field"><span>{t.lab.explanationKo} *</span>
        <textarea className="input" rows={3} value={exKo} onChange={(e) => setExKo(e.target.value)} /></label>
      <label className="field"><span>{t.lab.explanationEn}</span>
        <textarea className="input" rows={3} value={exEn} onChange={(e) => setExEn(e.target.value)} /></label>

      {error && <p className="error">{error}</p>}
      {ok && <p className="ok">{t.lab.submitted}</p>}
      <button className="btn primary block" disabled={busy}>{t.lab.submit}</button>
    </form>
  );
}

function ReviewCard({ p, onVoted }: { p: CommunityProblem; onVoted: () => void }) {
  const { t, lang, reloadProblems } = useApp();
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const vote = async (approve: boolean) => {
    setBusy(true);
    try { await api.vote(p.id, approve, comment); await reloadProblems(); onVoted(); } finally { setBusy(false); }
  };
  return (
    <article className="card review">
      <div className="row gap wrap"><TierBadge tier={p.tier} /><span className="muted small">{t.topics[p.topic]} · {t.practice.by} {p.authorName}</span></div>
      <MathText className="statement" text={p.statement[lang]} />
      <AnswerSummary p={p} />
      {p.explanation && <div className="explain"><h3>{t.practice.explanation}</h3><MathText text={p.explanation[lang]} /></div>}
      <p className="source"><span>{t.practice.source}</span> <MathText text={p.source} /></p>
      <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t.lab.comment} />
      <div className="row gap">
        <button className="btn primary" disabled={busy} onClick={() => vote(true)}><Icon name="check" size={18} /> {t.lab.approve}</button>
        <button className="btn ghost" disabled={busy} onClick={() => vote(false)}><Icon name="x" size={18} /> {t.lab.reject}</button>
      </div>
    </article>
  );
}

function MineCard({ p }: { p: CommunityProblem }) {
  const { t, lang } = useApp();
  const votes = Object.values(p.votes);
  const net = votes.reduce((s, v) => s + (v.approve ? 1 : -1), 0);
  return (
    <article className="card review">
      <div className="row between">
        <TierBadge tier={p.tier} />
        <span className={`status status-${p.status}`}>{t.lab[p.status]}</span>
      </div>
      <MathText className="statement" text={p.statement[lang]} />
      <p className="muted small">{net >= 0 ? '+' : ''}{net} {t.lab.votes}</p>
      {votes.filter((v) => v.comment).map((v, i) => <p key={i} className="small quote">“{v.comment}”</p>)}
    </article>
  );
}

function AnswerSummary({ p }: { p: CommunityProblem }) {
  const { t, lang } = useApp();
  const a = p.answer;
  const text = a.kind === 'numeric' ? String(Number(a.value.toFixed(8)))
    : a.kind === 'short' ? a.accepted.join(', ')
    : `${String.fromCharCode(65 + a.correct)}. ${a.options[a.correct][lang]}`;
  return <p className="answer-summary"><b>{t.lab.answerValue}:</b> <MathText text={text} /></p>;
}
