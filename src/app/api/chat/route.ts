import { db } from "@/lib/store";
import { answerQuestion, type ChatTurn } from "@/lib/ai";
import { normalizeChannel } from "@/lib/config";
import { json, bad } from "@/lib/http";

// 휴대폰번호·주민번호 패턴은 저장 전에 가립니다(질문 데이터는 콘텐츠 재활용 대상).
const mask = (s: string) =>
  s.replace(/01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g, "[전화번호]").replace(/\d{6}[-\s]?[1-4]\d{6}/g, "[주민번호]");

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const history = (body?.history || []) as ChatTurn[];
  const last = history[history.length - 1];
  if (!last || last.role !== "user" || !last.content?.trim()) return bad("질문을 입력해주세요");
  if (last.content.length > 1000) return bad("질문은 1000자 이내로 입력해주세요");

  const clean = history.map((t) => ({ role: t.role, content: mask(String(t.content).slice(0, 2000)) }));
  const result = await answerQuestion(clean);

  const base = {
    anon_id: String(body.anonId || "").slice(0, 64) || null,
    session_id: String(body.sessionId || "").slice(0, 64) || null,
    channel: normalizeChannel(body.channel),
  };
  const s = db();
  await s.insert("chat_messages", { ...base, role: "user", content: clean[clean.length - 1].content, topic: result.topic });
  await s.insert("chat_messages", { ...base, role: "assistant", content: result.answer, topic: result.topic, suggest_consult: result.suggestConsult });

  return json(result);
}
