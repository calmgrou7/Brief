import { formatRatio, formatTarget, type RatioRow, type Signal } from '../engine';

const SIGNAL_TEXT: Record<Signal, string> = { good: '충족', caution: '주의', bad: '미달', na: '—' };
// 색을 구분하기 어려운 경우를 위해 모양으로도 구분
const SIGNAL_MARK: Record<Signal, string> = { good: '●', caution: '▲', bad: '✕', na: '' };

export function SignalPill({ s }: { s: Signal }) {
  if (s === 'na') return null;
  return (
    <span className={`pill ${s}`}>
      <span aria-hidden="true">{SIGNAL_MARK[s]}</span> {SIGNAL_TEXT[s]}
    </span>
  );
}

/** 지표 카드: 큰 숫자 + 목표 + 비교 값 */
export function RatioCards({ rows, from, to }: { rows: RatioRow[]; from: Col; to: Col }) {
  return (
    <div className="ratio-cards">
      {rows.map((r) => {
        const sig = r[`${to}Signal`];
        return (
          <div key={r.key} className={`ratio-card ${sig}`}>
            <div className="rc-top">
              <span className="rc-label">{r.label}</span>
              <SignalPill s={sig} />
            </div>
            <div className="rc-value">{formatRatio(r[to], r.unit)}</div>
            <div className="rc-meta">
              <span>목표 {formatTarget(r)}</span>
              <span>
                {COL_LABEL[from]} {formatRatio(r[from], r.unit)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Col = 'prior' | 'projected' | 'scenario';
const COL_LABEL: Record<Col, string> = { prior: '전기 결산', projected: '연말 예상', scenario: '시나리오 적용' };
