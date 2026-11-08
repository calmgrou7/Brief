import type { Lang } from './types';

const ko = {
  appName: '수학의 신',
  tagline: '책과 이론으로 겨루는 수학 — 중학교부터 연구실까지',
  nav: { home: '홈', practice: '문제', duel: '대결', ranking: '랭킹', lab: '연구소', profile: '프로필' },
  tiers: { middle: '중등', high: '고등', undergrad: '학부', grad: '대학원', research: '연구', community: '커뮤니티' },
  tierDesc: {
    middle: '유클리드 원론, 정수론의 첫걸음',
    high: '귀납법·이항정리·미적분의 기초',
    undergrad: '해석학·선형대수·대수학',
    grad: '갈루아 이론·위상수학·측도론',
    research: '현대 수학의 고전 정리와 상수',
    community: '연구원들이 출제한 문제',
  },
  topics: {
    number: '정수론', algebra: '대수', geometry: '기하', analysis: '해석', combinatorics: '조합',
    linear: '선형대수', topology: '위상', abstract: '추상대수', complex: '복소해석', misc: '기타',
  },
  ranks: { novice: '입문자', explorer: '탐구자', composer: '출제자', prover: '증명가', scholar: '석학' },
  researcher: { none: '', researcher: '수학연구원', senior: '수석연구원', fellow: '펠로우' },
  auth: {
    login: '로그인', signup: '회원가입', username: '닉네임', email: '이메일', password: '비밀번호',
    noAccount: '계정이 없나요?', haveAccount: '이미 계정이 있나요?', logout: '로그아웃',
    errExists: '이미 사용 중인 이메일 또는 닉네임입니다.', errInvalid: '이메일 또는 비밀번호가 올바르지 않습니다.',
    errShort: '닉네임 2자 이상, 비밀번호 6자 이상 입력해 주세요.',
    localNote: '현재 데모(로컬 저장) 모드입니다. 데이터는 이 브라우저에만 저장됩니다.',
    checkEmail: '확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.',
  },
  common: { loading: '불러오는 중…', error: '문제가 생겼습니다. 잠시 후 다시 시도해 주세요.', retry: '다시 시도' },
  landing: {
    f1t: '5단계 난이도', f1d: '중등부터 실제 연구자들이 다루는 정리까지, 근거가 되는 책·이론과 함께.',
    f2t: '레이팅 대결', f2d: 'Elo 레이팅으로 실력이 숫자로. 수학과 친구와 겨루고 등수를 올리세요.',
    f3t: '수학연구원 등급', f3d: 'Lv.10부터 직접 문제를 출제하고, 승인되면 연구원으로 승급합니다.',
    start: '시작하기',
  },
  home: {
    hello: '안녕하세요', level: '레벨', rating: '레이팅', streak: '연속', days: '일', solved: '해결',
    accuracy: '정확도', continue: '이어서 풀기', daily: '오늘의 문제', quickDuel: '빠른 대결',
    toNext: '다음 레벨까지', composerLocked: 'Lv.{n}에 출제 권한이 열립니다', composerOpen: '출제 권한 보유 — 연구소에서 문제를 만들어 보세요',
  },
  practice: {
    title: '문제', pick: '단계를 고르세요', all: '전체', solvedTag: '해결', submit: '제출', next: '다음 문제',
    correct: '정답!', wrong: '오답입니다. 다시 시도해 보세요.', hint: '힌트', showHint: '힌트 보기', explanation: '해설',
    source: '근거', yourAnswer: '답 입력 (분수 가능: 1/3)', reveal: '해설 보기', xpGain: '+{n} XP', ratingChange: '레이팅 {n}',
    empty: '아직 문제가 없습니다.', by: '출제', back: '목록으로', alreadySolved: '이미 해결한 문제 — 보상 없음',
  },
  duel: {
    title: '레이팅 대결', desc: '실력이 비슷한 상대와 5문제, 문제당 90초. 빠르고 정확할수록 점수가 높습니다.',
    find: '상대 찾기', vs: 'VS', round: '라운드', time: '남은 시간', you: '나', opponent: '상대',
    win: '승리!', loss: '패배', draw: '무승부', again: '다시 대결', history: '최근 대결',
    oppSolved: '상대가 풀었습니다', oppMissed: '상대가 놓쳤습니다', timeUp: '시간 초과', submit: '제출', skip: '패스',
    note: '현재 버전의 상대는 레이팅 기반 AI입니다. 실시간 1:1 매칭은 서버 연동 시 활성화됩니다.',
  },
  ranking: { title: '랭킹', rating: '레이팅', xp: '경험치', researchers: '연구원', you: '나', rank: '순위', player: '플레이어', approved: '승인 문제' },
  lab: {
    title: '연구소', locked: '출제실은 Lv.{n}부터 이용할 수 있습니다.', progress: '현재 Lv.{lv} — {xp} XP 더 필요',
    create: '문제 출제', review: '심사', mine: '내 출제', statementKo: '문제 (한국어)', statementEn: 'Problem (English)',
    explanationKo: '해설 (한국어)', explanationEn: 'Explanation (English)', answerType: '정답 유형',
    numeric: '수치', choice: '객관식', short: '단답', answerValue: '정답', options: '보기 (한 줄에 하나, 한/영은 | 로 구분)',
    correctIndex: '정답 번호', accepted: '허용 답안 (쉼표로 구분)', source: '근거 책·이론', submit: '심사 요청',
    preview: '미리보기', submitted: '심사 대기열에 등록되었습니다.', pending: '심사 중', approved: '승인', rejected: '반려',
    approve: '승인', reject: '반려', comment: '심사 의견', noPending: '심사할 문제가 없습니다.', noMine: '아직 출제한 문제가 없습니다.',
    researcherInfo: '승인된 문제 {n}개 → 수학연구원 승급. 승인 시 +100 XP, 다른 사용자가 풀 때마다 +5 XP.',
    required: '필수 항목을 채워 주세요.', votes: '표',
  },
  profile: {
    title: '프로필', joined: '가입일', stats: '통계', attempts: '시도', duels: '대결 전적', w: '승', l: '패', d: '무',
    byTier: '단계별 해결', badges: '칭호', lang: '언어', demoBoost: '데모: +1000 XP',
  },
};

type Dict = typeof ko;

const en: Dict = {
  appName: 'God of Math',
  tagline: 'Theory-driven math battles — from middle school to the research lab',
  nav: { home: 'Home', practice: 'Problems', duel: 'Duel', ranking: 'Ranking', lab: 'Lab', profile: 'Profile' },
  tiers: { middle: 'Middle', high: 'High', undergrad: 'Undergrad', grad: 'Graduate', research: 'Research', community: 'Community' },
  tierDesc: {
    middle: "Euclid's Elements and first steps in number theory",
    high: 'Induction, binomial theorem, calculus basics',
    undergrad: 'Analysis, linear algebra, abstract algebra',
    grad: 'Galois theory, topology, measure theory',
    research: 'Landmark theorems and constants of modern math',
    community: 'Problems composed by researchers',
  },
  topics: {
    number: 'Number theory', algebra: 'Algebra', geometry: 'Geometry', analysis: 'Analysis', combinatorics: 'Combinatorics',
    linear: 'Linear algebra', topology: 'Topology', abstract: 'Abstract algebra', complex: 'Complex analysis', misc: 'Misc',
  },
  ranks: { novice: 'Novice', explorer: 'Explorer', composer: 'Composer', prover: 'Prover', scholar: 'Scholar' },
  researcher: { none: '', researcher: 'Math Researcher', senior: 'Senior Researcher', fellow: 'Fellow' },
  auth: {
    login: 'Log in', signup: 'Sign up', username: 'Username', email: 'Email', password: 'Password',
    noAccount: "Don't have an account?", haveAccount: 'Already have an account?', logout: 'Log out',
    errExists: 'That email or username is already taken.', errInvalid: 'Incorrect email or password.',
    errShort: 'Username needs 2+ characters and password 6+.',
    localNote: 'Demo (local storage) mode. Data stays in this browser only.',
    checkEmail: 'We sent you a confirmation email. Click the link, then log in.',
  },
  common: { loading: 'Loading…', error: 'Something went wrong. Please try again.', retry: 'Retry' },
  landing: {
    f1t: 'Five tiers', f1d: 'From middle school to theorems real researchers use — each tied to its book or theory.',
    f2t: 'Rated duels', f2d: 'Elo rating turns skill into a number. Challenge classmates and climb the board.',
    f3t: 'Researcher rank', f3d: 'From Lv.10 compose your own problems; get them approved to become a Researcher.',
    start: 'Get started',
  },
  home: {
    hello: 'Welcome back', level: 'Level', rating: 'Rating', streak: 'Streak', days: 'd', solved: 'Solved',
    accuracy: 'Accuracy', continue: 'Continue', daily: "Today's problem", quickDuel: 'Quick duel',
    toNext: 'to next level', composerLocked: 'Composing unlocks at Lv.{n}', composerOpen: 'You can compose — visit the Lab',
  },
  practice: {
    title: 'Problems', pick: 'Choose a tier', all: 'All', solvedTag: 'Solved', submit: 'Submit', next: 'Next problem',
    correct: 'Correct!', wrong: 'Not quite. Try again.', hint: 'Hint', showHint: 'Show hint', explanation: 'Explanation',
    source: 'Based on', yourAnswer: 'Your answer (fractions OK: 1/3)', reveal: 'Show explanation', xpGain: '+{n} XP', ratingChange: 'Rating {n}',
    empty: 'No problems yet.', by: 'by', back: 'Back to list', alreadySolved: 'Already solved — no reward',
  },
  duel: {
    title: 'Rated Duel', desc: 'Five problems against an evenly matched opponent, 90s each. Faster and correct scores more.',
    find: 'Find opponent', vs: 'VS', round: 'Round', time: 'Time left', you: 'You', opponent: 'Opponent',
    win: 'Victory!', loss: 'Defeat', draw: 'Draw', again: 'Duel again', history: 'Recent duels',
    oppSolved: 'Opponent solved it', oppMissed: 'Opponent missed', timeUp: "Time's up", submit: 'Submit', skip: 'Skip',
    note: 'Opponents are rating-based AI in this version. Live 1:1 matchmaking turns on with the server backend.',
  },
  ranking: { title: 'Ranking', rating: 'Rating', xp: 'XP', researchers: 'Researchers', you: 'You', rank: 'Rank', player: 'Player', approved: 'Approved' },
  lab: {
    title: 'Lab', locked: 'The composing room opens at Lv.{n}.', progress: 'You are Lv.{lv} — {xp} XP to go',
    create: 'Compose', review: 'Review', mine: 'My problems', statementKo: '문제 (한국어)', statementEn: 'Problem (English)',
    explanationKo: '해설 (한국어)', explanationEn: 'Explanation (English)', answerType: 'Answer type',
    numeric: 'Numeric', choice: 'Multiple choice', short: 'Short text', answerValue: 'Answer', options: 'Options (one per line, KO | EN)',
    correctIndex: 'Correct option #', accepted: 'Accepted answers (comma separated)', source: 'Source book / theory', submit: 'Submit for review',
    preview: 'Preview', submitted: 'Submitted to the review queue.', pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
    approve: 'Approve', reject: 'Reject', comment: 'Review comment', noPending: 'Nothing to review.', noMine: "You haven't composed anything yet.",
    researcherInfo: '{n} approved problems → Math Researcher. +100 XP on approval, +5 XP each time someone solves it.',
    required: 'Please fill in the required fields.', votes: 'votes',
  },
  profile: {
    title: 'Profile', joined: 'Joined', stats: 'Stats', attempts: 'Attempts', duels: 'Duel record', w: 'W', l: 'L', d: 'D',
    byTier: 'Solved by tier', badges: 'Titles', lang: 'Language', demoBoost: 'Demo: +1000 XP',
  },
};

export const DICTS: Record<Lang, Dict> = { ko, en };
export type { Dict };

export function fmt(s: string, vars: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
