// 노션 데이터베이스 구조. 노션에서 속성 이름이나 선택지를 바꾸면 이 파일만 고친다.

export type Kind =
  | 'title'
  | 'text'
  | 'select'
  | 'multi'
  | 'status'
  | 'date'
  | 'range' // 시작~종료 날짜
  | 'number'
  | 'checkbox'
  | 'phone'
  | 'email'
  | 'url'
  | 'relation'
  | 'files'
  | 'uid'
  | 'edited';

/** 필드 키 → [노션 속성명, 종류] */
export type FieldMap = Record<string, readonly [string, Kind]>;

export const DATA_SOURCES = {
  companies: '5114ba2d-9f79-4bee-9d6f-40f809aea52d',
  contacts: '48a833b1-1c91-4f40-a359-fbc7c17a89cd',
  certs: 'e7b5c9bc-594a-4437-9ecf-fd5c2b947396',
  insurances: '846c6d05-afd7-4f07-b426-57ef979a104a',
  finances: 'e6fb576f-9db5-41fe-8009-0d5c2fce03f4',
  goals: '6ebbe9ba-34d9-4379-8bd2-99b234a162f9',
  matches: '9de8f780-e820-4ce4-90e5-934630c1b707',
  links: 'c9f6d52c-e961-4c17-8f67-19201f64cec1',
} as const;

/** 노션에서 직접 열어볼 때 쓰는 데이터베이스 주소 */
export const NOTION_URLS = {
  home: 'https://app.notion.com/p/40979506f3a38177b4d1f7f44081f09b',
  companies: 'https://app.notion.com/p/5f0cff5b2e0b4e2d864784eeb4b3d867',
  contacts: 'https://app.notion.com/p/2c9d0b9863884e869e34896d6c48560d',
  certs: 'https://app.notion.com/p/8ea8d008d66a4039b2ff99a78218dd7a',
  insurances: 'https://app.notion.com/p/983309abd9c7460996cb935b9891ce3b',
  finances: 'https://app.notion.com/p/d81853b93d8b4bd2a7bf2e58e7f4d96e',
  goals: 'https://app.notion.com/p/ffb4df8b007f4b5abea9ceac91381eea',
  matches: 'https://app.notion.com/p/17f5f642266142ae96e37e17a0921f62',
  links: 'https://app.notion.com/p/355cc4a16b58494bbe863b3555dc185d',
} as const;

export const STATUS = ['잠재', '상담중', '계약·진행', '사후관리', '종료'] as const;
export const ACTIVE_STATUS: readonly string[] = ['상담중', '계약·진행', '사후관리'];
export const PRIORITY = ['A', 'B', 'C'] as const;
export const ENTITY = ['법인', '개인'] as const;
export const REGION = ['부산', '울산', '경남', '대구·경북', '수도권', '기타'] as const;
export const TASKS = [
  '정책자금', '정부지원사업', '기업인증', 'R&D·연구소', '특허·IP',
  '재무진단·외부CFO', '기업보험', '가업승계·M&A', '스마트팩토리', '노무·인사',
] as const;
export const INTERESTS = ['자금조달', '절세', '인증취득', '인력채용', '설비투자', '판로·수출', '가업승계', '리스크·보험'] as const;
export const SOURCE = ['직접입력', '컨설팅웹앱', '기업마스터 이관', '위들리 이관'] as const;
export const METHODS = ['방문', '전화', '문자', '이메일', '화상'] as const;
export const DIRECTION = ['발신', '수신'] as const;

export const COMPANY: FieldMap = {
  name: ['기업명', 'title'],
  no: ['고객번호', 'uid'],
  status: ['관리상태', 'status'],
  priority: ['우선순위', 'select'],
  bizNo: ['사업자등록번호', 'text'],
  corpNo: ['법인등록번호', 'text'],
  bizCert: ['사업자등록증', 'files'],
  ceo: ['대표자', 'text'],
  mobile: ['대표 휴대폰', 'phone'],
  phone: ['회사 전화', 'phone'],
  email: ['이메일', 'email'],
  address: ['주소', 'text'],
  region: ['지역', 'select'],
  entity: ['기업형태', 'select'],
  industry: ['업종', 'text'],
  founded: ['설립일', 'date'],
  employees: ['상시근로자수', 'number'],
  revenue: ['최근매출(원)', 'number'],
  tasks: ['진행업무', 'multi'],
  interests: ['대표 관심사', 'multi'],
  interestMemo: ['대표 관심사 메모', 'text'],
  plannedSolution: ['제공 예정 솔루션', 'text'],
  nextGoal: ['내년 목표', 'text'],
  nextAction: ['다음 액션', 'text'],
  nextActionDate: ['다음 액션일', 'date'],
  lastContactDate: ['최근 접촉일', 'date'],
  lastContactMethod: ['최근 접촉방법', 'select'],
  source: ['데이터출처', 'select'],
  finLinked: ['재무데이터 연동', 'checkbox'],
  webappId: ['웹앱 기업ID', 'text'],
  note: ['비고', 'text'],
  updatedAt: ['최종수정', 'edited'],
};

export const CONTACT: FieldMap = {
  summary: ['요약', 'title'],
  companyIds: ['기업', 'relation'],
  date: ['일시', 'date'],
  method: ['방법', 'select'],
  direction: ['방향', 'select'],
  counterpart: ['상대', 'text'],
  content: ['내용', 'text'],
  detectedInterest: ['대표 관심사(감지)', 'text'],
  followUp: ['후속조치', 'text'],
  followUpDue: ['후속기한', 'date'],
  followUpDone: ['후속완료', 'checkbox'],
};

export const CERT: FieldMap = {
  name: ['항목명', 'title'],
  companyIds: ['기업', 'relation'],
  kind: ['구분', 'select'],
  status: ['상태', 'status'],
  by: ['채움 수행여부', 'select'],
  agency: ['기관', 'text'],
  regNo: ['등록번호', 'text'],
  acquired: ['취득일', 'date'],
  expires: ['만료일', 'date'],
  amount: ['금액(원)', 'number'],
  year: ['연도', 'number'],
  memo: ['메모', 'text'],
  proof: ['증빙', 'files'],
};

export const INSURANCE: FieldMap = {
  product: ['상품명', 'title'],
  companyIds: ['기업', 'relation'],
  insurer: ['보험사', 'text'],
  kind: ['종류', 'select'],
  monthly: ['월보험료(원)', 'number'],
  yearly: ['연보험료(원)', 'number'],
  coverage: ['보장금액(원)', 'number'],
  period: ['계약기간', 'range'],
  maturity: ['만기일', 'date'],
  payStatus: ['납입상태', 'select'],
  managed: ['채움 관리계약', 'checkbox'],
  insured: ['피보험자·목적물', 'text'],
  memo: ['메모', 'text'],
  policy: ['증권', 'files'],
};

export const FINANCE: FieldMap = {
  title: ['제목', 'title'],
  companyIds: ['기업', 'relation'],
  year: ['회계연도', 'number'],
  date: ['컨설팅일', 'date'],
  revenue: ['매출액(원)', 'number'],
  opProfit: ['영업이익(원)', 'number'],
  netIncome: ['당기순이익(원)', 'number'],
  assets: ['자산총계(원)', 'number'],
  liabilities: ['부채총계(원)', 'number'],
  equity: ['자본총계(원)', 'number'],
  borrowings: ['차입금(원)', 'number'],
  debtRatio: ['부채비율(%)', 'number'],
  grade: ['신용등급', 'text'],
  issues: ['진단 핵심이슈', 'text'],
  suggestions: ['개선 제안', 'text'],
  source: ['출처', 'select'],
  reportUrl: ['웹앱 리포트', 'url'],
};

export const GOAL: FieldMap = {
  title: ['과업', 'title'],
  companyIds: ['기업', 'relation'],
  type: ['유형', 'select'],
  related: ['연관 목표', 'text'],
  year: ['대상연도', 'number'],
  quarter: ['분기', 'select'],
  area: ['분야', 'select'],
  status: ['상태', 'status'],
  due: ['기한', 'date'],
  effect: ['예상효과', 'text'],
};

export const MATCH: FieldMap = {
  title: ['공고명', 'title'],
  companyIds: ['기업', 'relation'],
  agency: ['주관기관', 'text'],
  area: ['분야', 'select'],
  score: ['적합도', 'number'],
  reason: ['매칭 근거', 'text'],
  deadline: ['접수마감', 'date'],
  status: ['검토상태', 'status'],
  link: ['공고 링크', 'url'],
  size: ['지원규모', 'text'],
  date: ['매칭일', 'date'],
};

export const LINK: FieldMap = {
  name: ['이름', 'title'],
  href: ['주소', 'url'],
  desc: ['설명', 'text'],
  order: ['순서', 'number'],
  newTab: ['새 탭으로 열기', 'checkbox'],
};

export interface FileRef { name: string; url: string }
export interface Range { start: string; end: string }

export interface Row { id: string; url: string }

export interface Company extends Row {
  name: string; no: string; status: string; priority: string;
  bizNo: string; corpNo: string; bizCert: FileRef[];
  ceo: string; mobile: string; phone: string; email: string; address: string;
  region: string; entity: string; industry: string; founded: string;
  employees: number | null; revenue: number | null;
  tasks: string[]; interests: string[]; interestMemo: string;
  plannedSolution: string; nextGoal: string; nextAction: string; nextActionDate: string;
  lastContactDate: string; lastContactMethod: string;
  source: string; finLinked: boolean; webappId: string; note: string; updatedAt: string;
}

export interface Contact extends Row {
  summary: string; companyIds: string[]; date: string; method: string; direction: string;
  counterpart: string; content: string; detectedInterest: string;
  followUp: string; followUpDue: string; followUpDone: boolean;
}

export interface Cert extends Row {
  name: string; companyIds: string[]; kind: string; status: string; by: string;
  agency: string; regNo: string; acquired: string; expires: string;
  amount: number | null; year: number | null; memo: string; proof: FileRef[];
}

export interface Insurance extends Row {
  product: string; companyIds: string[]; insurer: string; kind: string;
  monthly: number | null; yearly: number | null; coverage: number | null;
  period: Range; maturity: string; payStatus: string; managed: boolean; insured: string; memo: string; policy: FileRef[];
}

export interface Finance extends Row {
  title: string; companyIds: string[]; year: number | null; date: string;
  revenue: number | null; opProfit: number | null; netIncome: number | null;
  assets: number | null; liabilities: number | null; equity: number | null;
  borrowings: number | null; debtRatio: number | null;
  grade: string; issues: string; suggestions: string; source: string; reportUrl: string;
}

export interface Goal extends Row {
  title: string; companyIds: string[]; type: string; related: string; year: number | null;
  quarter: string; area: string; status: string; due: string; effect: string;
}

export interface Match extends Row {
  title: string; companyIds: string[]; agency: string; area: string; score: number | null;
  reason: string; deadline: string; status: string; link: string; size: string; date: string;
}

export interface DashLink extends Row {
  name: string; href: string; desc: string; order: number | null; newTab: boolean;
}

export interface Dataset {
  companies: Company[];
  contacts: Contact[];
  certs: Cert[];
  insurances: Insurance[];
  finances: Finance[];
  goals: Goal[];
  matches: Match[];
  links: DashLink[];
  loadedAt: string;
}
