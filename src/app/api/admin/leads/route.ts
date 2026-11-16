import { db, usingSupabase } from "@/lib/store";
import { json, bad, isAdmin } from "@/lib/http";

export async function GET(req: Request) {
  if (!isAdmin(req)) return bad("unauthorized", 401);
  const s = db();
  const [leads, events, privacy] = await Promise.all([
    s.list("leads", { limit: 1000 }),
    s.list("events", { limit: 5000 }),
    s.list("privacy_requests", { eq: { status: "pending" }, limit: 100 }),
  ]);
  // 퍼널 (최근 이벤트 기준, 고유 방문자 수)
  const uniq = (n: string) => new Set(events.filter((e) => e.name === n).map((e) => e.anon_id)).size;
  const funnel = ["page_view", "check_start", "check_complete", "lead_form_view", "lead_submit"].map((n) => ({ name: n, count: uniq(n) }));
  const byChannel: Record<string, number> = {};
  for (const l of leads) byChannel[String(l.first_channel || "web")] = (byChannel[String(l.first_channel || "web")] || 0) + 1;
  return json({ leads, funnel, byChannel, privacyPending: privacy, storage: usingSupabase() ? "supabase" : "local-file" });
}
