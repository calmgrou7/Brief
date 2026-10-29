import type { Analysis, RatioRow, Signal } from './diagnose';
import { PURPOSE_LABELS } from './params';
import { profit } from './statements';
import type { CompanyProfile } from './types';

const rank: Record<Signal, number> = { bad: 0, caution: 1, good: 2, na: 3 };

export function formatRatio(v: number | null, unit: '%' | '배'): string {
  if (v === null) return '—';
  return unit === '%' ? `${(v * 100).toFixed(1)}%` : `${v.toFixed(2)}배`;
}

export function formatTarget(row: RatioRow): string {
  const t = formatRatio(row.threshold.target, row.unit);
  return row.threshold.direction === 'max' ? `${t} 이하` : `${t} 이상`;
}

export function countSignals(rows: RatioRow[], col: 'projectedSignal' | 'scenarioSignal') {
  return {
    good: rows.filter((r) => r[col] === 'good').length,
    caution: rows.filter((r) => r[col] === 'caution').length,
    bad: rows.filter((r) => r[col] === 'bad').length,
  };
}

/** 대표에게 드리는 세 줄 결론 */
export function headline(a: Analysis, company: CompanyProfile, scenarioName: string): string[] {
  const lines: string[] = [];
  const purposes = company.purposes.map((p) => PURPOSE_LABELS[p]).join('·');
  const issues = [...a.rows]
    .filter((r) => r.projectedSignal === 'bad' || r.projectedSignal === 'caution')
    .sort((x, y) => rank[x.projectedSignal] - rank[y.projectedSignal]);

  if (issues.length === 0) {
    lines.push(`현재 추세대로 결산하면 ${purposes} 기준 핵심 지표가 모두 목표 범위 안에 있습니다.`);
  } else {
    const top = issues
      .slice(0, 2)
      .map((r) => `${r.label} ${formatRatio(r.projected, r.unit)}(목표 ${formatTarget(r)})`)
      .join(', ');
    lines.push(`현재 추세대로 결산하면 ${purposes} 기준 ${issues.length}개 지표가 목표에 못 미칩니다: ${top}.`);
  }

  const before = countSignals(a.rows, 'projectedSignal');
  const after = countSignals(a.rows, 'scenarioSignal');
  const changed = a.rows.some((r) => r.projected !== r.scenario);
  if (changed) {
    lines.push(
      `'${scenarioName}' 조치를 결산 전에 실행하면 주의·미달 지표가 ${before.bad + before.caution}개에서 ${after.bad + after.caution}개로 바뀝니다.`,
    );
  }

  if (company.purposes.includes('succession')) {
    const v0 = a.valuation.projected.valuePerShare;
    const v1 = a.valuation.scenario.valuePerShare;
    const diff = v1 - v0;
    lines.push(
      diff === 0
        ? `올해 결산 기준 1주당 평가액은 약 ${v1.toLocaleString('ko-KR')}원으로, 내년 지분 이전 시 기준이 됩니다.`
        : `시나리오 적용 시 1주당 평가액이 ${Math.abs(diff).toLocaleString('ko-KR')}원 ${diff > 0 ? '올라' : '내려'} 약 ${v1.toLocaleString('ko-KR')}원이 됩니다 — 지분 이전 비용에 직접 영향을 줍니다.`,
    );
  } else {
    const ni = profit(a.scenario.is).netIncome;
    lines.push(`연말 예상 당기순이익은 약 ${Math.round(ni / 1e6).toLocaleString('ko-KR')}백만원, 추정 법인세는 ${Math.round(a.scenario.is.incomeTax / 1e6).toLocaleString('ko-KR')}백만원입니다.`);
  }
  return lines;
}

/** 설계사 상담 질문 스크립트 */
export function consultingQuestions(a: Analysis, company: CompanyProfile): string[] {
  const q = ['올해 남은 기간에 확정된 큰 수주나 납품, 또는 큰 지출 계획이 있으신가요?'];
  const weak = (k: string) => a.rows.some((r) => r.key === k && r.projectedSignal !== 'good' && r.projectedSignal !== 'na');
  if (weak('debtRatio') || weak('borrowingDependence')) q.push('내년에 대출을 더 받으실 계획이 있나요? 올해 결산 비율을 먼저 맞추면 조건이 달라질 수 있습니다.');
  if (weak('officerLoanShare') || a.scenario.bs.officerLoans > 0) q.push('가지급금이 어떻게 생겼는지, 정리 계획을 회계사무실과 이야기해 보셨나요?');
  if (weak('capitalImpairment')) q.push('정책자금 신청 계획이 있으신가요? 자본잠식은 신청 제한 사유가 될 수 있습니다.');
  if (company.purposes.includes('succession')) {
    q.push('자녀분께 지분을 언제쯤, 얼마나 넘기실 생각이세요?');
    q.push('정관에 임원 퇴직금 지급규정이 있는지 확인해 보셨나요?');
  }
  q.push('결산 전에 회계사무실과 미팅 일정이 잡혀 있나요? 요청서를 같이 전달드릴게요.');
  return q;
}

export function followUpTopics(company: CompanyProfile, a: Analysis): string[] {
  const t: string[] = [];
  if (company.purposes.includes('succession')) t.push('주식 이동·가업승계 플랜 (비상장주식 평가 정밀화)', '상속세 납부 재원 마련');
  if (a.scenario.bs.officerLoans > 0) t.push('가지급금 정리 로드맵');
  t.push('임원 보수·퇴직금 규정 정비 (정관 점검)');
  if (company.purposes.includes('policyFund')) t.push('정책자금 신청 일정과 기업 인증 준비');
  return t;
}
