// AI 상담 질문 모음 — 주제별 집계. 커뮤니티·SEO 콘텐츠 기획용.
import { db } from "@/lib/store";
import { json, bad, isAdmin } from "@/lib/http";

export async function GET(req: Request) {
  if (!isAdmin(req)) return bad("unauthorized", 401);
  const rows = await db().list("chat_messages", { eq: { role: "user" }, limit: 2000 });
  const byTopic: Record<string, number> = {};
  for (const r of rows) byTopic[String(r.topic || "etc")] = (byTopic[String(r.topic || "etc")] || 0) + 1;
  return json({ total: rows.length, byTopic, recent: rows.slice(0, 100).map((r) => ({ content: r.content, topic: r.topic, channel: r.channel, created_at: r.created_at })) });
}
