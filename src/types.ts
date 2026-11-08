export type Lang = 'ko' | 'en';
export type Bilingual = { ko: string; en: string };

/** 난이도 단계: 중등 → 고등 → 학부 → 대학원 → 연구 */
export type Tier = 'middle' | 'high' | 'undergrad' | 'grad' | 'research';
export const TIERS: Tier[] = ['middle', 'high', 'undergrad', 'grad', 'research'];

export type Topic =
  | 'number' | 'algebra' | 'geometry' | 'analysis' | 'combinatorics'
  | 'linear' | 'topology' | 'abstract' | 'complex' | 'misc';
export const TOPICS: Topic[] = ['number', 'algebra', 'geometry', 'analysis', 'combinatorics', 'linear', 'topology', 'abstract', 'complex', 'misc'];

export type Answer =
  | { kind: 'numeric'; value: number; tolerance?: number }
  | { kind: 'choice'; options: Bilingual[]; correct: number }
  | { kind: 'short'; accepted: string[] };

export interface Problem {
  id: string;
  tier: Tier;
  topic: Topic;
  /** 근거가 되는 책·이론 (예: "Euclid, Elements VII") */
  source: string;
  /** Elo 방식의 문제 난이도 */
  rating: number;
  statement: Bilingual;
  answer: Answer;
  explanation: Bilingual;
  hint?: Bilingual;
  /** 커뮤니티 출제 문제일 때 출제자 */
  authorId?: string;
  authorName?: string;
}

export interface SolveRecord { at: number; tries: number }

export interface User {
  id: string;
  username: string;
  email: string;
  passHash: string;
  salt: string;
  createdAt: number;
  xp: number;
  rating: number;
  solved: Record<string, SolveRecord>;
  /** 아직 못 푼 문제의 오답 횟수 */
  misses: Record<string, number>;
  totalAttempts: number;
  totalCorrect: number;
  streak: { count: number; lastDay: string };
  duels: { w: number; l: number; d: number };
  approvedCount: number;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface CommunityProblem extends Problem {
  status: ReviewStatus;
  createdAt: number;
  votes: Record<string, { approve: boolean; comment: string; at: number }>;
}

export interface DuelRecord {
  id: string;
  userId: string;
  opponent: string;
  opponentRating: number;
  myScore: number;
  oppScore: number;
  result: 'win' | 'loss' | 'draw';
  ratingDelta: number;
  at: number;
}
