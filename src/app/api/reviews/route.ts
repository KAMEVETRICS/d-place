import { randomUUID } from "node:crypto";
import { q, run } from "@/db";
import { json, mustUser, readBody, str } from "@/http";
import { contentById } from "@/queries";
import { LIMIT, tooLong } from "@/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const body = await readBody(req);
  const targetType = str(body, "targetType");
  const targetId = str(body, "targetId");
  const rating = Math.floor(Number(body.rating));
  const text = str(body, "text").trim();
  if (targetType !== "content" || !targetId) return json({ error: "Reviews are for listings." }, 400);
  if (rating < 1 || rating > 5) return json({ error: "Rating must be 1 to 5." }, 400);
  const textErr = tooLong("Review", text, LIMIT.review);
  if (textErr) return json({ error: textErr }, 400);
  const listing = await contentById(targetId, auth.wallet);
  if (!listing) return json({ error: "Listing not found." }, 404);
  const owned = await q<{ n: number }>(
    "SELECT COUNT(*) AS n FROM entitlements WHERE wallet = ? AND content_id = ?",
    [auth.wallet, targetId],
  );
  if (!owned[0]?.n) return json({ error: "Unlock the listing before rating it." }, 403);
  await run(
    `INSERT INTO reviews (id, reviewer_wallet, target_type, target_id, rating, text, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(reviewer_wallet, target_type, target_id) DO UPDATE SET rating = excluded.rating, text = excluded.text`,
    [randomUUID(), auth.wallet, targetType, targetId, rating, text, Date.now()],
  );
  return json({ ok: true });
}
