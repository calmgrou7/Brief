// 기업상태 진단 → 정책자금 추천 (규칙 기반 점수화)
import { FUND_CATALOG, INDUSTRIES, REGIONS } from './catalog.js';

// 소상공인 기준: 상시근로자 5인 미만 (제조·건설·운수 10인 미만)
export function isSmallBiz(a) {
  const limit = ['manufacturing', 'construction', 'transport'].includes(a.industry) ? 10 : 5;
  return Number(a.employees) < limit;
}

export function validateAnswers(a) {
  const errors = [];
  if (!a || typeof a !== 'object') return ['진단 응답이 없습니다.'];
  if (!['individual', 'corporation', 'preparing'].includes(a.bizType)) errors.push('사업자 유형을 선택해 주세요.');
  if (!(a.industry in INDUSTRIES)) errors.push('업종을 선택해 주세요.');
  if (!REGIONS.includes(a.region)) errors.push('지역을 선택해 주세요.');
  const years = Number(a.years);
  if (!Number.isFinite(years) || years < 0 || years > 100) errors.push('업력을 확인해 주세요.');
  const emp = Number(a.employees);
  if (!Number.isFinite(emp) || emp < 0 || emp > 100000) errors.push('상시근로자 수를 확인해 주세요.');
  if (!['operating', 'facility', 'both'].includes(a.fundUse)) errors.push('자금 용도를 선택해 주세요.');
  return errors;
}

export function riskFlags(a) {
  const flags = [];
  if (a.taxArrears) flags.push({ code: 'TAX_ARREARS', msg: '국세·지방세 체납이 있으면 대부분의 정책자금 신청이 제한됩니다. 체납 해소 후 신청을 권장합니다.' });
  if (a.loanOverdue) flags.push({ code: 'LOAN_OVERDUE', msg: '금융기관 연체 중이면 신청이 제한됩니다. 연체 해소가 우선입니다.' });
  if (a.credit === 'caution') flags.push({ code: 'LOW_CREDIT', msg: '대표자 신용이 낮으면 보증·융자 심사가 어려울 수 있습니다. 재기·재도약 자금 등 대안을 상담받아 보세요.' });
  if (a.closedBefore) flags.push({ code: 'RESTART', msg: '폐업 이력이 있다면 재창업(재도전) 전용 자금 대상일 수 있습니다.' });
  return flags;
}

export function matchFunds(a) {
  const years = Number(a.years) || 0;
  const small = isSmallBiz(a);
  const youth = a.ceoAge === 'u39';
  const tech = Array.isArray(a.certs) && a.certs.some((c) => ['patent', 'venture', 'innobiz', 'lab', 'mainbiz'].includes(c));
  const women = !!a.womenCeo;
  const uses = a.fundUse === 'both' ? ['operating', 'facility'] : [a.fundUse];

  const results = [];
  for (const f of FUND_CATALOG) {
    const r = f.rules;
    const reasons = [];
    let score = 50;
    let eligible = true;

    if (a.bizType === 'preparing') {
      // 예비창업자는 창업 계열만
      if (!['KOSME_STARTUP', 'KOSME_YOUTH', 'KIBO', 'LOCAL_INTEREST'].includes(f.code)) eligible = false;
      else reasons.push('예비창업자 대상 가능 (사업자 등록 후 신청)');
    }
    if (r.smallBiz) {
      if (small) { score += 15; reasons.push('소상공인 요건 충족'); } else eligible = false;
    }
    if (r.notSmallBizOnly && small) score -= 10;
    if (r.minYears != null) {
      if (years >= r.minYears) { score += 10; reasons.push(`업력 ${r.minYears}년 이상`); } else eligible = false;
    }
    if (r.maxYears != null) {
      if (years < r.maxYears) { score += 15; reasons.push(`업력 ${r.maxYears}년 미만 창업기업`); } else eligible = false;
    }
    if (r.youth) {
      if (youth) { score += 20; reasons.push('대표자 만 39세 이하'); } else eligible = false;
    }
    if (r.excludeIndustries?.includes(a.industry)) eligible = false;
    if (r.use) {
      if (uses.some((u) => r.use.includes(u))) { score += 5; } else score -= 15;
    }
    if (r.export) {
      if (a.exporting) { score += 20; reasons.push('수출(예정) 기업'); } else eligible = false;
    }
    if (r.salesDrop) {
      if (a.salesDrop) { score += 25; reasons.push('매출 감소 등 경영애로'); } else eligible = false;
    }
    if (r.tech) {
      if (tech) { score += 25; reasons.push('기술 인증·특허 보유'); } else eligible = false;
    }
    if (r.bonusTech && tech) { score += 10; reasons.push('기술·혁신 인증 우대'); }
    if (r.women) {
      if (women) { score += 15; reasons.push('여성대표 우대'); } else eligible = false;
    }
    if (r.credit && a.credit && !r.credit.includes(a.credit)) score -= 20;
    if (f.code === 'LOCAL_INTEREST') reasons.push(`${a.region} 지역 육성자금 확인 필요`);
    if (['manufacturing', 'it'].includes(a.industry) && f.agency.includes('중소벤처')) {
      score += 5; reasons.push(`${INDUSTRIES[a.industry]} 우대 업종`);
    }
    if (a.taxArrears || a.loanOverdue) score -= 40;

    if (!eligible) continue;
    results.push({
      code: f.code, name: f.name, agency: f.agency, type: f.type, limit: f.limit,
      url: f.url, desc: f.desc, score: Math.max(0, Math.min(100, score)), reasons,
    });
  }
  results.sort((x, y) => y.score - x.score);
  return results;
}

// 공고(programs) ↔ 진단/관심사 매칭: 지역 + 분야
export function programMatches(program, { regions = [], categories = [] } = {}) {
  const pRegions = program.regions || [];
  const regionOk = !regions.length || pRegions.includes('전국') || pRegions.some((r) => regions.includes(r));
  const catOk = !categories.length || categories.includes(program.category);
  return regionOk && catOk;
}

export function diagnose(a) {
  return {
    smallBiz: isSmallBiz(a),
    flags: riskFlags(a),
    funds: matchFunds(a),
  };
}
