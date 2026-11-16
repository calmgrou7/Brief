import { db } from "@/lib/store";
import { bad, isAdmin } from "@/lib/http";

const COLS = ["created_at", "name", "phone", "birth_year", "grade", "score", "status", "interest", "first_channel", "channels", "utm_source", "utm_campaign", "marketing_opt_in", "third_party_opt_in", "memo_customer", "memo"];

export async function GET(req: Request) {
  if (!isAdmin(req)) return bad("unauthorized", 401);
  const leads = await db().list("leads", { limit: 10000 });
  const esc = (v: unknown) => `"${(Array.isArray(v) ? v.join("|") : v ?? "").toString().replace(/"/g, '""')}"`;
  const csv = "﻿" + [COLS.join(","), ...leads.map((l) => COLS.map((c) => esc(l[c])).join(","))].join("\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
