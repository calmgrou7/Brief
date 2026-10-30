import { RATIO_GUIDE, formatRatio, formatTarget, verdict, type Grade, type RatioRow, type Signal } from '../engine';

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
export function RatioCards({ rows, from, to, final = false }: { rows: RatioRow[]; from: Col; to: Col; final?: boolean }) {
  const COL_LABEL = colLabels(final);
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
            <p className="rc-read">{RATIO_GUIDE[r.key].read(r[to])}</p>
            <div className="rc-meta">
              <span>목표 {formatTarget(r)}</span>
              <span>
                {COL_LABEL[from]} {formatRatio(r[from], r.unit)}
              </span>
            </div>
            <details className="rc-more">
              <summary>이 지표는?</summary>
              <p>
                <strong>{RATIO_GUIDE[r.key].what}</strong> ({r.hint})
              </p>
              <p>{RATIO_GUIDE[r.key].why}</p>
            </details>
          </div>
        );
      })}
    </div>
  );
}

type Col = 'prior' | 'projected' | 'scenario';
const colLabels = (final: boolean): Record<Col, string> => ({ prior: '전기 결산', projected: final ? '당기 결산' : '연말 예상', scenario: '시나리오 적용' });

const GRADE_TONE: Record<Grade, Signal> = { 양호: 'good', 보통: 'caution', 주의: 'caution', 위험: 'bad' };

/** 지표 여러 개를 한 줄로 요약한 종합 판정 */
export function Verdict({ rows, col, before, final = false }: { rows: RatioRow[]; col: Col; before?: Col; final?: boolean }) {
  const v = verdict(rows, col, final);
  const b = before ? verdict(rows, before, final) : null;
  return (
    <div className={`verdict ${GRADE_TONE[v.grade]}`}>
      <span className="verdict-grade">
        종합 판정
        <strong>
          {b && b.grade !== v.grade && <>{b.grade} → </>}
          {v.grade}
        </strong>
      </span>
      <p>{v.line}</p>
    </div>
  );
}
