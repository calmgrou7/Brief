import { addDays, toDate } from "./dates";
import type { Ad, Client, InsightRow } from "./types";

// 메타 연결 전 화면을 확인하기 위한 가상 고객 3곳의 샘플 데이터.
// 시드 고정 난수라 같은 기준일이면 항상 같은 숫자가 나온다.

export const SAMPLE_CLIENTS: Client[] = [
  {
    id: "haru",
    name: "하루공방",
    industry: "핸드메이드 주얼리 쇼핑몰",
    objective: "purchase",
    targetCpa: 25_000,
    targetRoas: 3,
    monthlyBudget: 3_000_000,
    contract: { feeModel: "hybrid", feePercent: 15, minFee: 300_000 },
  },
  {
    id: "soom",
    name: "숨 필라테스",
    industry: "필라테스 스튜디오 (체험 수업 신청)",
    objective: "lead",
    targetCpa: 12_000,
    monthlyBudget: 1_500_000,
    contract: { feeModel: "fixed", feeFixed: 500_000 },
  },
  {
    id: "ongyeol",
    name: "온결 스킨케어",
    industry: "D2C 화장품 브랜드",
    objective: "purchase",
    targetCpa: 30_000,
    targetRoas: 2.5,
    monthlyBudget: 6_000_000,
    contract: { feeModel: "percent", feePercent: 12 },
  },
];

interface AdProfile {
  campaign: string;
  name: string;
  /** 일 평균 소진액 */
  spend: number;
  cpm: number;
  ctr: number;
  /** 클릭 → 랜딩 도달률 */
  lp: number;
  /** 랜딩 → 전환율 */
  cvr: number;
  /** 구매 객단가 (리드형은 0) */
  aov: number;
  /** 하루당 CTR 감소율 (소재 피로도) */
  fatigue?: number;
  /** 며칠 전부터 집행했는지 (기본: 전체 기간) */
  startedDaysAgo?: number;
}

const PROFILES: Record<string, AdProfile[]> = {
  haru: [
    { campaign: "전환_신상품", name: "후기형 카드뉴스", spend: 32_000, cpm: 7_500, ctr: 0.016, lp: 0.82, cvr: 0.034, aov: 68_000 },
    { campaign: "전환_신상품", name: "착용 클로즈업 릴스", spend: 28_000, cpm: 6_800, ctr: 0.021, lp: 0.78, cvr: 0.028, aov: 72_000 },
    { campaign: "전환_신상품", name: "가격 강조 배너", spend: 15_000, cpm: 8_200, ctr: 0.009, lp: 0.7, cvr: 0.012, aov: 55_000 },
    { campaign: "리타겟팅_장바구니", name: "장바구니 할인 쿠폰", spend: 14_000, cpm: 12_000, ctr: 0.024, lp: 0.85, cvr: 0.07, aov: 61_000, fatigue: 0.006 },
    { campaign: "리타겟팅_장바구니", name: "선물 포장 안내", spend: 8_000, cpm: 11_000, ctr: 0.015, lp: 0.83, cvr: 0.045, aov: 84_000, startedDaysAgo: 20 },
  ],
  soom: [
    { campaign: "리드_체험수업", name: "체험 1회 9,900원", spend: 22_000, cpm: 5_200, ctr: 0.019, lp: 0.8, cvr: 0.11, aov: 0 },
    { campaign: "리드_체험수업", name: "강사 소개 영상", spend: 15_000, cpm: 4_800, ctr: 0.013, lp: 0.76, cvr: 0.085, aov: 0, fatigue: 0.008 },
    { campaign: "리드_체험수업", name: "회원 비포애프터", spend: 9_000, cpm: 5_600, ctr: 0.008, lp: 0.7, cvr: 0.05, aov: 0 },
    { campaign: "리드_직장인", name: "퇴근 후 저녁반", spend: 6_000, cpm: 6_100, ctr: 0.014, lp: 0.78, cvr: 0.09, aov: 0, startedDaysAgo: 14 },
  ],
  ongyeol: [
    { campaign: "전환_대표상품", name: "성분 비교표", spend: 70_000, cpm: 9_000, ctr: 0.014, lp: 0.8, cvr: 0.026, aov: 46_000 },
    { campaign: "전환_대표상품", name: "피부과 전문의 언급", spend: 48_000, cpm: 9_800, ctr: 0.011, lp: 0.77, cvr: 0.019, aov: 44_000, fatigue: 0.007 },
    { campaign: "전환_대표상품", name: "사용 루틴 릴스", spend: 42_000, cpm: 7_400, ctr: 0.018, lp: 0.74, cvr: 0.022, aov: 48_000 },
    { campaign: "전환_세트상품", name: "기획 세트 30% 할인", spend: 30_000, cpm: 8_600, ctr: 0.017, lp: 0.81, cvr: 0.031, aov: 79_000 },
    { campaign: "전환_세트상품", name: "UGC 후기 모음", spend: 18_000, cpm: 8_000, ctr: 0.007, lp: 0.7, cvr: 0.009, aov: 52_000 },
    { campaign: "리타겟팅_방문자", name: "재방문 무료배송", spend: 12_000, cpm: 13_500, ctr: 0.022, lp: 0.86, cvr: 0.06, aov: 51_000 },
  ],
};

/** mulberry32 — 작고 빠른 시드 난수 */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** 평균 1 근처의 변동 계수 */
function jitter(r: () => number, spread: number): number {
  return 1 + (r() + r() - 1) * spread;
}

/** 이항분포 근사: 기대값을 반올림하되 소수점은 확률적으로 처리 (작은 수에서도 0/1이 섞이도록) */
function draw(r: () => number, expected: number): number {
  const base = Math.floor(expected);
  return base + (r() < expected - base ? 1 : 0);
}

// 요일 효과 (일=0). 주말 저녁 소비가 많은 업종을 가정.
const WEEKDAY = [1.12, 0.92, 0.95, 0.97, 1.0, 1.05, 1.15];

export function sampleAds(clientId: string): Ad[] {
  return (PROFILES[clientId] ?? []).map((p, i) => ({
    id: `${clientId}-ad${i + 1}`,
    clientId,
    campaignId: `${clientId}-${p.campaign}`,
    campaignName: p.campaign,
    name: p.name,
  }));
}

/** 기준일(anchor)까지 days일치 광고별 일별 성과. 기준일 당일은 하루 중간까지의 수치. */
export function sampleInsights(clientId: string, anchor: string, days = 120): InsightRow[] {
  const profiles = PROFILES[clientId] ?? [];
  const ads = sampleAds(clientId);
  const rows: InsightRow[] = [];

  profiles.forEach((p, i) => {
    const start = Math.min(days, p.startedDaysAgo ?? days);
    for (let ago = start - 1; ago >= 0; ago--) {
      const date = addDays(anchor, -ago);
      const r = rng(hash(`${ads[i].id}:${date}`));
      const age = start - 1 - ago; // 집행 경과일
      const dayShare = ago === 0 ? 0.55 : 1;

      const spend = Math.round(p.spend * WEEKDAY[toDate(date).getUTCDay()] * jitter(r, 0.25) * dayShare);
      const impressions = Math.round((spend / (p.cpm * jitter(r, 0.12))) * 1000);
      const ctr = p.ctr * Math.max(0.35, 1 - (p.fatigue ?? 0) * age) * jitter(r, 0.2);
      const linkClicks = draw(r, impressions * ctr);
      const landingViews = draw(r, linkClicks * p.lp * jitter(r, 0.08));
      const conversions = draw(r, landingViews * p.cvr * jitter(r, 0.35));
      const isPurchase = p.aov > 0;

      rows.push({
        adId: ads[i].id,
        date,
        spend,
        impressions,
        reach: Math.round(impressions / (1.15 + r() * 0.25)),
        linkClicks,
        landingViews,
        leads: isPurchase ? 0 : conversions,
        purchases: isPurchase ? conversions : 0,
        purchaseValue: isPurchase ? Math.round(conversions * p.aov * jitter(r, 0.2)) : 0,
      });
    }
  });

  return rows;
}
