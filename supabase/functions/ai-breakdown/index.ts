// 목표를 10~30분 단위 할 일로 쪼개 tasks 테이블에 저장한다.
// 무료 사용자는 한국시간 기준 월 FREE_AI_PER_MONTH 회까지.
import Anthropic from 'npm:@anthropic-ai/sdk';

import { admin, getUser, json, kstMonth } from '../_shared/supabase.ts';

const FREE_AI_PER_MONTH = 3;
// 기본은 Claude Opus 5.5. 비용을 낮추려면 Supabase 시크릿 DOIT_AI_MODEL 로 교체 (예: claude-haiku-5-5)
const MODEL = Deno.env.get('DOIT_AI_MODEL') ?? 'claude-opus-5-5';
// 서버측 거절 대비 대체 모델 자동 전환(Opus/Sonnet/Fable 계열에서만 지원)
const SUPPORTS_FALLBACK = /^claude-(opus-5|sonnet-5-5|fable-5)/.test(MODEL);

const anthropic = new Anthropic(); // ANTHROPIC_API_KEY 시크릿 사용

const SYSTEM = `당신은 "DOIT" 앱의 실행 코치입니다. 사용자의 목표를 오늘 바로 시작할 수 있는 구체적인 할 일 목록으로 쪼갭니다.

규칙:
- 할 일은 5~10개. 각 할 일은 10~30분 안에 끝낼 수 있는 크기로, 동사로 끝나는 짧은 한국어 문장(예: "참고 사이트 5개 캡처하기").
- 실행 순서대로 정렬. 첫 번째 할 일은 5~10분이면 끝나는 아주 쉬운 것으로 해서 바로 시작할 수 있게 한다.
- "열심히 하기", "계획 세우기"처럼 모호한 항목은 쓰지 않는다. 결과물이 눈에 보이는 행동으로 쓴다.
- 이미 있는 할 일과 겹치지 않게, 그 다음 단계를 제안한다.
- minutes는 예상 소요시간(분, 정수).`;

const SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, minutes: { type: 'integer' } },
        required: ['title', 'minutes'],
        additionalProperties: false,
      },
    },
  },
  required: ['tasks'],
  additionalProperties: false,
} as const;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ message: 'Method not allowed' }, 405);
  const user = await getUser(req);
  if (!user) return json({ message: '로그인이 필요해요.' }, 401);

  const { goal_id } = await req.json().catch(() => ({}));
  if (typeof goal_id !== 'string') return json({ message: 'goal_id가 필요해요.' }, 400);

  const { data: goal } = await admin.from('goals').select('id,title,due_date,user_id').eq('id', goal_id).maybeSingle();
  if (!goal || goal.user_id !== user.id) return json({ message: '목표를 찾을 수 없어요.' }, 404);

  // 무료 한도 확인
  const month = kstMonth();
  const { data: premium } = await admin.rpc('is_premium', { p_user: user.id });
  let used = 0;
  if (!premium) {
    const { data: usage } = await admin.from('ai_usage').select('count').eq('user_id', user.id).eq('month', month).maybeSingle();
    used = usage?.count ?? 0;
    if (used >= FREE_AI_PER_MONTH) {
      return json({ code: 'FREE_LIMIT', message: `무료 플랜은 AI 쪼개기를 한 달에 ${FREE_AI_PER_MONTH}번까지 쓸 수 있어요.` }, 402);
    }
  }

  const { data: existing } = await admin.from('tasks').select('title,position,done_at').eq('goal_id', goal_id).order('position');
  const existingList = (existing ?? []).map((t) => `- ${t.title}${t.done_at ? ' (완료)' : ''}`).join('\n') || '(없음)';
  const todayKst = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

  let tasks: { title: string; minutes: number }[];
  try {
    const params = {
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [
        {
          role: 'user',
          content: `목표: ${goal.title}\n마감일: ${goal.due_date ?? '없음'}\n오늘 날짜: ${todayKst}\n\n이미 있는 할 일:\n${existingList}`,
        },
      ],
      ...(SUPPORTS_FALLBACK ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
    };
    // deno-lint-ignore no-explicit-any
    const msg: any = await anthropic.beta.messages.create(params as any);

    if (msg.stop_reason === 'refusal') return json({ message: '이 목표는 쪼갤 수 없어요. 표현을 바꿔 다시 시도해 주세요.' }, 422);
    const text = msg.content.find((b: { type: string }) => b.type === 'text')?.text;
    if (!text) throw new Error('empty response');
    tasks = JSON.parse(text).tasks;
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ message: '요청이 많아요. 잠시 후 다시 시도해 주세요.' }, 429);
    console.error('claude error', e);
    return json({ message: 'AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.' }, 502);
  }

  const clean = tasks
    .filter((t) => typeof t.title === 'string' && t.title.trim())
    .slice(0, 12)
    .map((t, i) => ({
      user_id: user.id,
      goal_id,
      title: t.title.trim().slice(0, 200),
      minutes: Math.min(Math.max(Math.round(t.minutes) || 15, 1), 600),
      position: (existing?.at(-1)?.position ?? 0) + i + 1,
      source: 'ai',
    }));

  const { error } = await admin.from('tasks').insert(clean);
  if (error) return json({ message: '저장에 실패했어요.' }, 500);

  let remaining: number | null = null;
  if (!premium) {
    const { data: count } = await admin.rpc('bump_ai_usage', { p_user: user.id, p_month: month });
    remaining = Math.max(FREE_AI_PER_MONTH - (count ?? used + 1), 0);
  }
  return json({ created: clean.length, remaining });
});
