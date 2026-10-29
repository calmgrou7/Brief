import type { BalanceSheet, IncomeStatement } from '../engine';

// 비교식 재무제표 입력 행. 순서는 회계사무실 재무제표 배열과 같게 두어 엑셀 열 붙여넣기가 맞도록 한다.
export type Row<K> = { key: K; label: string; group?: string };

export const BS_ROWS: Row<keyof BalanceSheet>[] = [
  { key: 'cash', label: '현금및현금성자산', group: '유동자산' },
  { key: 'receivables', label: '매출채권' },
  { key: 'inventory', label: '재고자산' },
  { key: 'officerLoans', label: '가지급금(주임종 단기대여금)' },
  { key: 'otherCurrentAssets', label: '기타 유동자산' },
  { key: 'tangibleAssets', label: '유형자산', group: '비유동자산' },
  { key: 'intangibleAssets', label: '무형자산' },
  { key: 'otherNoncurrentAssets', label: '기타 비유동자산' },
  { key: 'payables', label: '매입채무', group: '유동부채' },
  { key: 'shortTermBorrowings', label: '단기차입금' },
  { key: 'currentLongTermDebt', label: '유동성장기부채' },
  { key: 'officerAdvances', label: '가수금(주임종 단기차입금)' },
  { key: 'otherCurrentLiabilities', label: '기타 유동부채(미지급금·미지급법인세 등)' },
  { key: 'longTermBorrowings', label: '장기차입금', group: '비유동부채' },
  { key: 'retirementProvision', label: '퇴직급여충당부채' },
  { key: 'otherNoncurrentLiabilities', label: '기타 비유동부채' },
  { key: 'capitalStock', label: '자본금', group: '자본' },
  { key: 'otherEquity', label: '자본잉여금·자본조정 등' },
  { key: 'retainedEarnings', label: '이익잉여금(결손금은 −)' },
];

export const IS_ROWS: Row<keyof IncomeStatement>[] = [
  { key: 'revenue', label: '매출액' },
  { key: 'costOfSales', label: '매출원가' },
  { key: 'sga', label: '판매비와관리비' },
  { key: 'depreciation', label: '└ 감가상각비(원가·판관비 중 포함액)' },
  { key: 'nonOperatingIncome', label: '영업외수익' },
  { key: 'interestExpense', label: '이자비용' },
  { key: 'otherNonOperatingExpense', label: '기타 영업외비용' },
  { key: 'incomeTax', label: '법인세비용' },
];
