import { countSignals, profit, totals, type CashFlowLine } from '../engine';
import type { CaseProps } from './App';
import { mil } from './format';
import { RatioTable } from './parts';

export function DiagnosisView({ file, analyses }: CaseProps) {
  const a = analyses[0];
  const cs = file.statements;
  const pPrior = profit(cs.prior.is);
  const pYtd = profit(cs.current.is);
  const pProj = profit(a.projected.is);
  const counts = countSignals(a.rows, 'projectedSignal');
  const cf = a.cashFlow;

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <h2>연말 예상 손익</h2>
          <p className="muted">
            {cs.interimDate} 기준 {a.months.toFixed(0)}개월 누적 → {file.projection.method === 'simple' ? '단순 연환산' : '대표님 예상 매출 반영'} · 단위: 백만원
          </p>
        </div>
        <div className="table-wrap">
          <table className="sheet compact">
            <thead>
              <tr>
                <th></th>
                <th className="num">전기 결산</th>
                <th className="num">가결산 누적</th>
                <th className="num">연말 예상</th>
                <th className="num">전기 대비</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['매출액', cs.prior.is.revenue, cs.current.is.revenue, a.projected.is.revenue],
                  ['영업이익', pPrior.operatingIncome, pYtd.operatingIncome, pProj.operatingIncome],
                  ['법인세차감전이익', pPrior.pretaxIncome, pYtd.pretaxIncome, pProj.pretaxIncome],
                  ['법인세(추정, 지방세 포함)', cs.prior.is.incomeTax, cs.current.is.incomeTax, a.projected.is.incomeTax],
                  ['당기순이익', pPrior.netIncome, pYtd.netIncome, pProj.netIncome],
                ] as [string, number, number, number][]
              ).map(([l, p, y, e]) => (
                <tr key={l}>
                  <th scope="row">{l}</th>
                  <td className="num">{mil(p)}</td>
                  <td className="num">{mil(y)}</td>
                  <td className="num strong">{mil(e)}</td>
                  <td className="num muted">{p !== 0 ? `${(((e - p) / Math.abs(p)) * 100).toFixed(1)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>목적별 핵심 지표</h2>
          <p className="summary-line">
            <span className="pill good">충족 {counts.good}</span>
            <span className="pill caution">주의 {counts.caution}</span>
            <span className="pill bad">미달 {counts.bad}</span>
          </p>
        </div>
        <RatioTable rows={a.rows} cols={['prior', 'projected']} />
        <p className="muted small">목표치는 상담용 기본값입니다. 기관·은행별 실제 심사 기준은 다를 수 있습니다.</p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>돈의 흐름 (추정 현금흐름)</h2>
          <p className="muted">전기말 → 가결산 기준일 재무상태표 변동으로 추정 · 단위: 백만원</p>
        </div>
        <div className="cf-grid">
          <CfBlock title="영업활동" total={cf.operating} lines={cf.lines.operating} />
          <CfBlock title="투자활동" total={cf.investing} lines={cf.lines.investing} />
          <CfBlock title="재무활동" total={cf.financing} lines={cf.lines.financing} />
        </div>
        <div className="callout">
          <strong>
            누적 순이익 {mil(pYtd.netIncome)} → 현금 증감 {mil(cf.netChange)}
          </strong>
          {cf.topUses.length > 0 && (
            <span>
              {' '}
              돈이 가장 많이 묶인 곳: {cf.topUses.map((l) => `${l.label.replace(' 증감', '')} ${mil(-l.amount)}`).join(', ')}
            </span>
          )}
        </div>
        <p className="muted small">
          가결산 자산총계 {mil(totals(cs.current.bs).assets)} · 부채총계 {mil(totals(cs.current.bs).liabilities)} · 자본총계 {mil(totals(cs.current.bs).equity)}
        </p>
      </section>
    </div>
  );
}

function CfBlock({ title, total, lines }: { title: string; total: number; lines: CashFlowLine[] }) {
  const max = Math.max(1, ...lines.map((l) => Math.abs(l.amount)));
  return (
    <div className="cf-block">
      <div className="cf-head">
        <span>{title}</span>
        <span className={`num ${total < 0 ? 'neg' : 'pos'}`}>{mil(total)}</span>
      </div>
      <ul>
        {lines
          .filter((l) => Math.round(l.amount / 1e6) !== 0)
          .map((l) => (
            <li key={l.label}>
              <span className="cf-label">{l.label}</span>
              <span className="cf-bar">
                <span className={l.amount < 0 ? 'neg' : 'pos'} style={{ width: `${(Math.abs(l.amount) / max) * 100}%` }} />
              </span>
              <span className={`num ${l.amount < 0 ? 'neg' : ''}`}>{mil(l.amount)}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
