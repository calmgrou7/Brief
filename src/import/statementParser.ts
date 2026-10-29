import type { BalanceSheet, IncomeStatement } from '../engine/types';

// 회계사무실 비교식 재무제표 PDF(재무상태표·손익계산서·제조원가명세서) 텍스트를 계정별 금액으로 바꾼다.
// PDF 해석(pdf.js)과 분리된 순수 함수라 테스트할 수 있다.

export interface TextItem {
  str: string;
  x: number; // 왼쪽 끝
  y: number; // 기준선(위로 갈수록 큼)
  w: number;
}

export type BsKey = keyof BalanceSheet;
export type IsKey = keyof IncomeStatement;

export interface ParsedLine {
  label: string; // 공백을 없앤 계정명(번호 포함)
  name: string; // 번호를 뗀 계정명
  amounts: number[]; // 왼쪽부터
  current: number | null;
  prior: number | null;
}

export interface ImportedAccount {
  name: string;
  path: string; // 예: '비유동자산 › 투자자산'
  current: number;
  prior: number;
  key: BsKey;
  /** 사람이 확인해야 할 이유(예: 대여금이 가지급금인지) */
  review?: string;
}

export interface ImportResult {
  companyName?: string;
  interimDate?: string; // YYYY-MM-DD
  accounts: ImportedAccount[];
  income: { current: IncomeStatement; prior: IncomeStatement };
  /** 원본 PDF의 합계 — 매핑 결과 검증용 */
  reported: {
    current: { assets?: number; liabilities?: number; equity?: number; netIncome?: number };
    prior: { assets?: number; liabilities?: number; equity?: number; netIncome?: number };
  };
  pagesFound: string[];
  warnings: string[];
}

const NUM = /^\(?[-△▲]?[\d,]+\)?$/;
const parseAmount = (s: string) => {
  const neg = /^\(|^[-△▲]/.test(s);
  const n = Number(s.replace(/[^\d]/g, ''));
  return neg ? -n : n;
};

/** 같은 줄의 글자 조각을 이어 붙여 토큰으로 만든다 */
function groupLines(items: TextItem[]): { y: number; tokens: { text: string; x: number; right: number }[] }[] {
  const rows: { y: number; items: TextItem[] }[] = [];
  for (const it of items) {
    if (!it.str.trim()) continue;
    const row = rows.find((r) => Math.abs(r.y - it.y) < 2.5);
    if (row) row.items.push(it);
    else rows.push({ y: it.y, items: [it] });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) => {
    const sorted = r.items.sort((a, b) => a.x - b.x);
    const tokens: { text: string; x: number; right: number }[] = [];
    for (const it of sorted) {
      const last = tokens[tokens.length - 1];
      const isNumChar = /^[\d,()\-△▲.]+$/.test(it.str.trim());
      const lastIsNum = last && /^[\d,()\-△▲.]+$/.test(last.text);
      // 숫자는 붙어 있는 조각끼리만 합치고, 글자는 띄어 쓴 계정명도 하나로 합친다
      if (last && ((isNumChar && lastIsNum && it.x - last.right < 3) || (!isNumChar && !lastIsNum))) {
        last.text += it.str.trim();
        last.right = it.x + it.w;
      } else {
        tokens.push({ text: it.str.trim(), x: it.x, right: it.x + it.w });
      }
    }
    return { y: r.y, tokens };
  });
}

/** 금액 열 위치(오른쪽 끝)를 모아 당기·전기 경계를 찾는다 */
function splitColumns(rights: number[]): number {
  const xs = [...new Set(rights.map((r) => Math.round(r)))].sort((a, b) => a - b);
  if (xs.length < 2) return Infinity;
  // 가장 큰 간격 두 곳 중 페이지 가운데에 가까운 쪽이 당기/전기 경계
  const clusters: number[][] = [[xs[0]]];
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] - xs[i - 1] > 15) clusters.push([xs[i]]);
    else clusters[clusters.length - 1].push(xs[i]);
  }
  const centers = clusters.map((c) => c.reduce((s, v) => s + v, 0) / c.length);
  const half = Math.ceil(centers.length / 2);
  return (centers[half - 1] + centers[half]) / 2;
}

export function parsePage(items: TextItem[]): { title: string; header: string[]; lines: ParsedLine[] } {
  const rows = groupLines(items);
  const labelOf = (r: (typeof rows)[number]) => r.tokens.map((t) => t.text).join('').replace(/\s/g, '');
  const titleRe = /재무상태표|대차대조표|손익계산서|제조원가명세서|이익잉여금처분계산서|결손금처리계산서/;
  const title = rows.map(labelOf).find((l) => titleRe.test(l))?.match(titleRe)?.[0] ?? '';

  // '과목' 머리행 위는 제목·기간·회사명, 아래가 계정 본문
  const bodyStart = rows.findIndex((r) => labelOf(r).startsWith('과목'));
  const header = rows.slice(0, Math.max(0, bodyStart)).map((r) => r.tokens.map((t) => t.text).join(' '));
  const body = rows.slice(bodyStart + 1).filter((r) => !/^금액/.test(labelOf(r)));

  // 금액 열 영역: 콤마가 있는 숫자들의 가장 왼쪽 열보다 오른쪽. (1)·Ⅰ 같은 번호는 계정명으로 남는다
  const commaRights = body.flatMap((r) => r.tokens.filter((t) => NUM.test(t.text) && t.text.includes(',')).map((t) => t.right));
  const allRights = body.flatMap((r) => r.tokens.map((t) => t.right));
  const zoneLeft = commaRights.length ? Math.min(...commaRights) - 90 : Math.max(0, ...allRights) * 0.4;
  const isAmount = (t: { text: string; right: number }) => NUM.test(t.text) && /\d/.test(t.text) && t.right >= zoneLeft;
  const boundary = splitColumns(body.flatMap((r) => r.tokens.filter(isAmount).map((t) => t.right)));

  const lines: ParsedLine[] = [];
  for (const r of body) {
    const nums = r.tokens.filter(isAmount);
    const label = r.tokens
      .filter((t) => !isAmount(t))
      .map((t) => t.text)
      .join('')
      .replace(/\s/g, '');
    if (!label) continue;
    const cur = nums.filter((t) => t.right < boundary).map((t) => parseAmount(t.text));
    const pri = nums.filter((t) => t.right >= boundary).map((t) => parseAmount(t.text));
    lines.push({
      label,
      name: label.replace(/^([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+|[IVX]+|\d+)\./, '').replace(/^\(\d+\)/, '').replace(/^[가-하]\./, ''),
      amounts: nums.map((t) => parseAmount(t.text)),
      current: cur.length ? cur[cur.length - 1] : null,
      prior: pri.length ? pri[pri.length - 1] : null,
    });
  }
  return { title, header, lines };
}

const level = (label: string): 0 | 1 | 2 | 3 => {
  if (/총계$/.test(label)) return 0;
  if (/^([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+|[IVX]+)\./.test(label)) return 1;
  if (/^\(\d+\)/.test(label)) return 2;
  return 3;
};

const has = (name: string, ...words: string[]) => words.some((w) => name.includes(w));

/** 재무상태표 상세 계정 → 모델 계정 */
function mapBsAccount(big: string, l1: string, l2: string, name: string): { key: BsKey; review?: string } {
  if (big === '자산') {
    if (has(l1, '비유동')) {
      if (has(l2, '유형')) return { key: 'tangibleAssets' };
      if (has(l2, '무형')) return { key: 'intangibleAssets' };
      if (has(name, '대여금', '주임종'))
        return { key: 'otherNoncurrentAssets', review: '대표·임직원 대여금이면 가지급금으로 바꿔 주세요' };
      return { key: 'otherNoncurrentAssets' };
    }
    if (has(name, '현금', '예금', '단기금융상품', '단기매매증권', '단기투자자산')) return { key: 'cash' };
    if (has(name, '매출채권', '외상매출금', '받을어음')) return { key: 'receivables' };
    if (has(name, '대손충당금')) return { key: 'receivables' };
    if (has(name, '가지급금', '주임종단기채권', '주주임원종업원단기채권')) return { key: 'officerLoans' };
    if (has(name, '단기대여금')) return { key: 'otherCurrentAssets', review: '대표·임직원 대여금이면 가지급금으로 바꿔 주세요' };
    if (has(l2, '재고') || has(name, '상품', '제품', '원재료', '재공품', '저장품', '미착품', '반제품')) return { key: 'inventory' };
    return { key: 'otherCurrentAssets' };
  }
  if (big === '부채') {
    if (has(l1, '비유동')) {
      if (has(name, '장기차입금', '사채')) return { key: 'longTermBorrowings' };
      if (has(name, '퇴직급여충당', '퇴직연금')) return { key: 'retirementProvision' };
      if (has(name, '가수금', '주임종')) return { key: 'officerAdvances' };
      return { key: 'otherNoncurrentLiabilities' };
    }
    if (has(name, '매입채무', '외상매입금', '지급어음')) return { key: 'payables' };
    if (has(name, '유동성장기')) return { key: 'currentLongTermDebt' };
    if (has(name, '가수금', '주임종단기차입금', '주주임원종업원단기차입금')) return { key: 'officerAdvances' };
    if (has(name, '단기차입금')) return { key: 'shortTermBorrowings' };
    return { key: 'otherCurrentLiabilities' };
  }
  if (has(l1, '자본금') || (name === '자본금' && !l1)) return { key: 'capitalStock' };
  if (has(l1, '이익잉여금', '결손금')) return { key: 'retainedEarnings' };
  return { key: 'otherEquity' };
}

const emptyIs = (): IncomeStatement => ({
  revenue: 0,
  costOfSales: 0,
  sga: 0,
  depreciation: 0,
  nonOperatingIncome: 0,
  interestExpense: 0,
  otherNonOperatingExpense: 0,
  incomeTax: 0,
});

function dateFrom(text: string): string | undefined {
  const m = text.replace(/\s/g, '').match(/(\d{4})년(\d{1,2})월(\d{1,2})일/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : undefined;
}

export function parseStatements(pages: TextItem[][]): ImportResult {
  const res: ImportResult = {
    accounts: [],
    income: { current: emptyIs(), prior: emptyIs() },
    reported: { current: {}, prior: {} },
    pagesFound: [],
    warnings: [],
  };
  const parsed = pages.map(parsePage);

  // 재무상태표: 페이지가 이어져도 구역 상태를 유지
  let big = '';
  let l1 = '';
  let l2 = '';
  const bsLines = parsed.filter((p) => /재무상태표|대차대조표/.test(p.title)).flatMap((p) => p.lines);
  const isLines = parsed.filter((p) => p.title === '손익계산서').flatMap((p) => p.lines);
  const mfgLines = parsed.filter((p) => p.title === '제조원가명세서').flatMap((p) => p.lines);
  res.pagesFound = [...new Set(parsed.map((p) => p.title).filter(Boolean))];

  for (const p of parsed) {
    for (const h of p.header) {
      if (!res.companyName) {
        const m = h.replace(/\s/g, '').match(/회사명:?(.+?)(\(단위|$)/);
        if (m) res.companyName = m[1].replace(/^주식회사/, '(주)').replace(/주식회사$/, '(주)');
      }
      if (!res.interimDate && /재무상태표|대차대조표/.test(p.title)) res.interimDate = dateFrom(h);
    }
  }

  let open: { line: ParsedLine; lvl: number; detail: boolean } | null = null;
  const pushAccount = (line: ParsedLine, nameOverride?: string) => {
    const { key, review } = mapBsAccount(big, l1, l2, nameOverride ?? line.name);
    res.accounts.push({
      name: nameOverride ?? line.name,
      path: [l1, l2].filter(Boolean).join(' › ') || big,
      current: line.current ?? 0,
      prior: line.prior ?? 0,
      key,
      review,
    });
  };
  const closeHeader = (nextLvl: number) => {
    // 하위 계정 없이 금액만 있는 구역(예: 자본잉여금)은 구역 금액을 그대로 쓴다
    if (open && !open.detail && nextLvl <= open.lvl && ((open.line.current ?? 0) !== 0 || (open.line.prior ?? 0) !== 0)) {
      pushAccount(open.line);
    }
  };

  for (const line of bsLines) {
    const lvl = level(line.label);
    if (line.amounts.length === 0) {
      if (/^(자산|부채|자본)$/.test(line.label)) {
        closeHeader(0);
        open = null;
        big = line.label;
        l1 = l2 = '';
      }
      continue;
    }
    if (/^(당기|전기):/.test(line.label)) continue;
    if (lvl === 0) {
      closeHeader(0);
      open = null;
      const t = line.label;
      const target = /부채및자본|부채와자본/.test(t) ? null : /자산총계/.test(t) ? 'assets' : /부채총계/.test(t) ? 'liabilities' : /자본총계/.test(t) ? 'equity' : null;
      if (target) {
        res.reported.current[target] = line.current ?? undefined;
        res.reported.prior[target] = line.prior ?? undefined;
      }
      continue;
    }
    if (lvl === 1 || lvl === 2) {
      closeHeader(lvl);
      if (lvl === 1) {
        l1 = line.name;
        l2 = '';
      } else l2 = line.name;
      open = { line, lvl, detail: false };
      continue;
    }
    if (open) open.detail = true;
    pushAccount(line);
  }
  closeHeader(0);

  // 손익계산서: 구역 합계 사용, 이자비용·감가상각비만 상세에서 찾는다
  let section = '';
  for (const line of isLines) {
    if (line.amounts.length === 0) continue;
    const lvl = level(line.label);
    const n = line.name;
    const set = (k: IsKey, sign = 1) => {
      res.income.current[k] += sign * (line.current ?? 0);
      res.income.prior[k] += sign * (line.prior ?? 0);
    };
    if (lvl === 1) {
      section = n;
      if (has(n, '매출원가')) set('costOfSales');
      else if (has(n, '매출총')) continue;
      else if (has(n, '매출액', '수익(매출액)', '영업수익')) set('revenue');
      else if (has(n, '판매비', '관리비')) set('sga');
      else if (has(n, '영업외수익')) set('nonOperatingIncome');
      else if (has(n, '영업외비용')) set('otherNonOperatingExpense');
      else if (has(n, '법인세등', '법인세비용') && !has(n, '차감전')) set('incomeTax');
      else if (has(n, '당기순이익', '당기순손익', '당기순손실')) {
        res.reported.current.netIncome = (line.current ?? 0) * (has(n, '손실') && (line.current ?? 0) > 0 ? -1 : 1);
        res.reported.prior.netIncome = (line.prior ?? 0) * (has(n, '손실') && (line.prior ?? 0) > 0 ? -1 : 1);
      }
      continue;
    }
    if (has(section, '영업외비용') && has(n, '이자비용')) {
      set('interestExpense');
      set('otherNonOperatingExpense', -1);
    }
    if (has(section, '판매비', '관리비') && has(n, '감가상각비', '무형자산상각비')) set('depreciation');
  }
  for (const line of mfgLines) {
    if (level(line.label) === 3 && has(line.name, '감가상각비', '무형자산상각비')) {
      res.income.current.depreciation += line.current ?? 0;
      res.income.prior.depreciation += line.prior ?? 0;
    }
  }

  if (!bsLines.length) res.warnings.push('재무상태표 페이지를 찾지 못했습니다.');
  if (!isLines.length) res.warnings.push('손익계산서 페이지를 찾지 못했습니다.');
  return res;
}

/** 확인을 마친 계정 목록을 재무상태표 두 기로 합친다 */
export function toBalanceSheets(accounts: ImportedAccount[], empty: () => BalanceSheet) {
  const current = empty();
  const prior = empty();
  for (const a of accounts) {
    current[a.key] += a.current;
    prior[a.key] += a.prior;
  }
  return { current, prior };
}
