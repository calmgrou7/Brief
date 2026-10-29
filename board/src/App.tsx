import { useMemo, useState, type FormEvent } from 'react';
import { APPS, appById } from './apps';
import { KIND_LABEL, STALE_DAYS, daysSince, openItems, sharedClients, sortByRecent, summarizeApp, type OpsEvent } from './events';
import { delta, relDay, won } from './format';
import { supabase } from './sources/supabase';
import { useBoard } from './useBoard';

export function App() {
  const board = useBoard();
  const now = board.updatedAt;

  const summaries = useMemo(() => APPS.map((a) => summarizeApp(board.events, a.id, now)), [board.events, now]);
  const open = useMemo(() => openItems(board.events), [board.events]);
  const shared = useMemo(() => sharedClients(board.events), [board.events]);
  const total = summaries.reduce(
    (t, s) => ({ thisWeek: t.thisWeek + s.thisWeek, lastWeek: t.lastWeek + s.lastWeek, stale: t.stale + s.stale, amount: t.amount + s.amountThisMonth }),
    { thisWeek: 0, lastWeek: 0, stale: 0, amount: 0 },
  );

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">운영 보드</span>
            <span className="brand-sub">{APPS.map((a) => a.name).join(' · ')}</span>
          </div>
          <div className="top-actions">
            <SourcePill mode={board.mode} />
            {board.mode !== 'signin' && (
              <button className="btn ghost" onClick={board.reload} disabled={board.loading}>
                {board.loading ? '불러오는 중…' : `새로고침 · ${now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
              </button>
            )}
            {board.mode === 'live' && (
              <button className="btn ghost" onClick={() => supabase?.auth.signOut()}>
                로그아웃
              </button>
            )}
          </div>
        </div>
      </header>

      {board.mode === 'demo' && (
        <p className="note">
          지금은 <strong>예시 데이터</strong>입니다. Supabase를 연결하고 두 앱이 이벤트를 보내면 실제 현황으로 바뀝니다(연결 방법은 README). 여기서 적은 할 일은 이 브라우저에만 저장됩니다.
        </p>
      )}
      {board.error && <p className="note bad">불러오기·저장 중 문제가 생겼습니다: {board.error}</p>}

      <main className="main">
        {board.mode === 'signin' ? (
          board.authReady && <SignIn />
        ) : (
          <>
            <section className="kpis">
              <Kpi label="이번 주 활동" value={`${total.thisWeek}건`} sub={delta(total.thisWeek, total.lastWeek)} />
              <Kpi label="진행 중" value={`${open.length}건`} sub="열려 있는 상담·할 일" />
              <Kpi label={`밀린 일 (${STALE_DAYS}일+)`} value={`${total.stale}건`} sub={total.stale ? '먼저 처리할 것' : '밀린 일 없음'} tone={total.stale ? 'bad' : 'good'} />
              <Kpi label="두 앱 공통 고객" value={`${shared.length}곳`} sub={total.amount ? `이번 달 금액 ${won(total.amount)}` : '교차 제안 대상'} />
            </section>

            <section className="apps">
              {summaries.map((s) => {
                const app = appById(s.app)!;
                const idle = s.lastActivity ? daysSince(s.lastActivity, now) : undefined;
                return (
                  <article key={s.app} className="panel app-card" style={{ ['--app' as string]: app.color }}>
                    <div className="app-head">
                      <div>
                        <h2>{app.name}</h2>
                        <p className="muted">{app.description}</p>
                      </div>
                      {app.url ? (
                        <a className="btn" href={app.url} target="_blank" rel="noreferrer">
                          열기
                        </a>
                      ) : (
                        <span className="muted small">주소 미설정</span>
                      )}
                    </div>
                    <dl className="stats">
                      <Stat label="이번 주" value={s.thisWeek} />
                      <Stat label="진행 중" value={s.open} />
                      <Stat label="밀린 일" value={s.stale} warn={s.stale > 0} />
                      <Stat label="고객" value={s.clients} />
                    </dl>
                    {idle === undefined ? (
                      <p className="callout">아직 들어온 활동이 없습니다. 이 앱에서 이벤트 전송을 켰는지 확인하세요.</p>
                    ) : idle >= 3 ? (
                      <p className="callout">마지막 활동이 {idle}일 전입니다.</p>
                    ) : null}
                    <ul className="feed">
                      {s.recent.map((e) => (
                        <FeedRow key={e.id} e={e} now={now} />
                      ))}
                    </ul>
                  </article>
                );
              })}
            </section>

            <section className="two">
              <TodoPanel items={open} now={now} onAdd={board.add} onToggle={board.toggle} />
              <Timeline events={board.events} now={now} />
            </section>

            {shared.length > 0 && (
              <section className="panel">
                <div className="panel-head">
                  <h2>두 앱에 모두 있는 고객</h2>
                  <p className="muted">한쪽 서비스만 쓰는 고객보다 다음 제안을 하기 쉬운 곳입니다.</p>
                </div>
                <ul className="shared">
                  {shared.map((c) => (
                    <li key={c.name}>
                      <strong>{c.name}</strong>
                      <span className="tags">
                        {c.apps.map((id) => (
                          <AppTag key={id} id={id} />
                        ))}
                      </span>
                      <span className="muted small">최근 {relDay(c.lastAt, now)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}

function SourcePill({ mode }: { mode: 'demo' | 'signin' | 'live' }) {
  const text = mode === 'live' ? '실시간 연결' : mode === 'signin' ? '로그인 필요' : '예시 데이터';
  return <span className={`pill ${mode}`}>{text}</span>;
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: 'good' | 'bad' }) {
  return (
    <div className={`panel kpi ${tone ?? ''}`}>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      <span className="kpi-sub">{sub}</span>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={warn ? 'warn' : ''}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function AppTag({ id }: { id: string }) {
  const app = appById(id);
  return (
    <span className="app-tag" style={{ ['--app' as string]: app?.color ?? '#586b7b' }}>
      {app?.name ?? id}
    </span>
  );
}

function FeedRow({ e, now, withApp }: { e: OpsEvent; now: Date; withApp?: boolean }) {
  const title = e.link ? (
    <a href={e.link} target="_blank" rel="noreferrer">
      {e.title}
    </a>
  ) : (
    e.title
  );
  return (
    <li className={e.status === 'open' ? 'open' : ''}>
      <span className="when">{relDay(e.at, now)}</span>
      <span className="what">
        {withApp && <AppTag id={e.app} />}
        <span className="kind">{KIND_LABEL[e.kind]}</span>
        {title}
        {e.client && <span className="muted"> · {e.client}</span>}
      </span>
      {e.amount ? <span className="amount">{won(e.amount)}</span> : null}
    </li>
  );
}

function TodoPanel({ items, now, onAdd, onToggle }: { items: OpsEvent[]; now: Date; onAdd: (app: string, title: string) => void; onToggle: (e: OpsEvent) => void }) {
  const [title, setTitle] = useState('');
  const [app, setApp] = useState(APPS[0].id);
  const [done, setDone] = useState<OpsEvent[]>([]);

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!title.trim()) return;
    onAdd(app, title.trim());
    setTitle('');
  };
  const check = (e: OpsEvent) => {
    setDone((d) => [e, ...d].slice(0, 3));
    onToggle(e);
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>할 일 · 진행 중</h2>
        <p className="muted">두 앱의 열린 항목을 오래된 순으로 모았습니다.</p>
      </div>
      <form className="add" onSubmit={submit}>
        <select value={app} onChange={(e) => setApp(e.target.value)} aria-label="앱">
          {APPS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="할 일 추가" aria-label="할 일" maxLength={300} />
        <button className="btn primary" type="submit">
          추가
        </button>
      </form>
      {items.length === 0 ? (
        <p className="muted">열린 항목이 없습니다.</p>
      ) : (
        <ul className="todos">
          {items.map((e) => {
            const age = daysSince(e.at, now);
            return (
              <li key={e.id} className={age >= STALE_DAYS ? 'stale' : ''}>
                <label>
                  <input type="checkbox" checked={false} onChange={() => check(e)} />
                  <span>
                    <AppTag id={e.app} /> {e.title}
                    {e.client && <span className="muted"> · {e.client}</span>}
                  </span>
                </label>
                <span className="age">{age <= 0 ? '오늘' : `${age}일째`}</span>
              </li>
            );
          })}
        </ul>
      )}
      {done.length > 0 && (
        <p className="muted small undo">
          완료: {done[0].title}{' '}
          <button className="link" onClick={() => { onToggle({ ...done[0], status: 'done' }); setDone((d) => d.slice(1)); }}>
            되돌리기
          </button>
        </p>
      )}
    </div>
  );
}

function Timeline({ events, now }: { events: OpsEvent[]; now: Date }) {
  const [filter, setFilter] = useState('all');
  const list = sortByRecent(filter === 'all' ? events : events.filter((e) => e.app === filter)).slice(0, 25);
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>통합 타임라인</h2>
        <div className="seg" role="group" aria-label="앱 필터">
          {[{ id: 'all', name: '전체' }, ...APPS].map((a) => (
            <button key={a.id} className={filter === a.id ? 'on' : ''} onClick={() => setFilter(a.id)}>
              {a.name}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <p className="muted">활동이 없습니다.</p>
      ) : (
        <ul className="feed">
          {list.map((e) => (
            <FeedRow key={e.id} e={e} now={now} withApp={filter === 'all'} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!supabase) return;
    setState('sending');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: false } });
    if (error) {
      setState('error');
      setMsg(error.message);
    } else setState('sent');
  };

  return (
    <section className="panel signin">
      <div className="panel-head">
        <h2>로그인</h2>
        <p className="muted">고객 정보가 들어 있어 등록된 이메일로만 볼 수 있습니다. 로그인 링크를 메일로 보내 드립니다.</p>
      </div>
      {state === 'sent' ? (
        <p className="callout good">{email}로 로그인 링크를 보냈습니다. 메일의 링크를 누르면 이 화면으로 돌아옵니다.</p>
      ) : (
        <form className="add" onSubmit={submit}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" aria-label="이메일" autoComplete="email" />
          <button className="btn primary" type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? '보내는 중…' : '로그인 링크 받기'}
          </button>
        </form>
      )}
      {state === 'error' && <p className="callout bad">보내지 못했습니다: {msg}</p>}
    </section>
  );
}
