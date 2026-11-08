import type { Answer, Bilingual, CommunityProblem, DuelRecord, Problem, Tier, Topic, User } from '../../types';

export type Board = 'rating' | 'xp' | 'researchers';

export interface BoardEntry { id: string; name: string; rating: number; xp: number; approved: number; isBot: boolean }
export interface BoardResult { rows: BoardEntry[]; myRank: number | null; total: number }

export interface SubmitResult {
  correct: boolean;
  xpGained: number;
  ratingDelta: number;
  firstSolve: boolean;
  explanation?: Bilingual;
}

export interface BotPlan { correct: boolean; time: number }
export interface DuelMatch { id: string; opponent: string; oppRating: number; problems: Problem[]; plan: BotPlan[] }
export interface DuelFinal { result: 'win' | 'loss' | 'draw'; delta: number; xp: number }
export interface DuelRound { mine: number; theirs: number; myCorrect: boolean; theirCorrect: boolean; final?: DuelFinal }

export interface ProblemDraft {
  tier: Tier;
  topic: Topic;
  source: string;
  statement: Bilingual;
  explanation: Bilingual;
  answer: Answer;
}

export type SignUpResult = { user: User } | { needsConfirmation: true };

/**
 * 앱 화면이 사용하는 모든 데이터 작업.
 * - local: 브라우저 저장소 (데모·오프라인)
 * - supabase: 실제 서버 (채점·점수는 서버 함수가 처리)
 */
export interface Api {
  mode: 'local' | 'supabase';
  me(): Promise<User | null>;
  onAuthChange(cb: () => void): () => void;
  signUp(username: string, email: string, password: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;

  problems(): Promise<Problem[]>;
  submit(problem: Problem, input: string | number): Promise<SubmitResult>;
  reveal(problem: Problem): Promise<Bilingual | undefined>;

  leaderboard(board: Board): Promise<BoardResult>;

  duelHistory(): Promise<DuelRecord[]>;
  startDuel(): Promise<DuelMatch>;
  /** input = null 이면 패스. secondsLeft는 로컬 모드에서만 사용(서버는 자체 시간 기준) */
  duelAnswer(match: DuelMatch, round: number, input: string | number | null, secondsLeft: number): Promise<DuelRound>;

  submitProblem(draft: ProblemDraft): Promise<void>;
  reviewQueue(): Promise<CommunityProblem[]>;
  myProblems(): Promise<CommunityProblem[]>;
  vote(problemId: string, approve: boolean, comment: string): Promise<void>;

  /** 개발용: 로컬 모드에서만 */
  devBoost?(xp: number): Promise<void>;
}
