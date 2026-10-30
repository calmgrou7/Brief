import { useEffect, useMemo, useState } from 'react';
import { analyze, type Analysis } from '../engine';
import { DiagnosisView } from './DiagnosisView';
import { InputView } from './InputView';
import { ReportView } from './ReportView';
import { ScenarioView } from './ScenarioView';
import { ClientsView } from './ClientsView';
import { isoDate } from './crm';
import { inFrame } from './env';
import { blankCase, loadState, sampleCase, saveState, type AppState, type CaseFile } from './store';

const TABS = [
  { id: 'clients', label: '고객 관리' },
  { id: 'input', label: '자료 입력' },
  { id: 'diagnosis', label: '진단' },
  { id: 'scenario', label: '시나리오' },
  { id: 'report', label: '리포트' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const tabFromHash = (): TabId => {
  const h = location.hash.slice(1);
  return (TABS.find((t) => t.id === h)?.id ?? 'clients') as TabId;
};

export interface CaseProps {
  file: CaseFile;
  update: (fn: (c: CaseFile) => CaseFile) => void;
  analyses: Analysis[];
}

export function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [tab, setTab] = useState<TabId>(tabFromHash);

  useEffect(() => saveState(state), [state]);
  useEffect(() => {
    const on = () => setTab(tabFromHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  const file = state.cases.find((c) => c.id === state.activeCase) ?? state.cases[0];
  const update = (fn: (c: CaseFile) => CaseFile) =>
    setState((s) => ({ ...s, cases: s.cases.map((c) => (c.id === file.id ? { ...fn(c), updatedAt: isoDate(new Date()) } : c)) }));
  const open = (id: string, t: string) => {
    setState((s) => ({ ...s, activeCase: id }));
    location.hash = t;
  };

  const analyses = useMemo(
    () => file.scenarios.map((sc) => analyze(file.statements, file.company, file.projection, sc.levers)),
    [file],
  );

  const addCase = () => {
    const c = blankCase();
    setState((s) => ({ ...s, cases: [...s.cases, c], activeCase: c.id }));
    location.hash = 'input';
  };
  const resetSample = () =>
    setState((s) => ({
      ...s,
      cases: s.cases.some((c) => c.id === 'sample') ? s.cases.map((c) => (c.id === 'sample' ? sampleCase() : c)) : [sampleCase(), ...s.cases],
      activeCase: 'sample',
    }));
  const removeCase = () => {
    if (state.cases.length <= 1) return;
    setState((s) => {
      const cases = s.cases.filter((c) => c.id !== file.id);
      return { ...s, cases, activeCase: cases[0].id };
    });
  };

  const props: CaseProps = { file, update, analyses };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">채움</span>
            <span className="brand-ver">ver2.1</span>
            <span className="brand-sub">결산·가결산 진단</span>
          </div>
          <div className="case-picker">
            <label htmlFor="case-select" className="sr-only">
              기업 선택
            </label>
            <select id="case-select" value={file.id} onChange={(e) => setState((s) => ({ ...s, activeCase: e.target.value }))}>
              {state.cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company.name}
                  {c.isSample ? ' (예시)' : ''}
                </option>
              ))}
            </select>
            <button className="btn ghost" onClick={addCase}>
              + 새 고객
            </button>
          </div>
        </div>
        <nav className="tabs" aria-label="단계">
          {TABS.map((t, i) => (
            <a key={t.id} href={`#${t.id}`} className={`tab step ${t.id === 'clients' ? 'home' : ''} ${tab === t.id ? 'on' : ''}`} aria-current={tab === t.id ? 'page' : undefined}>
              {t.id !== 'clients' && <span className="step-no">{i}</span>}
              {t.label}
            </a>
          ))}
        </nav>
      </header>

      {file.isSample && tab !== 'clients' && (
        <p className="sample-note">
          예시 기업(가상 데이터)으로 열려 있습니다. 숫자를 바꿔 보거나 <button className="link" onClick={addCase}>새 기업</button>을 만들어 실제 자료를 입력하세요.
          {' '}
          <button className="link" onClick={resetSample}>예시 초기화</button>
        </p>
      )}

      <main className="main">
        {tab === 'clients' && <ClientsView state={state} setState={setState} open={open} addCase={addCase} inFrame={inFrame} />}
        {tab === 'input' && <InputView {...props} onRemove={state.cases.length > 1 ? removeCase : undefined} />}
        {tab === 'diagnosis' && <DiagnosisView {...props} />}
        {tab === 'scenario' && <ScenarioView {...props} />}
        {tab === 'report' && (
          <ReportView {...props} advisor={state.advisor} setAdvisor={(advisor) => setState((s) => ({ ...s, advisor }))} />
        )}
      </main>
    </div>
  );
}
