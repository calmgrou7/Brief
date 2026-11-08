import type { Api, Board, BoardEntry, DuelMatch, DuelRound } from './types';
import * as store from '../store';
import { recordAttempt, revealExplanation } from '../actions';
import { eloDelta, expected, grade, nextStreak } from '../game';

const ROUND_SECONDS = 90;
const DUEL_XP = { win: 60, draw: 30, loss: 15 } as const;

function requireUser() {
  const u = store.sessionUser();
  if (!u) throw new Error('not authenticated');
  return u;
}

/** 진행 중인 대결의 누적 점수 (메모리) */
const live = new Map<string, { my: number; their: number }>();

export const localApi: Api = {
  mode: 'local',

  async me() { return store.sessionUser(); },
  onAuthChange() { return () => {}; },
  async signUp(username, email, password) { return { user: await store.signUp(username, email, password) }; },
  async signIn(email, password) { return store.signIn(email, password); },
  async signOut() { store.signOut(); },

  async problems() { return store.allProblems(); },

  async submit(problem, input) {
    const u = requireUser();
    const full = store.findProblem(problem.id) ?? problem;
    const r = recordAttempt(u.id, full, grade(full.answer, input));
    if (!r) throw new Error('attempt failed');
    return {
      correct: r.correct, xpGained: r.xpGained, ratingDelta: r.ratingDelta, firstSolve: r.firstSolve,
      explanation: r.correct ? full.explanation : undefined,
    };
  },

  async reveal(problem) {
    const u = requireUser();
    const full = store.findProblem(problem.id) ?? problem;
    revealExplanation(u.id, full);
    return full.explanation;
  },

  async leaderboard(board: Board) {
    const me = store.sessionUser();
    const key = (e: BoardEntry) => (board === 'rating' ? e.rating : board === 'xp' ? e.xp : e.approved);
    const rows = store.leaderboard().filter((e) => board !== 'researchers' || e.approved > 0).sort((a, b) => key(b) - key(a));
    const i = me ? rows.findIndex((r) => r.id === me.id) : -1;
    return { rows, myRank: i >= 0 ? i + 1 : null, total: rows.length };
  },

  async duelHistory() { return store.listDuels(requireUser().id); },

  async startDuel(): Promise<DuelMatch> {
    const u = requireUser();
    const bot = store.BOTS[Math.floor(Math.random() * store.BOTS.length)];
    const oppRating = Math.round(u.rating + (Math.random() * 240 - 120));
    const pool = [...store.allProblems()].sort((a, b) => Math.abs(a.rating - u.rating) - Math.abs(b.rating - u.rating)).slice(0, 14);
    const problems = pool.sort(() => Math.random() - 0.5).slice(0, 5).sort((a, b) => a.rating - b.rating);
    const plan = problems.map((p) => ({ correct: Math.random() < expected(oppRating, p.rating), time: Math.round(12 + Math.random() * 62) }));
    const id = `local-${Date.now()}`;
    live.set(id, { my: 0, their: 0 });
    return { id, opponent: bot.name, oppRating, problems, plan };
  },

  async duelAnswer(match, round, input, secondsLeft): Promise<DuelRound> {
    const u = requireUser();
    const acc = live.get(match.id) ?? { my: 0, their: 0 };
    const p = match.problems[round];
    const myCorrect = input !== null && secondsLeft > 0 && grade(p.answer, input);
    const plan = match.plan[round];
    const r: DuelRound = {
      myCorrect,
      mine: myCorrect ? 100 + Math.max(0, secondsLeft) : 0,
      theirCorrect: plan.correct,
      theirs: plan.correct ? 100 + (ROUND_SECONDS - plan.time) : 0,
    };
    acc.my += r.mine;
    acc.their += r.theirs;
    live.set(match.id, acc);

    if (round + 1 >= match.problems.length) {
      live.delete(match.id);
      const result = acc.my > acc.their ? 'win' : acc.my < acc.their ? 'loss' : 'draw';
      const delta = eloDelta(u.rating, match.oppRating, result === 'win' ? 1 : result === 'draw' ? 0.5 : 0, 32);
      const xp = DUEL_XP[result];
      store.updateUser(u.id, (x) => {
        x.rating = Math.max(100, x.rating + delta);
        x.xp += xp;
        x.streak = nextStreak(x.streak);
        x.duels = { w: x.duels.w + +(result === 'win'), l: x.duels.l + +(result === 'loss'), d: x.duels.d + +(result === 'draw') };
        return x;
      });
      store.addDuel({ userId: u.id, opponent: match.opponent, opponentRating: match.oppRating, myScore: acc.my, oppScore: acc.their, result, ratingDelta: delta });
      r.final = { result, delta, xp };
    }
    return r;
  },

  async submitProblem(d) {
    const u = requireUser();
    store.submitCommunity({ ...d, authorId: u.id, authorName: u.username });
  },
  async reviewQueue() {
    const u = requireUser();
    return store.listCommunity().filter((p) => p.status === 'pending' && p.authorId !== u.id && !p.votes[u.id]);
  },
  async myProblems() {
    const u = requireUser();
    return store.listCommunity().filter((p) => p.authorId === u.id);
  },
  async vote(id, approve, comment) {
    store.voteCommunity(id, requireUser().id, approve, comment);
  },

  async devBoost(xp) {
    const u = requireUser();
    store.updateUser(u.id, (x) => ({ ...x, xp: x.xp + xp }));
  },
};
