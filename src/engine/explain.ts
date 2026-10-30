import type { RatioRow, Signal } from './diagnose';
import type { RatioKey } from './params';

// 대표님께 지표를 풀어서 설명하는 문장. 숫자 하나를 "무슨 뜻인지"로 바꾼다.

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const won100 = (v: number) => `${Math.round(v * 100).toLocaleString('ko-KR')}원`;

export interface RatioGuide {
  /** 지표가 무엇을 재는지 한 줄 */
  what: string;
  /** 현재 값을 쉬운 말로 */
  read: (v: number | null) => string;
  /** 금융기관이 왜 보는지(자세히 보기) */
  why: string;
}

export const RATIO_GUIDE: Record<RatioKey, RatioGuide> = {
  debtRatio: {
    what: '자기 돈 대비 빚이 얼마나 되는지',
    read: (v) => (v === null ? '자본이 모두 잠식되어 계산할 수 없음' : `자기 돈 100원당 빚이 ${won100(v)}`),
    why: '은행·보증기관이 가장 먼저 보는 안정성 지표입니다. 200%를 넘으면 추가 대출 한도와 금리에 불리하고, 업종 평균의 2배를 넘으면 정책자금 심사에서 감점될 수 있습니다.',
  },
  currentRatio: {
    what: '1년 안에 갚을 빚을 감당할 여력',
    read: (v) => (v === null ? '1년 안에 갚을 빚이 없음' : `1년 안에 갚을 빚 100원에 바로 쓸 수 있는 자산 ${won100(v)} (가지급금 제외)`),
    why: '100% 아래면 단기 빚을 갚을 돈이 모자란다는 뜻이라 만기 연장·신규 대출 심사에서 불리합니다.',
  },
  equityRatio: {
    what: '회사 재산 중 갚지 않아도 되는 자기 돈의 비중',
    read: (v) => (v === null ? '—' : `회사 재산의 ${pct(v)}가 자기 돈`),
    why: '높을수록 외부 충격에 강한 회사로 봅니다. 증자나 이익 적립으로 올라갑니다.',
  },
  borrowingDependence: {
    what: '회사 재산을 빌린 돈으로 얼마나 마련했는지',
    read: (v) => (v === null ? '—' : `회사 재산의 ${pct(v)}를 빌린 돈으로 마련`),
    why: '30%를 넘으면 차입 의존이 높다고 보고, 이자 부담과 함께 추가 대출 한도를 줄이는 요인이 됩니다.',
  },
  capitalImpairment: {
    what: '처음 넣은 자본금이 손실로 얼마나 줄었는지',
    read: (v) => (v === null ? '—' : v === 0 ? '자본금이 그대로 보존됨 (잠식 없음)' : v >= 1 ? '자본금이 모두 손실로 사라짐 (완전잠식)' : `자본금의 ${pct(v)}가 손실로 줄어듦`),
    why: '자본잠식은 정책자금·보증 신청이 제한되는 대표적인 사유입니다. 증자나 무상감자로 해소합니다.',
  },
  operatingMargin: {
    what: '본업(영업)에서 남기는 비율',
    read: (v) => (v === null ? '—' : `매출 100원당 본업에서 ${won100(v)}을 남김`),
    why: '이자를 감당하고 회사가 성장할 힘을 보여줍니다. 대출 심사에서 상환 능력을 판단하는 기본 자료입니다.',
  },
  netMargin: {
    what: '세금까지 낸 뒤 최종으로 남기는 비율',
    read: (v) => (v === null ? '—' : `매출 100원당 세금까지 내고 ${won100(v)}을 남김`),
    why: '최종 이익은 이익잉여금으로 쌓여 자기자본을 키우지만, 비상장주식 가치도 함께 올립니다.',
  },
  interestCoverage: {
    what: '번 돈(영업이익)으로 이자를 몇 번 낼 수 있는지',
    read: (v) => (v === null ? '이자 비용이 없음' : v < 1 ? `영업이익이 이자의 ${v.toFixed(2)}배 — 번 돈으로 이자도 다 못 내는 수준` : `영업이익으로 이자를 ${v.toFixed(2)}번 낼 수 있음`),
    why: '1배 미만이 3년 이어지면 한계기업으로 분류됩니다. 은행은 보통 3배 이상을 편안한 수준으로 봅니다.',
  },
  revenueGrowth: {
    what: '작년보다 매출이 얼마나 늘었는지',
    read: (v) => (v === null ? '비교할 전년 매출 없음' : v >= 0 ? `작년보다 매출 ${pct(v)} 증가` : `작년보다 매출 ${pct(-v)} 감소`),
    why: '정책자금은 성장 가능성을 보기 때문에 매출 감소는 사업계획서로 설명이 필요합니다.',
  },
  officerLoanShare: {
    what: '회사 돈 중 대표·임직원에게 빌려준 돈(가지급금)의 비중',
    read: (v) => (v === null ? '—' : v === 0 ? '가지급금 없음' : `회사 재산의 ${pct(v)}가 가지급금`),
    why: '금융기관은 가지급금을 회수하기 어려운 자산으로 보고 평가에서 뺍니다. 인정이자로 법인세와 대표 소득세 부담도 생깁니다.',
  },
};

/** 종합 판정 한 줄에 들어갈 짧은 문제 표현 */
const ISSUE: Record<RatioKey, (v: number | null) => string> = {
  debtRatio: (v) => (v === null ? '자본이 잠식됐고' : `부채비율이 ${pct(v)}로 높고`),
  currentRatio: (v) => `단기 지급 여력이 부족하고${v === null ? '' : `(유동비율 ${pct(v)})`}`,
  equityRatio: (v) => `자기자본 비중이 낮고${v === null ? '' : `(${pct(v)})`}`,
  borrowingDependence: (v) => `빌린 돈 의존이 크고${v === null ? '' : `(${pct(v)})`}`,
  capitalImpairment: (v) => `자본잠식이 있고${v === null ? '' : `(${pct(v)})`}`,
  operatingMargin: (v) => `본업 이익률이 낮고${v === null ? '' : `(${pct(v)})`}`,
  netMargin: (v) => `최종 이익률이 낮고${v === null ? '' : `(${pct(v)})`}`,
  interestCoverage: (v) => `이자 부담이 크고${v === null ? '' : `(이자보상 ${v.toFixed(2)}배)`}`,
  revenueGrowth: (v) => (v !== null && v < 0 ? `매출이 ${pct(-v)} 줄었고` : `매출 성장이 더디고`),
  officerLoanShare: (v) => `가지급금이 많고${v === null ? '' : `(자산의 ${pct(v)})`}`,
};

export type Grade = '양호' | '보통' | '주의' | '위험';

const rank: Record<Signal, number> = { bad: 0, caution: 1, good: 2, na: 3 };

/** 지표 여러 개를 대표님이 한 번에 이해할 한 줄로 */
export function verdict(rows: RatioRow[], col: 'projected' | 'scenario' | 'prior'): { grade: Grade; line: string } {
  const sig = (r: RatioRow) => r[`${col}Signal`];
  const bad = rows.filter((r) => sig(r) === 'bad');
  const caution = rows.filter((r) => sig(r) === 'caution');
  const grade: Grade = bad.length === 0 ? (caution.length === 0 ? '양호' : '보통') : bad.length <= 2 && caution.length <= 4 ? '주의' : '위험';
  if (grade === '양호') return { grade, line: `핵심 지표 ${rows.length}개가 모두 목표를 충족합니다. 지금 재무구조를 유지하면 됩니다.` };
  const top = [...bad, ...caution]
    .sort((a, b) => rank[sig(a)] - rank[sig(b)])
    .slice(0, 2)
    .map((r) => ISSUE[r.key](r[col]));
  const issues = top.join(' ').replace(/고$/, '습니다').replace(/고(\([^)]*\))$/, '습니다$1');
  const tail =
    grade === '보통'
      ? '큰 문제는 없지만 결산 전에 관리하면 심사에 더 유리합니다.'
      : grade === '주의'
        ? '정책자금·대출 심사에서 먼저 지적될 수 있어 결산 전 조치가 필요합니다.'
        : `미달 ${bad.length}개·주의 ${caution.length}개로, 결산 전 개선 계획이 꼭 필요합니다.`;
  return { grade, line: `${issues}. ${tail}` };
}
