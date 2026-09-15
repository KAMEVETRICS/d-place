import { q, run } from "@/db";
import { json, mustUser, readBody, str } from "@/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const contentId = str(await readBody(req), "id");
  const row = await q<{ creator_wallet: string; status: string }>(
    "SELECT creator_wallet, status FROM content WHERE id = ?",
    [contentId],
  );
  if (!row[0] || row[0].creator_wallet !== auth.wallet) return json({ error: "Listing not found." }, 404);
  if (row[0].status !== "live") return json({ error: "That listing is already off the stall." }, 400);
  await run("UPDATE content SET status = 'delisted' WHERE id = ?", [contentId]);
  return json({ ok: true });
}
