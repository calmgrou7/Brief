import { db } from "@/lib/store";
import { json, bad, isAdmin } from "@/lib/http";

const STATUSES = ["new", "contacted", "consulting", "contracted", "lost"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return bad("unauthorized", 401);
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (STATUSES.includes(b.status)) patch.status = b.status;
  if (typeof b.memo === "string") patch.memo = b.memo.slice(0, 2000);
  const row = await db().update("leads", id, patch);
  return row ? json(row) : bad("not found", 404);
}
