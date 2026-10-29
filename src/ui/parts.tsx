import { formatRatio, formatTarget, type RatioRow, type Signal } from '../engine';

const SIGNAL_TEXT: Record<Signal, string> = { good: '충족', caution: '주의', bad: '미달', na: '—' };

export function SignalPill({ s }: { s: Signal }) {
  if (s === 'na') return null;
  return <span className={`pill ${s}`}>{SIGNAL_TEXT[s]}</span>;
}

type Col = 'prior' | 'projected' | 'scenario';
const COL_LABEL: Record<Col, string> = { prior: '전기 결산', projected: '연말 예상', scenario: '시나리오 적용' };

export function RatioTable({ rows, cols }: { rows: RatioRow[]; cols: Col[] }) {
  return (
    <div className="table-wrap">
      <table className="ratios">
        <thead>
          <tr>
            <th>지표</th>
            <th className="num">목표</th>
            {cols.map((c) => (
              <th key={c} className="num">
                {COL_LABEL[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">
                {r.label}
                <span className="hint">{r.hint}</span>
              </th>
              <td className="num muted">{formatTarget(r)}</td>
              {cols.map((c) => (
                <td key={c} className="num">
                  <span className="ratio-cell">
                    {formatRatio(r[c], r.unit)}
                    <SignalPill s={r[`${c}Signal`]} />
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
