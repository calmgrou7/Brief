import { PURPOSE_LABELS, totals, type BalanceSheet, type IncomeStatement, type Purpose } from '../engine';
import { profit } from '../engine/statements';
import type { CaseProps } from './App';
import { BS_ROWS, IS_ROWS, type Row } from './accounts';
import { mil, won } from './format';
import { CrmPanel } from './CrmPanel';
import { ImportPanel } from './ImportPanel';
import { MoneyInput } from './MoneyInput';

type Col = 'current' | 'prior';

export function InputView({ file, update, onRemove }: CaseProps & { onRemove?: () => void }) {
  const { company, statements: cs, projection } = file;
  const setCompany = (patch: Partial<typeof company>) => update((c) => ({ ...c, company: { ...c.company, ...patch } }));

  const setBs = (col: Col, key: keyof BalanceSheet, v: number) =>
    update((c) => ({ ...c, statements: { ...c.statements, [col]: { ...c.statements[col], bs: { ...c.statements[col].bs, [key]: v } } } }));
  const setIs = (col: Col, key: keyof IncomeStatement, v: number) =>
    update((c) => ({ ...c, statements: { ...c.statements, [col]: { ...c.statements[col], is: { ...c.statements[col].is, [key]: v } } } }));

  const pasteInto = <K extends string>(rows: Row<K>[], start: K, col: Col, kind: 'bs' | 'is') => (values: number[]) => {
    const i = rows.findIndex((r) => r.key === start);
    update((c) => {
      const target = { ...c.statements[col][kind] } as Record<string, number>;
      values.forEach((v, j) => {
        const row = rows[i + j];
        if (row) target[row.key] = v;
      });
      return { ...c, statements: { ...c.statements, [col]: { ...c.statements[col], [kind]: target } } };
    });
    return true;
  };

  const togglePurpose = (p: Purpose) =>
    setCompany({ purposes: company.purposes.includes(p) ? company.purposes.filter((x) => x !== p) : [...company.purposes, p] });

  const final = projection.method === 'final';
  const individual = company.entity === 'individual';
  const tc = totals(cs.current.bs);
  const tp = totals(cs.prior.bs);
  const pc = profit(cs.current.is);
  const pp = profit(cs.prior.is);

  return (
    <div className="stack">
      <CrmPanel file={file} update={update} />
      <ImportPanel onApply={update} />

      <section className="panel">
        <h2>기업 정보</h2>
        <div className="form-grid">
          <Field id="co-name" label="회사명">
            <input id="co-name" value={company.name} onChange={(e) => setCompany({ name: e.target.value })} />
          </Field>
          <Field id="co-ceo" label="대표자">
            <input id="co-ceo" value={company.ceo} onChange={(e) => setCompany({ ceo: e.target.value })} />
          </Field>
          <Field id="co-ind" label="업종">
            <input id="co-ind" value={company.industry} onChange={(e) => setCompany({ industry: e.target.value })} />
          </Field>
          <Field id="co-firm" label="담당 회계사무실">
            <input id="co-firm" value={file.accountingFirm} onChange={(e) => update((c) => ({ ...c, accountingFirm: e.target.value }))} />
          </Field>
          {!individual && (
            <>
          <Field id="co-shares" label="발행주식총수">
            <MoneyInput id="co-shares" value={company.sharesOutstanding} onChange={(v) => setCompany({ sharesOutstanding: v })} suffix="주" />
          </Field>
          <Field id="co-ceo-shares" label="대표 보유 주식수">
            <MoneyInput id="co-ceo-shares" value={company.ceoShares} onChange={(v) => setCompany({ ceoShares: v })} suffix="주" />
          </Field>
          <Field id="co-ni2" label="전전기 당기순이익" hint="주식가치 3년 가중평균용">
            <MoneyInput id="co-ni2" value={company.netIncomeTwoYearsAgo} onChange={(v) => setCompany({ netIncomeTwoYearsAgo: v })} suffix="원" />
          </Field>
            </>
          )}
          <div className="field">
            <span className="field-label">사업자 구분</span>
            <div className="seg">
              <button className={!individual ? 'on' : ''} onClick={() => setCompany({ entity: 'corporation' })}>
                법인
              </button>
              <button className={individual ? 'on' : ''} onClick={() => setCompany({ entity: 'individual' })}>
                개인사업자
              </button>
            </div>
          </div>
          {!individual && (
            <div className="field">
              <span className="field-label">기업 구분</span>
              <label className="check">
                <input type="checkbox" id="co-sme" checked={company.isSme} onChange={(e) => setCompany({ isSme: e.target.checked })} /> 중소기업
              </label>
              <label className="check">
                <input type="checkbox" id="co-re" checked={company.isRealEstateHeavy} onChange={(e) => setCompany({ isRealEstateHeavy: e.target.checked })} /> 부동산과다보유법인
              </label>
            </div>
          )}
        </div>
        <div className="purpose-row">
          <span className="field-label">진단 목적</span>
          <div className="chips">
            {(Object.keys(PURPOSE_LABELS) as Purpose[]).filter((p) => !(individual && p === 'succession')).map((p) => (
              <button key={p} className={`chip ${company.purposes.includes(p) ? 'on' : ''}`} aria-pressed={company.purposes.includes(p)} onClick={() => togglePurpose(p)}>
                {PURPOSE_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>진단 기준</h2>
          <p className="muted">가결산은 연말을 추정하고, 확정 결산은 {individual ? '종합소득세' : '법인세'} 신고 후 재무제표를 그대로 진단합니다.</p>
        </div>
        <div className="form-grid">
          <div className="field wide">
            <span className="field-label">어떤 재무제표인가요?</span>
            <div className="seg">
              {(
                [
                  ['simple', '가결산 · 단순 연환산'],
                  ['ceoForecast', '가결산 · 대표님 예상 매출'],
                  ['final', '확정 결산 (신고 후)'],
                ] as const
              ).map(([m, l]) => (
                <button key={m} className={projection.method === m ? 'on' : ''} onClick={() => update((c) => ({ ...c, projection: { ...c.projection, method: m } }))}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <Field id="interim-date" label={final ? '결산일 (재무상태표 기준일)' : '가결산 기준일'}>
            <input id="interim-date" type="date" value={cs.interimDate} onChange={(e) => e.target.value && update((c) => ({ ...c, statements: { ...c.statements, interimDate: e.target.value } }))} />
          </Field>
          {projection.method === 'ceoForecast' && (
            <Field id="remaining-rev" label="기준일 이후 연말까지 예상 매출">
              <MoneyInput id="remaining-rev" value={projection.remainingRevenue} onChange={(v) => update((c) => ({ ...c, projection: { ...c.projection, remainingRevenue: v } }))} suffix="원" />
            </Field>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>비교식 재무상태표</h2>
          <p className="muted">단위: 원 · 회계사무실 비교식 재무제표의 금액 열을 복사해 첫 칸에 붙여넣으면 아래로 채워집니다.</p>
        </div>
        <StatementTable
          rows={BS_ROWS}
          get={(col, k) => cs[col].bs[k]}
          set={setBs}
          paste={(k, col) => pasteInto(BS_ROWS, k, col, 'bs')}
          prefix="bs"
          currentLabel={final ? '당기 (결산)' : '당기 (가결산)'}
          footer={[
            ['자산총계', tc.assets, tp.assets],
            ['부채총계', tc.liabilities, tp.liabilities],
            ['자본총계', tc.equity, tp.equity],
          ]}
        />
        {(tc.imbalance !== 0 || tp.imbalance !== 0) && (
          <p className="alert">
            자산과 부채+자본이 맞지 않습니다 (당기 차이 {won(tc.imbalance)}원, 전기 차이 {won(tp.imbalance)}원). 이익잉여금에 당기 누적이익이 포함됐는지 확인하세요.
          </p>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>비교식 손익계산서</h2>
          <p className="muted">{final ? '당기는 1년 전체(결산) 금액입니다.' : '당기는 1월부터 가결산 기준일까지 누적 금액입니다.'}{individual && ' 개인사업자는 소득세를 비용에 넣지 않으므로 법인세비용 칸은 비워 두세요.'}</p>
        </div>
        <StatementTable
          rows={IS_ROWS}
          get={(col, k) => cs[col].is[k]}
          set={setIs}
          paste={(k, col) => pasteInto(IS_ROWS, k, col, 'is')}
          prefix="is"
          currentLabel={final ? '당기 (결산)' : '당기 (가결산)'}
          footer={[
            ['영업이익', pc.operatingIncome, pp.operatingIncome],
            ['법인세차감전이익', pc.pretaxIncome, pp.pretaxIncome],
            ['당기순이익', pc.netIncome, pp.netIncome],
          ]}
        />
      </section>

      {onRemove && (
        <div className="danger-zone">
          <RemoveButton name={company.name} onRemove={onRemove} />
        </div>
      )}
    </div>
  );
}

function RemoveButton({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <details>
      <summary className="btn ghost">이 기업 삭제</summary>
      <p className="muted">
        {name}의 입력 자료와 시나리오가 이 기기에서 지워집니다. <button className="btn danger" onClick={onRemove}>삭제</button>
      </p>
    </details>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

function StatementTable<K extends string>({
  rows,
  get,
  set,
  paste,
  prefix,
  currentLabel,
  footer,
}: {
  rows: Row<K>[];
  get: (col: Col, k: K) => number;
  set: (col: Col, k: K, v: number) => void;
  paste: (k: K, col: Col) => (values: number[]) => boolean;
  prefix: string;
  currentLabel: string;
  footer: [string, number, number][];
}) {
  return (
    <div className="table-wrap">
      <table className="sheet">
        <thead>
          <tr>
            <th>계정과목</th>
            <th className="num">{currentLabel}</th>
            <th className="num">전기 (결산)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={r.group ? 'group-start' : ''}>
              <th scope="row">
                {r.group && <span className="group">{r.group}</span>}
                {r.label}
              </th>
              {(['current', 'prior'] as Col[]).map((col) => (
                <td key={col}>
                  <MoneyInput
                    id={`${prefix}-${col}-${r.key}`}
                    ariaLabel={`${r.label} ${col === 'current' ? '당기' : '전기'}`}
                    value={get(col, r.key)}
                    onChange={(v) => set(col, r.key, v)}
                    onPasteColumn={paste(r.key, col)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          {footer.map(([label, a, b]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td className="num">{won(a)}</td>
              <td className="num">{won(b)}</td>
            </tr>
          ))}
          <tr className="unit-row">
            <td colSpan={3} className="muted">백만원 환산: {footer.map(([l, a]) => `${l} ${mil(a)}`).join(' · ')}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
