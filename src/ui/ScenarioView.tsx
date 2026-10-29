import { countSignals, profit, totals, type ScenarioLevers } from '../engine';
import type { CaseProps } from './App';
import { mil, won } from './format';
import { MoneyInput } from './MoneyInput';
import { RatioTable } from './parts';

export function ScenarioView({ file, update, analyses }: CaseProps) {
  const idx = file.activeScenario;
  const sc = file.scenarios[idx];
  const a = analyses[idx];
  const lv = sc.levers;
  const set = (patch: Partial<ScenarioLevers>) =>
    update((c) => ({ ...c, scenarios: c.scenarios.map((s, i) => (i === idx ? { ...s, levers: { ...s.levers, ...patch } } : s)) }));
  const pct = (v: number) => Math.round(v * 100);

  const before = countSignals(a.rows, 'projectedSignal');
  const after = countSignals(a.rows, 'scenarioSignal');
  const pProj = profit(a.projected.is);
  const pScen = profit(a.scenario.is);
  const succession = file.company.purposes.includes('succession');
  const ceoStake = (v: number) => v * file.company.ceoShares;

  return (
    <div className="stack">
      <div className="scenario-tabs" role="tablist">
        {file.scenarios.map((s, i) => (
          <button key={i} role="tab" aria-selected={i === idx} className={`tab ${i === idx ? 'on' : ''}`} onClick={() => update((c) => ({ ...c, activeScenario: i }))}>
            {s.name}
          </button>
        ))}
      </div>

      <div className="scenario-layout">
        <section className="panel levers">
          <div className="field">
            <label className="field-label" htmlFor="sc-name">
              시나리오 이름
            </label>
            <input id="sc-name" value={sc.name} onChange={(e) => update((c) => ({ ...c, scenarios: c.scenarios.map((s, i) => (i === idx ? { ...s, name: e.target.value } : s)) }))} />
          </div>

          <fieldset>
            <legend>매출·매입</legend>
            <Lever id="lv-rev" label="연내 추가 매출">
              <MoneyInput id="lv-rev" value={lv.revenueAdd} onChange={(v) => set({ revenueAdd: v })} suffix="원" />
            </Lever>
            {lv.revenueAdd > 0 && (
              <div className="two">
                <Lever id="lv-rev-cost" label="그 매출의 원가율">
                  <Percent id="lv-rev-cost" value={pct(lv.revenueCostRatio)} onChange={(v) => set({ revenueCostRatio: v / 100 })} />
                </Lever>
                <Lever id="lv-rev-cash" label="연내 현금 회수">
                  <Percent id="lv-rev-cash" value={pct(lv.revenueCashRatio)} onChange={(v) => set({ revenueCashRatio: v / 100 })} />
                </Lever>
              </div>
            )}
            <Lever id="lv-exp" label="연내 추가 비용(판관비 지출)">
              <MoneyInput id="lv-exp" value={lv.expenseAdd} onChange={(v) => set({ expenseAdd: v })} suffix="원" />
            </Lever>
            <Lever id="lv-inv" label="재고 매입(외상)" note="팔리기 전까지 이익에는 영향이 없습니다">
              <MoneyInput id="lv-inv" value={lv.inventoryAdd} onChange={(v) => set({ inventoryAdd: v })} suffix="원" />
            </Lever>
          </fieldset>

          <fieldset>
            <legend>대출</legend>
            <Lever id="lv-loan" label="신규 대출">
              <MoneyInput id="lv-loan" value={lv.loanAmount} onChange={(v) => set({ loanAmount: v })} suffix="원" />
            </Lever>
            {lv.loanAmount > 0 && (
              <>
                <div className="seg">
                  <button className={lv.loanTiming === 'thisYear' ? 'on' : ''} onClick={() => set({ loanTiming: 'thisYear' })}>
                    올해 실행
                  </button>
                  <button className={lv.loanTiming === 'nextYear' ? 'on' : ''} onClick={() => set({ loanTiming: 'nextYear' })}>
                    결산 후 내년 실행
                  </button>
                </div>
                <div className="two">
                  <div className="seg">
                    <button className={lv.loanTerm === 'short' ? 'on' : ''} onClick={() => set({ loanTerm: 'short' })}>
                      단기
                    </button>
                    <button className={lv.loanTerm === 'long' ? 'on' : ''} onClick={() => set({ loanTerm: 'long' })}>
                      장기
                    </button>
                  </div>
                  <Lever id="lv-rate" label="금리">
                    <Percent id="lv-rate" value={Math.round(lv.loanRate * 1000) / 10} step={0.1} onChange={(v) => set({ loanRate: v / 100 })} />
                  </Lever>
                </div>
              </>
            )}
            <Lever id="lv-repay" label="연내 대출 상환">
              <MoneyInput id="lv-repay" value={lv.repayAmount} onChange={(v) => set({ repayAmount: v })} suffix="원" />
            </Lever>
          </fieldset>

          <fieldset>
            <legend>자본·주주</legend>
            <Lever id="lv-cap" label="유상증자">
              <MoneyInput id="lv-cap" value={lv.capitalIncrease} onChange={(v) => set({ capitalIncrease: v })} suffix="원" />
            </Lever>
            <Lever id="lv-red" label="감자">
              <MoneyInput id="lv-red" value={lv.capitalReduction} onChange={(v) => set({ capitalReduction: v })} suffix="원" />
            </Lever>
            {lv.capitalReduction > 0 && (
              <div className="seg">
                <button className={!lv.capitalReductionPaid ? 'on' : ''} onClick={() => set({ capitalReductionPaid: false })}>
                  무상감자(결손 보전)
                </button>
                <button className={lv.capitalReductionPaid ? 'on' : ''} onClick={() => set({ capitalReductionPaid: true })}>
                  유상감자
                </button>
              </div>
            )}
            <Lever id="lv-shares" label="자녀에게 증여할 주식수" note="재무비율엔 영향 없음 · 주식가치와 증여세로 계산">
              <MoneyInput id="lv-shares" value={lv.sharesToTransfer} onChange={(v) => set({ sharesToTransfer: Math.min(v, file.company.ceoShares) })} suffix="주" />
            </Lever>
          </fieldset>

          <fieldset>
            <legend>가지급금</legend>
            <Lever id="lv-ol" label={`정리 금액 (잔액 ${mil(a.projected.bs.officerLoans)}백만원)`}>
              <MoneyInput id="lv-ol" value={lv.officerLoanSettle} onChange={(v) => set({ officerLoanSettle: v })} suffix="원" />
            </Lever>
            {lv.officerLoanSettle > 0 && (
              <div className="seg">
                {(
                  [
                    ['repay', '대표 상환'],
                    ['bonus', '상여 처리'],
                    ['dividend', '배당 처리'],
                  ] as const
                ).map(([m, l]) => (
                  <button key={m} className={lv.officerLoanMethod === m ? 'on' : ''} onClick={() => set({ officerLoanMethod: m })}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </fieldset>
        </section>

        <div className="stack results">
          <section className="panel">
            <div className="panel-head">
              <h2>지표 변화</h2>
              <p className="summary-line">
                주의·미달 <strong>{before.caution + before.bad}</strong> → <strong>{after.caution + after.bad}</strong>
              </p>
            </div>
            <RatioTable rows={a.rows} cols={['projected', 'scenario']} />
          </section>

          <section className="panel tradeoff">
            <h2>대출·정책자금 vs 승계 비용</h2>
            <div className="trade-grid">
              <div>
                <h3>대출·정책자금 쪽</h3>
                <Delta label="영업이익" a={pProj.operatingIncome} b={pScen.operatingIncome} unit="백만원" higherIsBetter />
                <Delta label="자본총계" a={totals(a.projected.bs).equity} b={totals(a.scenario.bs).equity} unit="백만원" higherIsBetter />
                <Delta label="연말 현금" a={a.projected.bs.cash} b={a.scenario.bs.cash} unit="백만원" higherIsBetter />
              </div>
              <div>
                <h3>세금·승계 쪽</h3>
                <Delta label="추정 법인세" a={a.projected.is.incomeTax} b={a.scenario.is.incomeTax} unit="백만원" />
                <Delta label="1주당 평가액" a={a.valuation.projected.valuePerShare} b={a.valuation.scenario.valuePerShare} unit="원" />
                <Delta label="대표 지분가치" a={ceoStake(a.valuation.projected.valuePerShare)} b={ceoStake(a.valuation.scenario.valuePerShare)} unit="백만원" />
                {lv.sharesToTransfer > 0 && <Delta label={`증여세 (${won(lv.sharesToTransfer)}주)`} a={a.giftTax.projected} b={a.giftTax.scenario} unit="백만원" />}
              </div>
            </div>
            {!succession && <p className="muted small">진단 목적에 가업승계를 넣으면 리포트에 주식가치 페이지가 추가됩니다.</p>}
            <p className="muted small">주식가치는 상증법 보충적 평가 약식(올해 예상 순이익 가중치 3)으로, 내년 이전 시점 기준 추정치입니다.</p>
          </section>

          {(a.scenario.warnings.length > 0 || a.scenario.deferred.length > 0 || a.scenario.nextYearInterest > 0) && (
            <section className="panel notes">
              <h2>확인할 점</h2>
              <ul>
                {a.scenario.deferred.map((d) => (
                  <li key={d}>{d}</li>
                ))}
                {a.scenario.nextYearInterest > 0 && <li>신규 대출로 내년 연간 이자 약 {mil(a.scenario.nextYearInterest)}백만원 증가</li>}
                {a.scenario.warnings.map((w) => (
                  <li key={w} className="warn">
                    {w}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Lever({ id, label, note, children }: { id: string; label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {note && <span className="hint">{note}</span>}
    </div>
  );
}

function Percent({ id, value, onChange, step = 1 }: { id: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <span className="money">
      <input id={id} type="number" min={0} max={100} step={step} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
      <span className="suffix">%</span>
    </span>
  );
}

function Delta({ label, a, b, unit, higherIsBetter }: { label: string; a: number; b: number; unit: '원' | '백만원'; higherIsBetter?: boolean }) {
  const f = unit === '원' ? won : mil;
  const d = b - a;
  const shown = unit === '원' ? Math.round(d) : Math.round(d / 1e6);
  const tone = shown === 0 ? '' : (d > 0) === !!higherIsBetter ? 'up-good' : 'up-bad';
  return (
    <div className="delta">
      <span className="delta-label">{label}</span>
      <span className="num">
        {f(a)} → <strong>{f(b)}</strong> <span className="unit">{unit}</span>
      </span>
      <span className={`delta-chip ${tone}`}>{shown === 0 ? '변화 없음' : `${d > 0 ? '+' : ''}${f(d)}`}</span>
    </div>
  );
}
