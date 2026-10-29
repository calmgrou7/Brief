import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Alert, Item, Kpi } from './contract';
import { relDay, won } from './format';
import { loadService } from './load';
import { combinedAlerts, combinedItems, countOpen, sharedClients, summaryOf, type LoadState } from './overview';
import { SERVICES, serviceById, type ServiceDef } from './services';

const REFRESH_MS = 5 * 60_000;
/** 종합 화면에 처음 보여줄 알림 수. 서비스가 늘어도 화면이 알림으로 덮이지 않게. */
const ALERT_LIMIT = 6;

function useRoute(): string {
  const read = () => location.hash.replace(/^#\/?/, '');
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

function useSummaries() {
  const [states, setStates] = useState<Record<string, LoadState>>(() => Object.fromEntries(SERVICES.map((s) => [s.id, { status: 'loading' }])));
  const [now, setNow] = useState(new Date());

  const reload = useCallback(() => {
    const t = new Date();
    setNow(t);
    for (const s of SERVICES) loadService(s, t).then((st) => setStates((cur) => ({ ...cur, [s.id]: st })));
  }, []);

  useEffect(() => {
    reload();
    const timer = setInterval(reload, REFRESH_MS);
    const onVisible = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reload]);

  return { states, now, reload };
}

export function App() {
  const route = useRoute();
  const { states, now, reload } = useSummaries();
  const current = serviceById(route);
  const anyDemo = Object.values(states).some((s) => s.status === 'demo');

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#/">
            <span className="brand-mark">종합 보드</span>
            <span className="brand-sub">서비스 {SERVICES.length}개</span>
          </a>
          <button className="btn ghost" onClick={reload}>
            새로고침 · {now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </button>
        </div>
        <nav className="tabs" aria-label="서비스">
          <a href="#/" className={current ? 'tab' : 'tab on'}>
            종합
          </a>
          {SERVICES.map((s) => (
            <a key={s.id} href={`#/${s.id}`} className={current?.id === s.id ? 'tab on' : 'tab'} style={{ ['--svc' as string]: s.color }}>
              <i className="dot" />
              {s.name}
              {states[s.id].status === 'error' && <span className="tab-badge">!</span>}
            </a>
          ))}
        </nav>
      </header>

      {anyDemo && (
        <p className="note">
          <strong>예시</strong> 표시가 붙은 서비스는 아직 요약 주소가 연결되지 않아 예시 데이터로 자리만 보여줍니다. 각 서비스의 데이터는 그 서비스에 그대로 두고, 이 보드는 요약만 읽습니다.
        </p>
      )}

      <main className="main">{current ? <ServicePage svc={current} state={states[current.id]} now={now} /> : <Overview states={states} now={now} />}</main>
    </>
  );
}

function Overview({ states, now }: { states: Record<string, LoadState>; now: Date }) {
  const alerts = useMemo(() => combinedAlerts(states, now), [states, now]);
  const items = useMemo(() => combinedItems(states), [states]);
  const shared = useMemo(() => sharedClients(states), [states]);
  const [filter, setFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const counts = { ok: 0, demo: 0, error: 0 };
  for (const s of Object.values(states)) if (s.status in counts) counts[s.status as keyof typeof counts]++;
  const shown = (filter === 'all' ? items : items.filter((t) => t.service === filter)).slice(0, 20);

  return (
    <>
      <section className="strip">
        <Metric label="연결된 서비스" value={`${counts.ok} / ${SERVICES.length}`} sub={[counts.demo && `예시 ${counts.demo}`, counts.error && `오류 ${counts.error}`].filter(Boolean).join(' · ') || '모두 연결됨'} />
        <Metric label="진행 중" value={`${countOpen(states)}건`} sub="모든 서비스의 열린 항목" />
        <Metric label="확인할 알림" value={`${alerts.filter((a) => a.value.level !== 'info').length}건`} sub="주의·긴급" tone={alerts.some((a) => a.value.level === 'bad') ? 'bad' : undefined} />
        <Metric label="공통 고객" value={`${shared.length}곳`} sub="둘 이상 서비스 이용" />
      </section>

      {alerts.length > 0 && (
        <section className="panel">
          <h2>확인할 것</h2>
          <ul className="alerts">
            {(showAll ? alerts : alerts.slice(0, ALERT_LIMIT)).map((a, i) => (
              <AlertRow key={i} alert={a.value} service={a.service} />
            ))}
          </ul>
          {alerts.length > ALERT_LIMIT && (
            <button className="link small" onClick={() => setShowAll(!showAll)}>
              {showAll ? '접기' : `${alerts.length - ALERT_LIMIT}건 더 보기`}
            </button>
          )}
        </section>
      )}

      <section className="tiles">
        {SERVICES.map((s) => (
          <Tile key={s.id} svc={s} state={states[s.id]} now={now} />
        ))}
      </section>

      <section className="two">
        <div className="panel">
          <div className="panel-head">
            <h2>통합 최근 활동</h2>
            <div className="seg" role="group" aria-label="서비스 필터">
              {[{ id: 'all', name: '전체' }, ...SERVICES].map((s) => (
                <button key={s.id} className={filter === s.id ? 'on' : ''} onClick={() => setFilter(s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          {shown.length ? (
            <ul className="feed">
              {shown.map((t, i) => (
                <ItemRow key={i} item={t.value} now={now} service={filter === 'all' ? t.service : undefined} />
              ))}
            </ul>
          ) : (
            <p className="muted">활동이 없습니다.</p>
          )}
        </div>
        <div className="panel">
          <div className="panel-head">
            <h2>공통 고객</h2>
            <p className="muted small">여러 서비스에 등장한 고객 — 다음 제안 대상</p>
          </div>
          {shared.length ? (
            <ul className="shared">
              {shared.map((c) => (
                <li key={c.name}>
                  <strong>{c.name}</strong>
                  <span>
                    {c.services.map((id) => (
                      <SvcTag key={id} id={id} />
                    ))}
                  </span>
                  <span className="muted small">최근 {relDay(c.lastAt, now)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">아직 없습니다.</p>
          )}
        </div>
      </section>
    </>
  );
}

function Tile({ svc, state, now }: { svc: ServiceDef; state: LoadState; now: Date }) {
  const sum = summaryOf(state);
  const topAlert = sum?.alerts.find((a) => a.level !== 'info');
  return (
    <article className="panel tile" style={{ ['--svc' as string]: svc.color }}>
      <div className="tile-head">
        <div>
          <h2>{svc.name}</h2>
          <p className="muted small">{svc.description}</p>
        </div>
        <StatusPill state={state} now={now} />
      </div>
      {state.status === 'loading' && <p className="muted">불러오는 중…</p>}
      {state.status === 'error' && <p className="callout bad">요약을 불러오지 못했습니다: {state.error}</p>}
      {sum && (
        <>
          <KpiGrid kpis={sum.kpis.slice(0, 4)} />
          {topAlert && <p className={`callout ${topAlert.level}`}>{topAlert.message}</p>}
          <ul className="feed compact">
            {sum.items.slice(0, 3).map((it, i) => (
              <ItemRow key={i} item={it} now={now} />
            ))}
          </ul>
        </>
      )}
      <div className="tile-actions">
        <a className="btn" href={`#/${svc.id}`}>
          자세히
        </a>
        {svc.appUrl && (
          <a className="btn" href={svc.appUrl} target="_blank" rel="noreferrer">
            {svc.name} 대시보드 열기 ↗
          </a>
        )}
      </div>
    </article>
  );
}

function ServicePage({ svc, state, now }: { svc: ServiceDef; state: LoadState; now: Date }) {
  const sum = summaryOf(state);
  return (
    <>
      <section className="panel svc-head" style={{ ['--svc' as string]: svc.color }}>
        <div>
          <h2>{svc.name}</h2>
          <p className="muted">{svc.description}</p>
        </div>
        <div className="row">
          <StatusPill state={state} now={now} />
          {svc.appUrl && (
            <a className="btn primary" href={svc.appUrl} target="_blank" rel="noreferrer">
              대시보드 열기 ↗
            </a>
          )}
        </div>
      </section>
      {state.status === 'error' && <p className="callout bad">요약을 불러오지 못했습니다: {state.error}</p>}
      {sum && (
        <>
          <KpiGrid kpis={sum.kpis} wide />
          {sum.alerts.length > 0 && (
            <section className="panel">
              <h2>알림</h2>
              <ul className="alerts">
                {sum.alerts.map((a, i) => (
                  <AlertRow key={i} alert={a} />
                ))}
              </ul>
            </section>
          )}
          <section className="panel">
            <h2>최근 활동</h2>
            {sum.items.length ? (
              <ul className="feed">
                {[...sum.items].sort((a, b) => b.at.localeCompare(a.at)).map((it, i) => (
                  <ItemRow key={i} item={it} now={now} />
                ))}
              </ul>
            ) : (
              <p className="muted">활동이 없습니다.</p>
            )}
          </section>
        </>
      )}
      {svc.embedUrl && (
        <section className="panel embed">
          <h2>{svc.name} 대시보드</h2>
          <iframe src={svc.embedUrl} title={`${svc.name} 대시보드`} loading="lazy" />
        </section>
      )}
    </>
  );
}

function StatusPill({ state, now }: { state: LoadState; now: Date }) {
  if (state.status === 'ok') return <span className="pill ok">연결됨 · {relDay(state.summary.updatedAt, now)} 갱신</span>;
  if (state.status === 'demo') return <span className="pill demo">예시</span>;
  if (state.status === 'error') return <span className="pill bad">오류</span>;
  if (state.status === 'loading') return <span className="pill">불러오는 중</span>;
  return <span className="pill">미연결</span>;
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: 'bad' }) {
  return (
    <div className={`panel metric ${tone ?? ''}`}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      <span className="metric-sub">{sub}</span>
    </div>
  );
}

function KpiGrid({ kpis, wide }: { kpis: Kpi[]; wide?: boolean }) {
  if (!kpis.length) return null;
  return (
    <dl className={wide ? 'kpis wide' : 'kpis'}>
      {kpis.map((k) => (
        <div key={k.label} className={k.tone ?? ''} title={k.hint}>
          <dt>{k.label}</dt>
          <dd>
            {typeof k.value === 'number' ? k.value.toLocaleString('ko-KR') : k.value}
            {k.unit && <small>{k.unit}</small>}
          </dd>
          {wide && k.hint && <span className="muted small">{k.hint}</span>}
        </div>
      ))}
    </dl>
  );
}

function SvcTag({ id }: { id: string }) {
  const s = serviceById(id);
  return (
    <span className="svc-tag" style={{ ['--svc' as string]: s?.color ?? '#586b7b' }}>
      {s?.name ?? id}
    </span>
  );
}

function AlertRow({ alert, service }: { alert: Alert; service?: string }) {
  const text = alert.link ? (
    <a href={alert.link} target="_blank" rel="noreferrer">
      {alert.message}
    </a>
  ) : (
    alert.message
  );
  return (
    <li className={alert.level}>
      {service && <SvcTag id={service} />}
      {text}
    </li>
  );
}

function ItemRow({ item, now, service }: { item: Item; now: Date; service?: string }) {
  const title = item.link ? (
    <a href={item.link} target="_blank" rel="noreferrer">
      {item.title}
    </a>
  ) : (
    item.title
  );
  return (
    <li className={item.status === 'open' ? 'open' : ''}>
      <span className="when">{relDay(item.at, now)}</span>
      <span className="what">
        {service && <SvcTag id={service} />}
        {item.kind && <span className="kind">{item.kind}</span>}
        {title}
        {item.client && <span className="muted"> · {item.client}</span>}
      </span>
      {item.amount ? <span className="amount">{won(item.amount)}</span> : null}
    </li>
  );
}
