/**
 * AI 보험 상담 — Claude API. 키가 없으면 내장 FAQ로 응답합니다.
 * 응답 끝에 붙는 태그로 (1) 상담 연결 필요 여부 (2) 질문 주제를 자동 분류합니다.
 * 분류된 질문은 나중에 커뮤니티·SEO 글감으로 재사용됩니다.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config";

export const TOPICS = ["claim", "coverage", "premium", "product", "silson", "car", "etc"] as const;
export type Topic = (typeof TOPICS)[number];

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type ChatResult = { answer: string; suggestConsult: boolean; topic: Topic; source: "claude" | "faq" };

const SYSTEM = `당신은 "${config.siteName}"의 보험 정보 도우미입니다. 한국 보험(실손, 진단비, 수술비, 운전자, 어린이, 치아, 간병 등)과 보험금 청구 절차를 쉽게 설명합니다.

원칙:
- 모바일 화면에서 읽기 쉽게 3~6문장 또는 짧은 목록으로 답하세요. 전문용어는 풀어서 설명하세요.
- 일반적인 정보와 절차를 안내합니다. 특정 보험상품 가입을 권유하거나 특정 회사를 추천하지 않습니다.
- 개인 보험의 실제 보장 여부·지급 금액은 약관과 보험사 심사로 결정된다는 점을 필요할 때 짧게 밝히세요. 확정적으로 "받을 수 있다"고 단정하지 마세요.
- 보험금 청구권 소멸시효는 3년입니다. 해당될 때 알려주세요.
- 가입 내역 확인은 신용정보원 '내보험다보여', 숨은 보험금 조회는 '내보험찾아줌', 병원급 실손 간편청구는 '실손24'를 안내할 수 있습니다.
- 사용자의 이름·전화번호·주민번호 등 개인정보를 대화창에 적지 말라고 안내하세요. 직접 요구하지 마세요.
- 개인 증권 분석, 복잡한 청구 분쟁, 보험 리모델링처럼 개인 상황 확인이 필요한 질문이면 "전문가 무료 상담"을 권하세요.

답변의 맨 마지막 줄에 아래 형식의 태그를 반드시 한 줄로 붙이세요(사용자에게는 보이지 않습니다):
[[consult:yes|no]][[topic:claim|coverage|premium|product|silson|car|etc]]`;

function parseTags(text: string) {
  const consult = /\[\[consult:(yes|no)\]\]/i.exec(text)?.[1]?.toLowerCase() === "yes";
  const t = /\[\[topic:([a-z]+)\]\]/i.exec(text)?.[1]?.toLowerCase() as Topic | undefined;
  const answer = text.replace(/\[\[(consult|topic):[^\]]*\]\]/gi, "").trim();
  return { answer, suggestConsult: consult, topic: t && TOPICS.includes(t) ? t : "etc" };
}

// 서버측 refusal fallback을 지원하는 모델에만 fallbacks 파라미터를 붙입니다.
const supportsFallback = (m: string) => /^claude-(opus-5-5|opus-5|fable-5|sonnet-5-5)/.test(m);

export async function answerQuestion(history: ChatTurn[]): Promise<ChatResult> {
  if (!process.env.ANTHROPIC_API_KEY) return faqAnswer(history[history.length - 1]?.content || "");

  const client = new Anthropic();
  const model = process.env.CLAUDE_MODEL || "claude-opus-5-5";
  try {
    const res = await client.beta.messages.create({
      model,
      max_tokens: 4000,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "low" }, // 짧은 정보성 답변 → 낮은 effort로 비용·지연 절감
      ...(supportsFallback(model)
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
      messages: history.slice(-12).map((t) => ({ role: t.role, content: t.content })),
    });
    if (res.stop_reason === "refusal") {
      return {
        answer: "이 질문은 제가 답변드리기 어려워요. 전문가 상담으로 연결해 드릴게요.",
        suggestConsult: true, topic: "etc", source: "claude",
      };
    }
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    return { ...parseTags(text), source: "claude" };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.APIConnectionError || e instanceof Anthropic.InternalServerError) {
      console.error("[ai] temporary failure, falling back to FAQ", e.message);
      return faqAnswer(history[history.length - 1]?.content || "");
    }
    throw e;
  }
}

// ───────── 키 없을 때 쓰는 FAQ (오프라인/비용 0) ─────────
const FAQ: { keys: string[]; topic: Topic; consult: boolean; answer: string }[] = [
  { keys: ["실손", "실비"], topic: "silson", consult: false,
    answer: "실손보험은 실제 쓴 병원비 중 자기부담금을 뺀 금액을 돌려받는 보험이에요.\n• 통원: 진료비 영수증 + (비급여 있으면) 세부내역서\n• 약국: 약제비 영수증\n• 병원급 이상은 '실손24' 앱으로 서류 없이 청구할 수 있어요.\n진료일로부터 3년 안이면 지난 영수증도 청구 가능해요." },
  { keys: ["수술", "용종", "내시경"], topic: "claim", consult: true,
    answer: "수술비 특약이 있으면 실손과 별개로 정액 수술비를 받을 수 있어요. 내시경 중 용종 제거도 수술로 인정되는 경우가 많아요.\n필요 서류: 수술확인서(수술코드 포함), 영수증, 조직검사 결과지.\n가입한 특약에 따라 금액이 달라서, 증권을 함께 보면 정확하게 확인할 수 있어요." },
  { keys: ["입원", "일당"], topic: "claim", consult: false,
    answer: "입원하셨다면 ① 실손으로 입원 치료비 ② 입원일당 특약으로 하루당 정액을 따로 받을 수 있어요. 퇴원할 때 입퇴원확인서와 영수증을 꼭 받아두세요." },
  { keys: ["골절", "깁스", "금"], topic: "claim", consult: false,
    answer: "뼈에 금이 간 것도 골절진단비 대상이 될 수 있어요. 진단코드가 들어간 진단서나 소견서로 청구해요. 깁스치료비 특약이 따로 있는지도 확인해보세요." },
  { keys: ["교통사고", "자동차", "운전자"], topic: "car", consult: true,
    answer: "교통사고는 자동차보험 처리와 별개로 운전자보험의 부상치료비, 상해입원일당·상해수술비 같은 정액 특약을 추가로 받을 수 있어요. 다만 자동차보험으로 처리한 치료비는 실손에서 중복 보상되지 않아요." },
  { keys: ["치과", "임플란트", "크라운", "치아"], topic: "claim", consult: false,
    answer: "치아보험이 있으면 크라운·임플란트 같은 보철 치료를 보장받을 수 있어요. 가입 초기에는 면책·감액 기간이 있는 경우가 많으니 가입일을 확인해보세요." },
  { keys: ["보험료", "비싸", "부담", "리모델링", "해지"], topic: "premium", consult: true,
    answer: "보험료가 부담된다면 바로 해지하기보다 ① 중복 보장 ② 갱신형 특약 비중 ③ 불필요한 특약을 먼저 점검하는 게 좋아요. 해지 후 재가입은 나이·건강 상태 때문에 더 불리할 수 있어요. 개인 증권을 보면 정확히 판단할 수 있어요." },
  { keys: ["가입", "조회", "모르", "찾"], topic: "coverage", consult: false,
    answer: "내가 가입한 보험은 신용정보원 '내보험다보여'에서 무료로 한 번에 조회할 수 있어요. 받지 않은 숨은 보험금은 '내보험찾아줌'에서 확인할 수 있어요." },
];

export function faqAnswer(q: string): ChatResult {
  const hit = FAQ.find((f) => f.keys.some((k) => q.includes(k)));
  if (hit) return { answer: hit.answer, suggestConsult: hit.consult, topic: hit.topic, source: "faq" };
  return {
    answer: "좋은 질문이에요. 개인 상황에 따라 답이 달라질 수 있어서, 전문가가 직접 확인해드리는 게 정확해요. 아래 '무료 상담 신청'을 눌러주시면 연락드릴게요.",
    suggestConsult: true, topic: "etc", source: "faq",
  };
}
