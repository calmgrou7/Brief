import { useMemo, useRef, useState } from 'react';
import { PURPOSE_LABELS, formatRatio } from '../engine';
import { STAGES, clientSummary, dueState, isoDate, type Stage } from './crm';
import { exportBackup, mergeBackup, type AppState, type CaseFile } from './store';

type Sort = 'next' | 'risk' | 'name' | 'updated';

interface Props {
  state: AppState;
  setState: (fn: (s: AppState) => AppState) => void;
  open: (id: string, tab: string) => void;
  addCase: () => void;
  inFrame: boolean;
}

export function ClientsView({ state, setState, open, addCase, inFrame }: Props) {
  const today = isoDate(new Date());
  const [q, setQ] = useState('');
  const [stage, setStage] = useState<Stage | 'all'>('all');
  const [sort, setSort] = useState<Sort>('next');
  const [notice, setNotice] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(
    () => state.cases.map((c) => ({ c, s: clientSummary(c), due: dueState(c.crm.nextDate, today) })),
    [state.cases, today],
  );

  const counts = {
    total: rows.length,
    due: rows.filter((r) => r.due === 'overdue' || r.due === 'thisMonth').length,
    noData: rows.filter((r) => !r.s.hasData).length,
    risk: rows.filter((r) => r.s.bad >= 3).length,
  };
  const byStage = STAGES.map((st) => ({ st, n: rows.filter((r) => r.c.crm.stage === st).length }));

  const shown = rows
    .filter((r) => stage === 'all' || r.c.crm.stage === stage)
    .filter((r) => !q || `${r.c.company.name} ${r.c.company.ceo} ${r.c.company.industry}`.includes(q.trim()))
    .sort((a, b) => {
      if (sort === 'name') return a.c.company.name.localeCompare(b.c.company.name, 'ko');
      if (sort === 'risk') return b.s.bad * 10 + b.s.caution - (a.s.bad * 10 + a.s.caution);
      if (sort === 'updated') return b.c.updatedAt.localeCompare(a.c.updatedAt);
      return (a.c.crm.nextDate || '9999') .localeCompare(b.c.crm.nextDate || '9999');
    });

  const setCase = (id: string, fn: (c: CaseFile) => CaseFile) =>
    setState((s) => ({ ...s, cases: s.cases.map((c) => (c.id === id ? fn(c) : c)) }));

  const backup = () => {
    const blob = new Blob([exportBackup(state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `채움-백업-${today}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setNotice(`백업 파일(채움-백업-${today}.json)을 저장했습니다. 안전한 곳에 보관하세요.`);
  };
  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      const r = mergeBackup(state, await file.text());
      setState(() => r.state);
      setNotice(`백업을 불러왔습니다: 새 고객 ${r.added}곳 추가, 기존 고객 ${r.replaced}곳을 백업 내용으로 바꿨습니다.`);
    } catch (e) {
      setNotice(`불러오지 못했습니다: ${(e as Error).message}`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="stack">
      <div className="client-kpis">
        <Kpi label="관리 고객" value={counts.total} unit="곳" />
        <Kpi label="이번 달·지난 일정" value={counts.due} unit="곳" tone={counts.due ? 'caution' : undefined} onClick={() => setSort('next')} />
        <Kpi label="재무제표 미입력" value={counts.noData} unit="곳" />
        <Kpi label="미달 지표 3개 이상" value={counts.risk} unit="곳" tone={counts.risk ? 'bad' : undefined} onClick={() => setSort('risk')} />
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>고객사</h2>
          <div className="client-actions">
            <button className="btn primary" onClick={addCase}>
              + 새 고객
            </button>
            {!inFrame && (
              <button className="btn" onClick={backup}>
                백업 파일 저장
              </button>
            )}
            <label className="btn" htmlFor="restore-file">
              백업 불러오기
              <input ref={fileRef} id="restore-file" type="file" accept=".json,application/json" className="sr-only" onChange={(e) => restore(e.target.files?.[0])} />
            </label>
          </div>
        </div>
        {notice && <p className="review-note">{notice}</p>}
        {inFrame && <p className="muted small">백업 파일 저장은 내려받은 채움 파일에서 할 수 있습니다. 고객 자료는 이 브라우저에만 저장되니 정기적으로 백업하세요.</p>}

        <div className="client-filters">
          <label className="sr-only" htmlFor="client-q">
            고객 검색
          </label>
          <input id="client-q" placeholder="회사명·대표·업종 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="sr-only" htmlFor="client-sort">
            정렬
          </label>
          <select id="client-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="next">다음 일정 빠른 순</option>
            <option value="risk">판정 나쁜 순</option>
            <option value="updated">최근 수정 순</option>
            <option value="name">회사명 순</option>
          </select>
        </div>
        <div className="chips stage-chips">
          <button className={`chip ${stage === 'all' ? 'on' : ''}`} aria-pressed={stage === 'all'} onClick={() => setStage('all')}>
            전체 {rows.length}
          </button>
          {byStage.map(({ st, n }) => (
            <button key={st} className={`chip ${stage === st ? 'on' : ''}`} aria-pressed={stage === st} onClick={() => setStage(st)}>
              {st} {n}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          <table className="sheet compact clients">
            <thead>
              <tr>
                <th>회사</th>
                <th>상담 단계</th>
                <th>진단 목적</th>
                <th>종합 판정</th>
                <th className="num">부채비율</th>
                <th className="num">가지급금 비중</th>
                <th>다음 일정</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ c, s, due }) => (
                <tr key={c.id}>
                  <th scope="row">
                    <button className="link client-name" onClick={() => open(c.id, 'input')}>
                      {c.company.name}
                    </button>
                    <span className="hint">
                      {[c.company.ceo && `대표 ${c.company.ceo}`, c.company.industry, s.hasData && `${c.projection.method === 'final' ? '결산' : '가결산'} ${c.statements.interimDate}`].filter(Boolean).join(' · ')}
                      {c.isSample && ' · 예시'}
                    </span>
                  </th>
                  <td>
                    <label className="sr-only" htmlFor={`stage-${c.id}`}>
                      {c.company.name} 상담 단계
                    </label>
                    <select id={`stage-${c.id}`} value={c.crm.stage} onChange={(e) => setCase(c.id, (x) => ({ ...x, crm: { ...x.crm, stage: e.target.value as Stage }, updatedAt: today }))}>
                      {STAGES.map((st) => (
                        <option key={st}>{st}</option>
                      ))}
                    </select>
                  </td>
                  <td className="small">{c.company.purposes.map((p) => PURPOSE_LABELS[p]).join(' · ') || '—'}</td>
                  <td>
                    {s.hasData ? (
                      <span className="ratio-cell left">
                        <span className={`grade-pill ${s.grade}`}>{s.grade}</span>
                        {s.bad > 0 && <span className="pill bad">✕ {s.bad}</span>}
                        {s.caution > 0 && <span className="pill caution">▲ {s.caution}</span>}
                        {s.bad + s.caution === 0 && <span className="pill good">● 0</span>}
                      </span>
                    ) : (
                      <button className="link small" onClick={() => open(c.id, 'input')}>
                        자료 입력
                      </button>
                    )}
                  </td>
                  <td className="num">{formatRatio(s.debtRatio, '%')}</td>
                  <td className="num">{formatRatio(s.officerLoanShare, '%')}</td>
                  <td>
                    <span className={`due ${due}`}>
                      {c.crm.nextDate ? c.crm.nextDate.slice(5).replace('-', '/') : '미정'}
                      {due === 'overdue' && ' 지남'}
                    </span>
                    <span className="hint">{c.crm.nextAction}</span>
                  </td>
                  <td>
                    <button className="btn small-btn" onClick={() => open(c.id, s.hasData ? 'diagnosis' : 'input')}>
                      {s.hasData ? '진단 보기' : '열기'}
                    </button>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    조건에 맞는 고객이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, unit, tone, onClick }: { label: string; value: number; unit: string; tone?: 'caution' | 'bad'; onClick?: () => void }) {
  const body = (
    <>
      <span className="ck-label">{label}</span>
      <span className="ck-value">
        {value}
        <small> {unit}</small>
      </span>
    </>
  );
  return onClick ? (
    <button className={`client-kpi ${tone ?? ''}`} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={`client-kpi ${tone ?? ''}`}>{body}</div>
  );
}
