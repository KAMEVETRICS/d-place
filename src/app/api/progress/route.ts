import { q, run } from "@/db";
import { json, mustUser, readBody, str } from "@/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const body = await readBody(req);
  const contentId = str(body, "contentId");
  const percent = Math.max(0, Math.min(100, Number(body.percent ?? 0)));
  const owned = await q<{ n: number }>(
    "SELECT COUNT(*) AS n FROM entitlements WHERE wallet = ? AND content_id = ?",
    [auth.wallet, contentId],
  );
  if (!owned[0]?.n) return json({ error: "Unlock this listing first." }, 403);
  await run(
    `INSERT INTO progress (wallet, content_id, percent) VALUES (?, ?, ?)
     ON CONFLICT(wallet, content_id) DO UPDATE SET percent = excluded.percent`,
    [auth.wallet, contentId, percent],
  );
  return json({ percent });
}
