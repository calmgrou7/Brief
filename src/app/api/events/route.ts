import { db } from "@/lib/store";
import { normalizeChannel } from "@/lib/config";
import { json } from "@/lib/http";

const ALLOWED = new Set(["page_view", "check_start", "check_complete", "result_view", "lead_form_view", "otp_sent", "lead_submit", "chat_open", "consult_click", "claim_guide_view"]);

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || !ALLOWED.has(b.name)) return json({ ok: false });
  const s = db();
  const anon = String(b.anonId || "").slice(0, 64) || null;
  await s.insert("events", { anon_id: anon, name: b.name, channel: normalizeChannel(b.channel), path: String(b.path || "").slice(0, 200), props: b.props || {} });
  if (b.name === "page_view" && b.first && anon) {
    await s.insert("visitors", { anon_id: anon, channel: normalizeChannel(b.channel), utm: b.utm || {}, referrer: String(b.referrer || "").slice(0, 300) || null });
  }
  return json({ ok: true });
}
