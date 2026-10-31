// 데모 모드 예시 데이터. 날짜는 오늘 기준 상대값이라 언제 열어도 화면이 살아 있다.
// 모든 업체·인물은 가상이다.
import type { Company, Dataset } from './schema';
import { addDays, todayKST } from './derive';

let seq = 0;
const id = (p: string) => `demo-${p}-${++seq}`;

function company(p: Partial<Company>): Company {
  return {
    id: id('c'), url: '', name: '', no: '', status: '잠재', priority: '', bizNo: '', corpNo: '', bizCert: [],
    ceo: '', mobile: '', phone: '', email: '', address: '', region: '', entity: '법인', industry: '',
    founded: '', employees: null, revenue: null, tasks: [], interests: [], interestMemo: '',
    plannedSolution: '', nextGoal: '', nextAction: '', nextActionDate: '',
    lastContactDate: '', lastContactMethod: '', source: '직접입력', finLinked: false,
    webappId: '', note: '', updatedAt: new Date().toISOString(), ...p,
  };
}

export function demoDataset(today = todayKST()): Dataset {
  seq = 0;
  const d = (n: number) => addDays(today, n);
  const y = Number(today.slice(0, 4));

  const a = company({
    name: '[예시] 채움정밀(주)', no: '1', status: '계약·진행', priority: 'A', bizNo: '123-45-67890',
    ceo: '김대표', mobile: '010-1234-5678', phone: '051-123-4567', email: 'ceo@example.com',
    address: '부산광역시 강서구 녹산산단', region: '부산', industry: '금속가공 제조', founded: '2015-03-02',
    employees: 42, revenue: 8_600_000_000, tasks: ['정책자금', '기업인증', 'R&D·연구소', '기업보험'],
    interests: ['자금조달', '인증취득', '설비투자'], interestMemo: '내년 2공장 증설, 설비자금 10억 수준 고민',
    plannedSolution: '중진공 신시장진출자금 + 이노비즈 취득 후 금리우대, 연구소 인건비 세액공제',
    nextGoal: `${y + 1}년 매출 120억, 2공장 착공, 이노비즈 취득`,
    nextAction: '이노비즈 신청서류 체크리스트 전달', nextActionDate: d(2),
    lastContactDate: d(-3), lastContactMethod: '방문', source: '컨설팅웹앱', finLinked: true, webappId: 'case-001',
  });
  const b = company({
    name: '[예시] 해솔푸드', no: '2', status: '사후관리', priority: 'B', bizNo: '234-56-78901', entity: '개인',
    ceo: '이대표', mobile: '010-2345-6789', phone: '055-234-5678', address: '경남 김해시 주촌면', region: '경남',
    industry: '식품 제조(소스류)', founded: '2018-07-16', employees: 15, revenue: 2_300_000_000,
    tasks: ['정부지원사업', '스마트팩토리'], interests: ['판로·수출', '설비투자'],
    interestMemo: '대형마트 PB 납품 제안 받음, HACCP 라인 확장 필요',
    plannedSolution: '스마트공장 기초 보급사업 + 수출바우처', nextGoal: '수출 첫 계약(베트남)',
    nextAction: '스마트공장 공급기업 견적 비교', nextActionDate: d(-1),
    lastContactDate: d(-12), lastContactMethod: '전화',
  });
  const c = company({
    name: '[예시] 그린에너지솔루션(주)', no: '3', status: '상담중', priority: 'A', bizNo: '345-67-89012',
    ceo: '박대표', mobile: '010-3456-7890', phone: '052-345-6789', address: '울산광역시 남구', region: '울산',
    industry: '태양광 설비 시공', founded: '2020-01-10', employees: 9, revenue: 1_100_000_000,
    tasks: ['정책자금', '기업인증'], interests: ['자금조달', '인증취득'],
    interestMemo: '벤처인증 문의, 운전자금 부족', plannedSolution: '벤처인증(기술평가형) → 기보 보증',
    nextAction: '재무제표 3개년 수령', nextActionDate: d(5),
    lastContactDate: d(-41), lastContactMethod: '문자',
  });
  const e = company({
    name: '[예시] 대한물류(주)', no: '4', status: '계약·진행', priority: 'B', bizNo: '456-78-90123',
    ceo: '최대표', mobile: '010-4567-8901', phone: '053-456-7890', address: '대구광역시 달서구', region: '대구·경북',
    industry: '화물운송·창고', founded: '2009-11-20', employees: 63, revenue: 15_400_000_000,
    tasks: ['재무진단·외부CFO', '가업승계·M&A', '기업보험'], interests: ['가업승계', '절세', '리스크·보험'],
    interestMemo: '자녀 승계 3~5년 내, 가지급금 정리 필요', plannedSolution: '가지급금 정리 로드맵 + 주식가치 평가, CEO 정기보험 검토',
    nextGoal: '가지급금 50% 감축, 승계 플랜 확정', lastContactDate: d(-20), lastContactMethod: '방문',
    source: '컨설팅웹앱', finLinked: true, webappId: 'case-004',
  });
  const f = company({
    name: '[예시] 온새미로디자인', no: '5', status: '잠재', priority: 'C', entity: '개인',
    ceo: '정대표', mobile: '010-5678-9012', region: '수도권', industry: '디자인 서비스',
    interests: ['인력채용'], source: '위들리 이관',
  });
  const companies = [a, b, c, e, f];

  const contact = (cid: string, n: number, time: string, method: string, summary: string, extra: Partial<Dataset['contacts'][number]> = {}) => ({
    id: id('k'), url: '', summary, companyIds: [cid], date: `${d(n)}T${time}:00.000+09:00`, method,
    direction: '발신', counterpart: '', content: '', detectedInterest: '', followUp: '', followUpDue: '', followUpDone: false, ...extra,
  });

  return {
    companies,
    contacts: [
      contact(a.id, -3, '14:00', '방문', '이노비즈 요건 설명, 2공장 자금 상담', {
        counterpart: '김대표', content: '공장 방문. 증설 부지 확정, 설비 견적 8억. 이노비즈 기술평가 대비 필요.',
        detectedInterest: '설비투자 자금', followUp: '이노비즈 서류 체크리스트 송부', followUpDue: d(1),
      }),
      contact(a.id, -17, '10:30', '전화', '연구소 설립 서류 진행 확인'),
      contact(a.id, -35, '16:00', '방문', '연간 컨설팅 계약 체결'),
      contact(b.id, -12, '11:00', '전화', '스마트공장 사업 공고 안내', { followUp: '공급기업 2곳 소개', followUpDue: d(-2) }),
      contact(b.id, -40, '15:00', '방문', 'HACCP 라인 현장 확인'),
      contact(c.id, -41, '09:20', '문자', '벤처인증 필요서류 안내 문자'),
      contact(e.id, -20, '13:00', '방문', '가지급금 현황 점검, 승계 일정 협의', { counterpart: '최대표·회계사무실' }),
      contact(e.id, -6, '17:10', '전화', '보험 증권 사본 요청', { direction: '수신' }),
    ],
    certs: [
      { id: id('t'), url: '', name: '기업부설연구소', companyIds: [a.id], kind: '기업부설연구소', status: '취득·선정', by: '채움 수행', agency: '한국산업기술진흥협회', regNo: '', acquired: d(-200), expires: '', amount: null, year: y, memo: '', proof: [] },
      { id: id('t'), url: '', name: '벤처기업 확인', companyIds: [a.id], kind: '벤처인증', status: '취득·선정', by: '기존 보유', agency: '벤처기업협회', regNo: '', acquired: d(-700), expires: d(395), amount: null, year: y - 2, memo: '', proof: [] },
      { id: id('t'), url: '', name: '이노비즈', companyIds: [a.id], kind: '이노비즈', status: '준비중', by: '채움 수행', agency: '중소벤처기업부', regNo: '', acquired: '', expires: '', amount: null, year: y, memo: '', proof: [] },
      { id: id('t'), url: '', name: '신시장진출지원자금', companyIds: [a.id], kind: '정책자금', status: '취득·선정', by: '채움 수행', agency: '중소벤처기업진흥공단', regNo: '', acquired: d(-150), expires: '', amount: 500_000_000, year: y, memo: '', proof: [] },
      { id: id('t'), url: '', name: '스마트공장 기초', companyIds: [b.id], kind: '스마트팩토리', status: '신청완료', by: '채움 수행', agency: '스마트제조혁신추진단', regNo: '', acquired: '', expires: '', amount: 70_000_000, year: y, memo: '', proof: [] },
      { id: id('t'), url: '', name: 'HACCP', companyIds: [b.id], kind: 'ISO 등 품질인증', status: '취득·선정', by: '기존 보유', agency: '식약처', regNo: '', acquired: d(-900), expires: '', amount: null, year: y - 3, memo: '', proof: [] },
    ],
    insurances: [
      { id: id('i'), url: '', product: '공장 화재보험', companyIds: [a.id], insurer: 'OO화재', kind: '화재·재산', monthly: 380_000, yearly: 4_560_000, coverage: 3_000_000_000, period: { start: d(-300), end: d(65) }, maturity: d(65), payStatus: '정상', managed: true, insured: '녹산 1공장', memo: '', policy: [] },
      { id: id('i'), url: '', product: '단체상해보험', companyIds: [a.id], insurer: 'OO생명', kind: '단체상해·근재', monthly: 620_000, yearly: 7_440_000, coverage: 100_000_000, period: { start: d(-100), end: d(265) }, maturity: d(265), payStatus: '정상', managed: true, insured: '임직원 42명', memo: '', policy: [] },
      { id: id('i'), url: '', product: 'CEO 정기보험', companyIds: [e.id], insurer: 'OO생명', kind: 'CEO정기·종신', monthly: 1_200_000, yearly: 14_400_000, coverage: 1_000_000_000, period: { start: d(-1500), end: d(30) }, maturity: d(30), payStatus: '정상', managed: false, insured: '최대표', memo: '타사 계약, 갱신 시 비교 제안', policy: [] },
    ],
    finances: [
      { id: id('f'), url: '', title: `${y - 2} 확정결산`, companyIds: [a.id], year: y - 2, date: `${y - 1}-03-20`, revenue: 6_200_000_000, opProfit: 410_000_000, netIncome: 290_000_000, assets: 5_100_000_000, liabilities: 3_400_000_000, equity: 1_700_000_000, borrowings: 2_100_000_000, debtRatio: 200, grade: 'BB', issues: '차입금 의존도 높음', suggestions: '정책자금 대환', source: '컨설팅웹앱', reportUrl: '' },
      { id: id('f'), url: '', title: `${y - 1} 확정결산`, companyIds: [a.id], year: y - 1, date: `${y}-03-18`, revenue: 7_400_000_000, opProfit: 560_000_000, netIncome: 400_000_000, assets: 5_900_000_000, liabilities: 3_500_000_000, equity: 2_400_000_000, borrowings: 2_000_000_000, debtRatio: 146, grade: 'BB+', issues: '가지급금 1.2억', suggestions: '가지급금 상환 계획', source: '컨설팅웹앱', reportUrl: '' },
      { id: id('f'), url: '', title: `${y} 가결산`, companyIds: [a.id], year: y, date: d(-10), revenue: 8_600_000_000, opProfit: 690_000_000, netIncome: 510_000_000, assets: 6_800_000_000, liabilities: 3_800_000_000, equity: 3_000_000_000, borrowings: 2_200_000_000, debtRatio: 127, grade: 'BBB-', issues: '설비투자 앞둔 유동성', suggestions: '결산 전 가지급금 정리, 연구소 세액공제 반영', source: '컨설팅웹앱', reportUrl: '' },
      { id: id('f'), url: '', title: `${y - 1} 확정결산`, companyIds: [e.id], year: y - 1, date: `${y}-04-02`, revenue: 15_400_000_000, opProfit: 920_000_000, netIncome: 610_000_000, assets: 11_000_000_000, liabilities: 6_300_000_000, equity: 4_700_000_000, borrowings: 3_900_000_000, debtRatio: 134, grade: 'BBB', issues: '가지급금 4.5억', suggestions: '급여·배당 조정으로 단계적 상환', source: '컨설팅웹앱', reportUrl: '' },
    ],
    goals: [
      { id: id('g'), url: '', title: '매출 120억 달성', companyIds: [a.id], type: '목표', related: '', year: y + 1, quarter: '', area: '기타', status: '예정', due: '', effect: '' },
      { id: id('g'), url: '', title: '이노비즈 취득', companyIds: [a.id], type: '과업', related: '매출 120억 달성', year: y + 1, quarter: '1Q', area: '인증', status: '진행', due: `${y + 1}-03-31`, effect: '정책자금 금리 우대, 공공입찰 가점' },
      { id: id('g'), url: '', title: '2공장 시설자금 10억 조달', companyIds: [a.id], type: '과업', related: '매출 120억 달성', year: y + 1, quarter: '2Q', area: '자금', status: '예정', due: `${y + 1}-06-30`, effect: '증설로 생산능력 40% 확대' },
    ],
    matches: [
      { id: id('m'), url: '', title: `${y + 1} 스마트공장 고도화 지원사업`, companyIds: [a.id], agency: '스마트제조혁신추진단', area: '시설·스마트공장', score: 86, reason: '제조업·종업원 42명·연구소 보유, 증설 계획과 일치', deadline: d(25), status: 'AI추천', link: '', size: '최대 2억', date: d(-1) },
      { id: id('m'), url: '', title: '수출바우처(중소기업형)', companyIds: [b.id], agency: 'KOTRA', area: '수출·판로', score: 78, reason: '식품 제조, 베트남 수출 목표', deadline: d(14), status: '검토중', link: '', size: '최대 1억', date: d(-5) },
    ],
    links: [
      { id: id('l'), url: '', name: '기업컨설팅 웹앱 (채움 ver2.1)', href: 'https://example.com/chaeum', desc: '가결산 재무진단·리포트', order: 1, newTab: true },
      { id: id('l'), url: '', name: '위들리 대시보드', href: 'https://example.com/widly', desc: '정책자금 업체 관리 (데이터 공유 없음)', order: 2, newTab: true },
    ],
    loadedAt: new Date().toISOString(),
  };
}
