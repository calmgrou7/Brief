import { useState } from 'react';
import { profit, totals } from '../engine';
import type { CaseProps } from './App';
import { STAGES, isoDate, nextMilestone, type Stage } from './crm';
import { mil } from './format';

/** 고객별 상담 관리: 단계·다음 일정·상담 기록·재무제표 보관 */
export function CrmPanel({ file, update }: Pick<CaseProps, 'file' | 'update'>) {
  const today = isoDate(new Date());
  const milestone = nextMilestone(today);
  const [memo, setMemo] = useState('');
  const crm = file.crm;
  const setCrm = (patch: Partial<typeof crm>) => update((c) => ({ ...c, crm: { ...c.crm, ...patch } }));
  const year = file.statements.interimDate.slice(0, 4);
  const [label, setLabel] = useState(`${year} ${file.projection.method === 'final' ? '확정 결산' : '가결산'}`);

  const addMemo = () => {
    if (!memo.trim()) return;
    setCrm({ memos: [{ date: today, text: memo.trim() }, ...crm.memos] });
    setMemo('');
  };
  const saveSnapshot = () =>
    update((c) => ({
      ...c,
      history: [
        { label: label.trim() || `${year} 재무제표`, date: c.statements.interimDate, bs: { ...c.statements.current.bs }, is: { ...c.statements.current.is }, savedAt: today },
        ...c.history.filter((h) => h.date !== c.statements.interimDate || h.label !== label.trim()),
      ],
    }));
  const hasData = file.statements.current.is.revenue > 0;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>상담 관리</h2>
        <p className="muted">고객 관리 화면의 단계·일정과 연결됩니다.</p>
      </div>
      <div className="form-grid">
        <div className="field">
          <label className="field-label" htmlFor="crm-stage">
            상담 단계
          </label>
          <select id="crm-stage" value={crm.stage} onChange={(e) => setCrm({ stage: e.target.value as Stage })}>
            {STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="crm-next">
            다음 일정
          </label>
          <input id="crm-next" type="date" value={crm.nextDate} onChange={(e) => setCrm({ nextDate: e.target.value })} />
        </div>
        <div className="field wide">
          <label className="field-label" htmlFor="crm-action">
            다음에 할 일
          </label>
          <input id="crm-action" value={crm.nextAction} placeholder="예: 시나리오 B 제안, 회계사무실 요청서 전달" onChange={(e) => setCrm({ nextAction: e.target.value })} />
        </div>
      </div>
      <button className="link small align-start" onClick={() => setCrm({ nextDate: milestone.date, nextAction: milestone.action })}>
        연간 관리 일정으로 채우기 ({milestone.date} {milestone.action})
      </button>

      <div className="memo-box">
        <label className="field-label" htmlFor="crm-memo">
          상담 기록
        </label>
        <div className="memo-input">
          <textarea id="crm-memo" rows={2} value={memo} placeholder="오늘 상담 내용, 대표님 관심사, 받기로 한 자료" onChange={(e) => setMemo(e.target.value)} />
          <button className="btn" onClick={addMemo} disabled={!memo.trim()}>
            기록 추가
          </button>
        </div>
        {crm.memos.length > 0 && (
          <ul className="memo-list">
            {crm.memos.map((m, i) => (
              <li key={i}>
                <span className="memo-date">{m.date}</span>
                <span>{m.text}</span>
                <button className="link small" aria-label={`${m.date} 기록 삭제`} onClick={() => setCrm({ memos: crm.memos.filter((_, j) => j !== i) })}>
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="memo-box">
        <span className="field-label">재무제표 보관함</span>
        <p className="muted small">확정 결산이나 가결산 자료를 보관해 두면 해마다 추이를 비교할 수 있습니다. 새 PDF를 불러오기 전에 보관하세요.</p>
        <div className="memo-input">
          <label className="sr-only" htmlFor="snap-label">
            보관 이름
          </label>
          <input id="snap-label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <button className="btn" onClick={saveSnapshot} disabled={!hasData}>
            현재 당기 자료 보관
          </button>
        </div>
        {file.history.length > 0 && (
          <div className="table-wrap">
            <table className="sheet compact">
              <thead>
                <tr>
                  <th>보관 자료</th>
                  <th className="num">매출액</th>
                  <th className="num">영업이익</th>
                  <th className="num">당기순이익</th>
                  <th className="num">부채비율</th>
                  <th className="num">가지급금</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...file.history]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((h) => {
                    const t = totals(h.bs);
                    const p = profit(h.is);
                    return (
                      <tr key={h.label + h.date}>
                        <th scope="row">
                          {h.label}
                          <span className="hint">기준일 {h.date}</span>
                        </th>
                        <td className="num">{mil(h.is.revenue)}</td>
                        <td className="num">{mil(p.operatingIncome)}</td>
                        <td className="num">{mil(p.netIncome)}</td>
                        <td className="num">{t.equity > 0 ? `${((t.liabilities / t.equity) * 100).toFixed(1)}%` : '잠식'}</td>
                        <td className="num">{mil(h.bs.officerLoans)}</td>
                        <td>
                          <button className="link small" onClick={() => update((c) => ({ ...c, history: c.history.filter((x) => x !== h) }))}>
                            삭제
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            <p className="muted small">단위: 백만원 · 가결산 자료의 손익은 기준일까지 누적 금액입니다.</p>
          </div>
        )}
      </div>
    </section>
  );
}
