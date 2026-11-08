import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Answer, Bilingual, CommunityProblem, DuelRecord, Problem, User, Vote } from '../../types';
import type { Api, Board, DuelMatch, DuelRound } from './types';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const PUBLIC_COLS = 'id, tier, topic, source, rating, statement, hint, answer_shape, author_id, author_name, status, created_at';
const BOARD_COL: Record<Board, string> = { rating: 'rating', xp: 'xp', researchers: 'approved_count' };

/** 서버가 정답을 숨긴 채 보낸 유형·보기 → 화면용 Answer */
function shapeToAnswer(shape: Row | null, full?: Row | null): Answer {
  if (full) return full as Answer;
  switch (shape?.kind) {
    case 'choice': return { kind: 'choice', options: shape.options ?? [], correct: -1 };
    case 'short': return { kind: 'short', accepted: [] };
    default: return { kind: 'numeric', value: Number.NaN };
  }
}

function toProblem(r: Row): Problem {
  return {
    id: r.id, tier: r.tier, topic: r.topic, source: r.source, rating: r.rating,
    statement: r.statement, hint: r.hint ?? undefined, explanation: r.explanation ?? undefined,
    answer: shapeToAnswer(r.answer_shape, r.answer),
    authorId: r.author_id ?? undefined, authorName: r.author_name ?? undefined,
  };
}

function toCommunity(r: Row): CommunityProblem {
  const votes: Record<string, Vote> = {};
  (r.votes ?? []).forEach((v: Row, i: number) => { votes[String(i)] = { approve: v.approve, comment: v.comment ?? '', at: Date.parse(v.at) }; });
  return { ...toProblem(r), status: r.status, createdAt: Date.parse(r.created_at), votes };
}

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message);
}

export function createSupabaseApi(url: string, key: string): Api {
  const sb: SupabaseClient = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });

  async function uid() {
    const { data } = await sb.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async function loadUser(id: string, email = ''): Promise<User | null> {
    const [{ data: p, error }, { data: solves }] = await Promise.all([
      sb.from('profiles').select('*').eq('id', id).maybeSingle(),
      sb.from('solves').select('problem_id, misses, solved_at').eq('user_id', id),
    ]);
    fail(error);
    if (!p) return null;
    const solved: User['solved'] = {};
    const misses: User['misses'] = {};
    for (const s of solves ?? []) {
      if (s.solved_at) solved[s.problem_id] = { at: Date.parse(s.solved_at), tries: s.misses + 1 };
      else if (s.misses) misses[s.problem_id] = s.misses;
    }
    return {
      id: p.id, username: p.username, email, createdAt: Date.parse(p.created_at),
      xp: p.xp, rating: p.rating, approvedCount: p.approved_count,
      totalAttempts: p.total_attempts, totalCorrect: p.total_correct,
      streak: { count: p.streak_count, lastDay: p.streak_day ?? '' },
      duels: { w: p.duels_w, l: p.duels_l, d: p.duels_d },
      solved, misses,
    };
  }

  return {
    mode: 'supabase',

    async me() {
      const { data } = await sb.auth.getSession();
      const u = data.session?.user;
      return u ? loadUser(u.id, u.email ?? '') : null;
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') cb();
      });
      return () => data.subscription.unsubscribe();
    },

    async signUp(username, email, password) {
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { username: username.trim() }, emailRedirectTo: window.location.origin + window.location.pathname },
      });
      if (error) throw new Error(/registered|exists/i.test(error.message) ? 'exists' : error.message);
      if (!data.session || !data.user) return { needsConfirmation: true };
      const user = await loadUser(data.user.id, email);
      if (!user) throw new Error('profile missing');
      return { user };
    },

    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw new Error('invalid');
      const user = await loadUser(data.user.id, email);
      if (!user) throw new Error('profile missing');
      return user;
    },

    async signOut() { await sb.auth.signOut(); },

    async problems() {
      const { data, error } = await sb.from('problems').select(PUBLIC_COLS).eq('status', 'approved').order('rating');
      fail(error);
      return (data ?? []).map(toProblem);
    },

    async submit(problem, input) {
      const { data, error } = await sb.rpc('submit_answer', { p_problem: problem.id, p_input: String(input) });
      fail(error);
      return {
        correct: data.correct, xpGained: data.xp, ratingDelta: data.delta, firstSolve: data.first_solve,
        explanation: (data.explanation as Bilingual | null) ?? undefined,
      };
    },

    async reveal(problem) {
      const { data, error } = await sb.rpc('reveal_explanation', { p_problem: problem.id });
      fail(error);
      return data as Bilingual;
    },

    async leaderboard(board) {
      const col = BOARD_COL[board];
      let q = sb.from('profiles').select('id, username, rating, xp, approved_count', { count: 'exact' }).order(col, { ascending: false }).limit(100);
      if (board === 'researchers') q = q.gt('approved_count', 0);
      const { data, error, count } = await q;
      fail(error);
      const rows = (data ?? []).map((r) => ({ id: r.id, name: r.username, rating: r.rating, xp: r.xp, approved: r.approved_count, isBot: false }));
      let myRank: number | null = null;
      const me = await uid();
      if (me) {
        const i = rows.findIndex((r) => r.id === me);
        if (i >= 0) myRank = i + 1;
        else {
          const { data: mine } = await sb.from('profiles').select(col).eq('id', me).maybeSingle();
          const v = (mine as Row | null)?.[col];
          if (v !== undefined && (board !== 'researchers' || v > 0)) {
            const { count: ahead } = await sb.from('profiles').select('id', { count: 'exact', head: true }).gt(col, v);
            myRank = (ahead ?? 0) + 1;
          }
        }
      }
      return { rows, myRank, total: count ?? rows.length };
    },

    async duelHistory() {
      const me = await uid();
      const { data, error } = await sb.from('duels').select('*').eq('status', 'done').order('created_at', { ascending: false }).limit(10);
      fail(error);
      return (data ?? []).map((d): DuelRecord => ({
        id: d.id, userId: me ?? '', opponent: d.opponent, opponentRating: d.opp_rating,
        myScore: d.my_score, oppScore: d.opp_score, result: d.result, ratingDelta: d.rating_delta, at: Date.parse(d.created_at),
      }));
    },

    async startDuel(): Promise<DuelMatch> {
      const { data, error } = await sb.rpc('start_duel');
      fail(error);
      return { id: data.id, opponent: data.opponent, oppRating: data.opp_rating, problems: (data.problems as Row[]).map(toProblem), plan: data.plan };
    },

    async duelAnswer(match, _round, input): Promise<DuelRound> {
      const { data, error } = await sb.rpc('duel_answer', { p_duel: match.id, p_input: input === null ? null : String(input) });
      fail(error);
      return {
        mine: data.mine, theirs: data.theirs, myCorrect: data.my_correct, theirCorrect: data.their_correct,
        final: data.final ? { result: data.final.result, delta: data.final.delta, xp: data.final.xp } : undefined,
      };
    },

    async submitProblem(d) {
      const { error } = await sb.rpc('submit_problem', { p: d });
      fail(error);
    },
    async reviewQueue() {
      const { data, error } = await sb.rpc('review_queue');
      fail(error);
      return (data as Row[]).map(toCommunity);
    },
    async myProblems() {
      const { data, error } = await sb.rpc('my_problems');
      fail(error);
      return (data as Row[]).map(toCommunity);
    },
    async vote(problemId, approve, comment) {
      const { error } = await sb.rpc('vote_problem', { p_problem: problemId, p_approve: approve, p_comment: comment });
      fail(error);
    },
  };
}
