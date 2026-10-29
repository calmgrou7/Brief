import { useEffect, useState } from 'react';
import {
  PURPOSE_LABELS,
  consultingQuestions,
  countSignals,
  followUpTopics,
  formatRatio,
  formatTarget,
  headline,
  profit,
  totals,
  type Analysis,
} from '../engine';
import type { CaseProps } from './App';
import { inFrame } from './env';
import { mil, won } from './format';
import { SignalPill } from './parts';
import type { Advisor } from './store';

type Doc = 'ceo' | 'firm' | 'note';
const DOCS: { id: Doc; label: string }[] = [
  { id: 'ceo', label: '대표용 가결산 리포트' },
  { id: 'firm', label: '회계사무실 협조 요청서' },
  { id: 'note', label: '설계사 상담노트' },
];



const DISCLAIMER =
  '본 자료는 가결산 재무제표를 바탕으로 한 상담용 시뮬레이션입니다. 세무조정, 자산 시가, 개별 공제·감면 요건이 반영되지 않았으며, 실제 결산과 신고는 담당 세무대리인의 확인을 거쳐야 합니다. 특정 금융상품의 권유 자료가 아닙니다.';

export function ReportView({ file, update, analyses, advisor, setAdvisor }: CaseProps & { advisor: Advisor; setAdvisor: (a: Advisor) => void }) {
  const [doc, setDoc] = useState<Doc>('ceo');
  const [printAll, setPrintAll] = useState(false);
  useEffect(() => {
    const done = () => setPrintAll(false);
    addEventListener('afterprint', done);
    return () => removeEventListener('afterprint', done);
  }, []);
  useEffect(() => {
    // 3종 모두 출력: 세 문서를 화면에 그린 다음 인쇄 창을 연다
    if (printAll) requestAnimationFrame(() => window.print());
  }, [printAll]);
  const a = analyses[file.activeScenario];
  const today = new Date().toLocaleDateString('ko-KR');

  return (
    <div className="stack">
      <section className="panel no-print">
        <div className="panel-head">
          <h2>리포트에 넣을 시나리오</h2>
          <p className="muted">고르면 아래 리포트 3종이 바로 그 시나리오 기준으로 바뀝니다.</p>
        </div>
        <div className="scenario-pick" role="radiogroup" aria-label="리포트 시나리오">
          {file.scenarios.map((sc, i) => {
            const x = analyses[i];
            const c = countSignals(x.rows, 'scenarioSignal');
            const debt = x.rows.find((r) => r.key === 'debtRatio');
            const on = i === file.activeScenario;
            return (
              <button
                key={i}
                role="radio"
                aria-checked={on}
                className={`pick-card ${on ? 'on' : ''}`}
                onClick={() => update((c0) => ({ ...c0, activeScenario: i }))}
              >
                <span className="pick-name">
                  <span className="pick-dot" aria-hidden="true" />
                  {sc.name}
                </span>
                <span className="pick-stats">
                  <span>
                    주의·미달 <strong>{c.caution + c.bad}개</strong>
                  </span>
                  {debt && (
                    <span>
                      부채비율 <strong>{formatRatio(debt.scenario, '%')}</strong>
                    </span>
                  )}
                  <span>
                    순이익 <strong>{mil(profit(x.scenario.is).netIncome)}백만</strong>
                  </span>
                  <span>
                    1주당 <strong>{won(x.valuation.scenario.valuePerShare)}원</strong>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <a className="link small" href="#scenario">
          시나리오 내용 고치기 →
        </a>
      </section>

      <section className="panel no-print">
        <div className="report-bar">
          <div className="seg" role="tablist">
            {DOCS.map((d) => (
              <button key={d.id} role="tab" aria-selected={doc === d.id} className={doc === d.id ? 'on' : ''} onClick={() => setDoc(d.id)}>
                {d.label}
              </button>
            ))}
          </div>
          {!inFrame && (
            <div className="print-actions">
              <button className="btn primary" onClick={() => window.print()}>
                출력
              </button>
              <button className="btn" onClick={() => setPrintAll(true)}>
                3종 모두 출력
              </button>
            </div>
          )}
        </div>
        <div className="form-grid">
          <div className="field">
            <label className="field-label" htmlFor="adv-name">
              작성자
            </label>
            <input id="adv-name" value={advisor.name} onChange={(e) => setAdvisor({ ...advisor, name: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="adv-org">
              소속
            </label>
            <input id="adv-org" value={advisor.org} onChange={(e) => setAdvisor({ ...advisor, org: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="adv-phone">
              연락처
            </label>
            <input id="adv-phone" value={advisor.phone} onChange={(e) => setAdvisor({ ...advisor, phone: e.target.value })} />
          </div>
        </div>
        {inFrame ? (
          <p className="frame-note">이 미리보기 화면에서는 브라우저가 출력을 막습니다. 내려받은 채움 파일(또는 웹 배포 버전)에서 열면 출력 버튼이 나타납니다.</p>
        ) : (
          <p className="muted small">출력 창에서 프린터를 고르면 바로 인쇄되고, 'PDF로 저장'을 고르면 A4 PDF 파일이 됩니다.</p>
        )}
      </section>

      <div className="paper-stack">
        {(printAll || doc === 'ceo') && <CeoReport file={file} analyses={analyses} a={a} advisor={advisor} today={today} />}
        {(printAll || doc === 'firm') && <FirmLetter file={file} a={a} today={today} />}
        {(printAll || doc === 'note') && <AdvisorNote file={file} a={a} />}
      </div>
    </div>
  );
}

function Page({ children, n, total, title }: { children: React.ReactNode; n: number; total: number; title: string }) {
  return (
    <article className="paper">
      <div className="paper-body">{children}</div>
      <footer className="paper-foot">
        <span>
          {title} · 채움 ver2.1
        </span>
        <span>
          {n} / {total}
        </span>
      </footer>
    </article>
  );
}

function CeoReport({ file, analyses, a, advisor, today }: { file: CaseProps['file']; analyses: Analysis[]; a: Analysis; advisor: Advisor; today: string }) {
  const { company, statements: cs } = file;
  const sc = file.scenarios[file.activeScenario];
  const lines = headline(a, company, sc.name);
  const succession = company.purposes.includes('succession');
  const total = succession ? 5 : 4;
  const title = `${company.name} ${a.year} 가결산 리포트`;
  const pPrior = profit(cs.prior.is);
  const pYtd = profit(cs.current.is);
  const pProj = profit(a.projected.is);
  const pScen = profit(a.scenario.is);
  const tPrior = totals(cs.prior.bs);
  const tProj = totals(a.projected.bs);
  const tScen = totals(a.scenario.bs);
  const counts = countSignals(a.rows, 'projectedSignal');
  const thisYear = a.actions.filter((x) => x.when === '올해 안에');
  const nextYear = a.actions.filter((x) => x.when === '내년');

  return (
    <>
      <Page n={1} total={total} title={title}>
        <p className="doc-eyebrow">
          {a.year}년 가결산 진단 · 기준일 {cs.interimDate}
        </p>
        <h1 className="doc-title">{company.name}</h1>
        <p className="doc-meta">
          대표이사 {company.ceo || '—'} · {company.industry || '업종 미입력'} · 진단 목적 {company.purposes.map((p) => PURPOSE_LABELS[p]).join(', ')}
        </p>
        <div className="doc-summary">
          <h2>대표님께 드리는 요약</h2>
          <ol>
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
        </div>
        <div className="doc-kpis">
          <Kpi label="연말 예상 매출" value={mil(a.projected.is.revenue)} unit="백만원" sub={`전기 ${mil(cs.prior.is.revenue)}`} />
          <Kpi label="연말 예상 영업이익" value={mil(pProj.operatingIncome)} unit="백만원" sub={`전기 ${mil(pPrior.operatingIncome)}`} />
          <Kpi label="연말 부채비율" value={formatRatio(tProj.equity > 0 ? tProj.liabilities / tProj.equity : null, '%')} sub={`전기 ${formatRatio(tPrior.equity > 0 ? tPrior.liabilities / tPrior.equity : null, '%')}`} />
          <Kpi label="지표 점검" value={`${counts.good} / ${a.rows.length}`} unit="충족" sub={`주의 ${counts.caution} · 미달 ${counts.bad}`} />
        </div>
        <div className="doc-sign">
          <span>
            작성 {advisor.org} {advisor.name} · {advisor.phone}
          </span>
          <span>{today}</span>
        </div>
      </Page>

      <Page n={2} total={total} title={title}>
        <h2 className="doc-h2">1. 올해 실적과 연말 예상</h2>
        <p className="doc-p">
          {a.months.toFixed(0)}개월 누적 실적을 {file.projection.method === 'simple' ? '단순 연환산' : '대표님 예상 매출을 반영'}해 연말 결산을 추정했습니다. (단위: 백만원)
        </p>
        <table className="doc-table">
          <thead>
            <tr>
              <th></th>
              <th>전기 결산</th>
              <th>가결산 누적</th>
              <th>연말 예상</th>
              <th>시나리오</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['매출액', cs.prior.is.revenue, cs.current.is.revenue, a.projected.is.revenue, a.scenario.is.revenue],
                ['영업이익', pPrior.operatingIncome, pYtd.operatingIncome, pProj.operatingIncome, pScen.operatingIncome],
                ['당기순이익', pPrior.netIncome, pYtd.netIncome, pProj.netIncome, pScen.netIncome],
                ['법인세(추정)', cs.prior.is.incomeTax, cs.current.is.incomeTax, a.projected.is.incomeTax, a.scenario.is.incomeTax],
                ['자산총계', tPrior.assets, totals(cs.current.bs).assets, tProj.assets, tScen.assets],
                ['부채총계', tPrior.liabilities, totals(cs.current.bs).liabilities, tProj.liabilities, tScen.liabilities],
                ['자본총계', tPrior.equity, totals(cs.current.bs).equity, tProj.equity, tScen.equity],
                ['차입금(가수금 포함)', tPrior.borrowings, totals(cs.current.bs).borrowings, tProj.borrowings, tScen.borrowings],
                ['가지급금', cs.prior.bs.officerLoans, cs.current.bs.officerLoans, a.projected.bs.officerLoans, a.scenario.bs.officerLoans],
              ] as [string, number, number, number, number][]
            ).map(([l, ...v]) => (
              <tr key={l}>
                <th>{l}</th>
                {v.map((x, i) => (
                  <td key={i}>{mil(x)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="doc-h2">2. 돈의 흐름</h2>
        <p className="doc-p">
          올해 누적 순이익은 {mil(pYtd.netIncome)}백만원이지만 현금은 {mil(Math.abs(a.cashFlow.netChange))}백만원 {a.cashFlow.netChange < 0 ? '줄었습니다' : '늘었습니다'}.
          {a.cashFlow.topUses.length > 0 && ` 돈이 묶인 곳은 ${a.cashFlow.topUses.map((l) => `${l.label.replace(' 증감', '')}(${mil(-l.amount)})`).join(', ')}입니다.`}
        </p>
        <table className="doc-table narrow">
          <tbody>
            <tr>
              <th>영업활동</th>
              <td>{mil(a.cashFlow.operating)}</td>
            </tr>
            <tr>
              <th>투자활동(가지급금 포함)</th>
              <td>{mil(a.cashFlow.investing)}</td>
            </tr>
            <tr>
              <th>재무활동</th>
              <td>{mil(a.cashFlow.financing)}</td>
            </tr>
            <tr className="total">
              <th>현금 증감</th>
              <td>{mil(a.cashFlow.netChange)}</td>
            </tr>
          </tbody>
        </table>
        <p className="doc-note">현금흐름은 재무상태표 변동으로 추정한 값입니다.</p>
      </Page>

      <Page n={3} total={total} title={title}>
        <h2 className="doc-h2">3. 목적별 핵심 지표</h2>
        <table className="doc-table">
          <thead>
            <tr>
              <th>지표</th>
              <th>목표</th>
              <th>전기</th>
              <th>연말 예상</th>
              <th>시나리오</th>
            </tr>
          </thead>
          <tbody>
            {a.rows.map((r) => (
              <tr key={r.key}>
                <th>{r.label}</th>
                <td>{formatTarget(r)}</td>
                <td>
                  {formatRatio(r.prior, r.unit)} <SignalPill s={r.priorSignal} />
                </td>
                <td>
                  {formatRatio(r.projected, r.unit)} <SignalPill s={r.projectedSignal} />
                </td>
                <td>
                  {formatRatio(r.scenario, r.unit)} <SignalPill s={r.scenarioSignal} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="doc-note">목표치는 상담용 기준이며 금융기관·정책자금 운용기관별 심사 기준은 다를 수 있습니다.</p>

        <h2 className="doc-h2">4. 시나리오 비교</h2>
        <table className="doc-table">
          <thead>
            <tr>
              <th></th>
              {file.scenarios.map((s, i) => (
                <th key={i} className={i === file.activeScenario ? 'picked' : ''}>
                  {s.name}
                  {i === file.activeScenario && <span className="picked-tag">제안</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>주의·미달 지표</th>
              {analyses.map((x, i) => {
                const c = countSignals(x.rows, 'scenarioSignal');
                return <td key={i} className={i === file.activeScenario ? 'picked' : ''}>{c.caution + c.bad}개</td>;
              })}
            </tr>
            <tr>
              <th>부채비율</th>
              {analyses.map((x, i) => (
                <td key={i} className={i === file.activeScenario ? 'picked' : ''}>{formatRatio(x.rows.find((r) => r.key === 'debtRatio')?.scenario ?? null, '%')}</td>
              ))}
            </tr>
            <tr>
              <th>당기순이익(백만원)</th>
              {analyses.map((x, i) => (
                <td key={i} className={i === file.activeScenario ? 'picked' : ''}>{mil(profit(x.scenario.is).netIncome)}</td>
              ))}
            </tr>
            <tr>
              <th>추정 법인세(백만원)</th>
              {analyses.map((x, i) => (
                <td key={i} className={i === file.activeScenario ? 'picked' : ''}>{mil(x.scenario.is.incomeTax)}</td>
              ))}
            </tr>
            <tr>
              <th>1주당 평가액(원)</th>
              {analyses.map((x, i) => (
                <td key={i} className={i === file.activeScenario ? 'picked' : ''}>{won(x.valuation.scenario.valuePerShare)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </Page>

      <Page n={4} total={total} title={title}>
        <h2 className="doc-h2">5. 실행 계획 — {sc.name}</h2>
        <div className="doc-plan">
          <div>
            <h3>올해 안에 (결산일 전)</h3>
            {thisYear.length === 0 ? <p className="doc-p">결산 전 추가 조치 없음</p> : <ActionList items={thisYear} />}
          </div>
          <div>
            <h3>내년 (결산 이후)</h3>
            {nextYear.length === 0 ? <p className="doc-p">—</p> : <ActionList items={nextYear} />}
            {a.scenario.deferred.map((d) => (
              <p key={d} className="doc-p">
                {d}
              </p>
            ))}
          </div>
        </div>
        {a.scenario.warnings.length > 0 && (
          <>
            <h3 className="doc-h3">확인이 필요한 사항</h3>
            <ul className="doc-list">
              {a.scenario.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </>
        )}
        <h3 className="doc-h3">다음 점검 일정</h3>
        <ul className="doc-list">
          <li>12월 중순: 실행 여부 확인, 회계사무실 결산 방향 공유</li>
          <li>다음 해 3월: 확정 결산 재무제표로 지표 재점검</li>
          <li>다음 해 9~10월: 가결산 진단</li>
        </ul>
        {!succession && <p className="doc-disclaimer">{DISCLAIMER}</p>}
      </Page>

      {succession && (
        <Page n={5} total={total} title={title}>
          <h2 className="doc-h2">6. 주식가치와 지분 이전</h2>
          <p className="doc-p">
            비상장주식은 최근 3년 순이익(올해 비중이 가장 큼)과 순자산으로 평가합니다. 올해 결산 결과가 내년 지분 이전 비용을 좌우합니다.
          </p>
          <table className="doc-table">
            <thead>
              <tr>
                <th></th>
                <th>연말 예상</th>
                <th>{sc.name}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>1주당 순손익가치</th>
                <td>{won(a.valuation.projected.incomeValuePerShare)}원</td>
                <td>{won(a.valuation.scenario.incomeValuePerShare)}원</td>
              </tr>
              <tr>
                <th>1주당 순자산가치</th>
                <td>{won(a.valuation.projected.netAssetValuePerShare)}원</td>
                <td>{won(a.valuation.scenario.netAssetValuePerShare)}원</td>
              </tr>
              <tr className="total">
                <th>1주당 평가액</th>
                <td>{won(a.valuation.projected.valuePerShare)}원</td>
                <td>{won(a.valuation.scenario.valuePerShare)}원</td>
              </tr>
              <tr>
                <th>대표 지분가치 ({won(company.ceoShares)}주)</th>
                <td>{mil(a.valuation.projected.valuePerShare * company.ceoShares)}백만원</td>
                <td>{mil(a.valuation.scenario.valuePerShare * company.ceoShares)}백만원</td>
              </tr>
              {a.giftTax.shares > 0 && (
                <tr>
                  <th>자녀 증여세 추정 ({won(a.giftTax.shares)}주)</th>
                  <td>{mil(a.giftTax.projected)}백만원</td>
                  <td>{mil(a.giftTax.scenario)}백만원</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="doc-callout">
            이익을 늘리면 대출·정책자금 심사에는 유리하지만 주식가치와 법인세가 함께 오릅니다. 어느 쪽을 우선할지 정한 뒤 결산 방향을 회계사무실과 맞추는 것이 좋습니다.
          </div>
          <p className="doc-note">
            상속세 및 증여세법상 보충적 평가를 단순화한 추정치입니다(순손익가치:순자산가치 = {company.isRealEstateHeavy ? '2:3' : '3:2'}, 순자산가치 80% 하한
            {company.isSme ? ', 중소기업 최대주주 할증 없음' : ', 최대주주 할증 20%'}). 증여세는 성인 자녀 공제 5천만원과 신고세액공제만 반영했습니다.
          </p>
          <p className="doc-disclaimer">{DISCLAIMER}</p>
        </Page>
      )}
    </>
  );
}

function ActionList({ items }: { items: Analysis['actions'] }) {
  return (
    <ul className="doc-actions">
      {items.map((x) => (
        <li key={x.title}>
          <strong>{x.title}</strong>
          <span>{x.detail}</span>
        </li>
      ))}
    </ul>
  );
}

function Kpi({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub: string }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">
        {value}
        {unit && <small> {unit}</small>}
      </span>
      <span className="kpi-sub">{sub}</span>
    </div>
  );
}

function FirmLetter({ file, a, today }: { file: CaseProps['file']; a: Analysis; today: string }) {
  const { company } = file;
  const planned = a.actions.filter((x) => x.when === '올해 안에');
  return (
    <Page n={1} total={1} title="결산 협조 요청서">
      <h1 className="doc-title small">{a.year}년 결산 협조 요청서</h1>
      <table className="doc-table narrow letter-head">
        <tbody>
          <tr>
            <th>수신</th>
            <td>{file.accountingFirm || '담당 세무회계사무소'} 귀중</td>
          </tr>
          <tr>
            <th>발신</th>
            <td>
              {company.name} 대표이사 {company.ceo}
            </td>
          </tr>
          <tr>
            <th>일자</th>
            <td>{today}</td>
          </tr>
        </tbody>
      </table>
      <p className="doc-p">
        항상 회사 회계 업무를 챙겨 주셔서 감사합니다. {a.year}년 {file.statements.interimDate} 가결산 자료를 검토한 결과,{' '}
        {company.purposes.map((p) => PURPOSE_LABELS[p]).join('·')}을(를) 위해 올해 결산에서 아래 재무비율을 유지하는 것을 목표로 하고자 합니다. 결산 방향 검토에 참고 부탁드립니다.
      </p>
      <h3 className="doc-h3">목표 재무비율</h3>
      <table className="doc-table">
        <thead>
          <tr>
            <th>지표</th>
            <th>목표</th>
            <th>가결산 기준 연말 예상</th>
            <th>계획 반영 후</th>
          </tr>
        </thead>
        <tbody>
          {a.rows.map((r) => (
            <tr key={r.key}>
              <th>{r.label}</th>
              <td>{formatTarget(r)}</td>
              <td>{formatRatio(r.projected, r.unit)}</td>
              <td>{formatRatio(r.scenario, r.unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {planned.length > 0 && (
        <>
          <h3 className="doc-h3">결산 전 실행 예정 사항</h3>
          <ul className="doc-list">
            {planned.map((x) => (
              <li key={x.title}>
                {x.title} — {x.detail}
              </li>
            ))}
          </ul>
        </>
      )}
      <h3 className="doc-h3">확인 요청 사항</h3>
      <ul className="doc-list">
        <li>연말 예상 법인세 규모와 적용 가능한 공제·감면 검토 (가결산 기준 추정 {mil(a.scenario.is.incomeTax)}백만원, 지방소득세 포함)</li>
        {a.projected.bs.officerLoans > 0 && <li>가지급금 {mil(a.projected.bs.officerLoans)}백만원의 인정이자 계상과 정리 방안</li>}
        <li>재고자산 실사, 매출채권 대손 등 결산 조정 항목</li>
        <li>감가상각 방법과 결산 반영 여부</li>
        <li>결산 확정 전 재무제표 초안 공유 (지표 재확인용)</li>
      </ul>
      <div className="doc-sign letter">
        <span>{company.name}</span>
        <span>대표이사 {company.ceo} (인)</span>
      </div>
    </Page>
  );
}

function AdvisorNote({ file, a }: { file: CaseProps['file']; a: Analysis }) {
  const { company } = file;
  const issues = a.rows.filter((r) => r.projectedSignal === 'bad' || r.projectedSignal === 'caution');
  return (
    <Page n={1} total={1} title="상담노트 (내부용)">
      <p className="doc-eyebrow">내부용 · 대표님께 드리지 않는 자료</p>
      <h1 className="doc-title small">{company.name} 상담노트</h1>
      <h3 className="doc-h3">먼저 짚을 지표</h3>
      {issues.length === 0 ? (
        <p className="doc-p">경고 지표 없음 — 승계·자산 관리 주제로 대화를 여는 것을 권합니다.</p>
      ) : (
        <ul className="doc-list">
          {issues.map((r) => (
            <li key={r.key}>
              {r.label} {formatRatio(r.projected, r.unit)} (목표 {formatTarget(r)})
            </li>
          ))}
        </ul>
      )}
      <h3 className="doc-h3">질문 스크립트</h3>
      <ol className="doc-list">
        {consultingQuestions(a, company).map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ol>
      <h3 className="doc-h3">후속 상담 주제</h3>
      <ul className="doc-list">
        {followUpTopics(company, a).map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <h3 className="doc-h3">말할 때 주의</h3>
      <ul className="doc-list">
        <li>"절세 방법을 알려드린다"가 아니라 "결산 전에 확인할 지표"로 설명하기</li>
        <li>세무 판단은 회계사무실 몫 — 요청서는 대표님 명의로 전달</li>
        <li>리포트에는 상품명을 넣지 않고, 상품 제안은 별도 자리에서</li>
      </ul>
    </Page>
  );
}
