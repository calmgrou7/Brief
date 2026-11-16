import { db } from "@/lib/store";
import { json, bad } from "@/lib/http";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await db().get("diagnoses", id);
  if (!row) return bad("결과를 찾을 수 없어요", 404);
  return json({ id: row.id, findings: row.findings, score: row.score });
}
