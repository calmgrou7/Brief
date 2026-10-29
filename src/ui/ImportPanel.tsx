import { useState } from 'react';
import { totals } from '../engine';
import { emptyBalanceSheet } from '../engine/statements';
import { readPdfText } from '../import/pdfText';
import { parseStatements, toBalanceSheets, type BsKey, type ImportResult } from '../import/statementParser';
import { BS_ROWS } from './accounts';
import { mil, won } from './format';
import type { CaseFile } from './store';

type Status = { kind: 'idle' } | { kind: 'reading'; name: string } | { kind: 'error'; message: string } | { kind: 'review'; name: string; result: ImportResult };

export function ImportPanel({ onApply }: { onApply: (patch: (c: CaseFile) => CaseFile) => void }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setStatus({ kind: 'reading', name: file.name });
    try {
      const result = parseStatements(await readPdfText(file));
      if (!result.accounts.length && !result.income.current.revenue) {
        setStatus({ kind: 'error', message: '재무상태표·손익계산서를 찾지 못했습니다. 스캔 이미지 PDF는 아직 읽을 수 없습니다 — 회계사무실에서 받은 원본 PDF인지 확인해 주세요.' });
        return;
      }
      setStatus({ kind: 'review', name: file.name, result });
    } catch (e) {
      setStatus({ kind: 'error', message: `PDF를 열지 못했습니다 (${(e as Error).message}). 암호가 걸린 파일이면 해제 후 다시 올려 주세요.` });
    }
  };

  return (
    <section className="panel import">
      <div className="panel-head">
        <h2>회계사무실 PDF 불러오기</h2>
        <p className="muted">비교식 재무상태표·손익계산서(제조원가명세서 포함) PDF를 올리면 계정별 금액을 채웁니다. 파일은 이 기기 안에서만 읽습니다.</p>
      </div>
      <label className="dropzone" htmlFor="pdf-file">
        <input id="pdf-file" type="file" accept="application/pdf,.pdf" onChange={(e) => onFile(e.target.files?.[0])} />
        <strong>{status.kind === 'reading' ? `${status.name} 읽는 중…` : 'PDF 파일 선택'}</strong>
        <span className="muted">또는 여기로 끌어다 놓기</span>
      </label>
      {status.kind === 'error' && <p className="alert">{status.message}</p>}
      {status.kind === 'review' && (
        <Review
          name={status.name}
          result={status.result}
          onCancel={() => setStatus({ kind: 'idle' })}
          onApply={(result) => {
            const { current, prior } = toBalanceSheets(result.accounts, emptyBalanceSheet);
            onApply((c) => ({
              ...c,
              isSample: false,
              company: { ...c.company, name: result.companyName ?? c.company.name },
              statements: {
                interimDate: result.interimDate ?? c.statements.interimDate,
                current: { bs: current, is: result.income.current },
                prior: { bs: prior, is: result.income.prior },
              },
            }));
            setStatus({ kind: 'idle' });
          }}
        />
      )}
    </section>
  );
}

function Review({ name, result, onApply, onCancel }: { name: string; result: ImportResult; onApply: (r: ImportResult) => void; onCancel: () => void }) {
  const [accounts, setAccounts] = useState(result.accounts);
  const setKey = (i: number, key: BsKey) => setAccounts((as) => as.map((a, j) => (j === i ? { ...a, key } : a)));
  const { current, prior } = toBalanceSheets(accounts, emptyBalanceSheet);
  const tc = totals(current);
  const tp = totals(prior);
  const checks: [string, number, number | undefined][] = [
    ['자산총계(당기)', tc.assets, result.reported.current.assets],
    ['부채총계(당기)', tc.liabilities, result.reported.current.liabilities],
    ['자본총계(당기)', tc.equity, result.reported.current.equity],
    ['자산총계(전기)', tp.assets, result.reported.prior.assets],
  ];
  const reviewCount = accounts.filter((a) => a.review).length;

  return (
    <div className="review">
      <div className="review-head">
        <div>
          <strong>{result.companyName ?? name}</strong>
          <span className="muted"> · 기준일 {result.interimDate ?? '확인 필요'} · {result.pagesFound.join(', ')}</span>
        </div>
        <ul className="checks">
          {checks.map(([label, got, want]) => (
            <li key={label} className={want === undefined ? '' : got === want ? 'ok' : 'off'}>
              {want === undefined ? '—' : got === want ? '✓' : '✕'} {label} {mil(got)}
              {want !== undefined && got !== want && ` (원본 ${mil(want)})`}
            </li>
          ))}
        </ul>
      </div>
      {result.warnings.map((w) => (
        <p key={w} className="alert">
          {w}
        </p>
      ))}
      {reviewCount > 0 && <p className="review-note">▲ 표시된 {reviewCount}개 계정은 분류를 확인해 주세요. 대표님께 빌려준 돈이면 '가지급금'으로 바꾸면 진단에 반영됩니다.</p>}
      <div className="table-wrap">
        <table className="sheet compact review-table">
          <thead>
            <tr>
              <th>PDF 계정</th>
              <th>분류</th>
              <th className="num">당기</th>
              <th className="num">전기</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a, i) => (
              <tr key={i} className={a.review ? 'flag' : ''}>
                <th scope="row">
                  {a.review && <span aria-hidden="true">▲ </span>}
                  {a.name}
                  <span className="hint">{a.review ?? a.path}</span>
                </th>
                <td>
                  <label className="sr-only" htmlFor={`map-${i}`}>
                    {a.name} 분류
                  </label>
                  <select id={`map-${i}`} value={a.key} onChange={(e) => setKey(i, e.target.value as BsKey)}>
                    {BS_ROWS.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="num">{won(a.current)}</td>
                <td className="num">{won(a.prior)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        손익계산서: 매출액 {mil(result.income.current.revenue)} · 영업이익 {mil(result.income.current.revenue - result.income.current.costOfSales - result.income.current.sga)} · 이자비용{' '}
        {mil(result.income.current.interestExpense)} · 감가상각비 {mil(result.income.current.depreciation)} (백만원, 당기 누적)
      </p>
      <div className="review-actions">
        <button className="btn primary" onClick={() => onApply({ ...result, accounts })}>
          이 내용으로 채우기
        </button>
        <button className="btn ghost" onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  );
}
