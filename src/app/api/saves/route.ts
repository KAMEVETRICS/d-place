import { q, run } from "@/db";
import { json, mustUser, readBody, str } from "@/http";
import { bountyById, contentById, savedIds } from "@/queries";
import type { BountyCard, ContentCard } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const cids = [...(await savedIds(auth.wallet, "content"))];
  const bids = [...(await savedIds(auth.wallet, "bounty"))];
  const listings: ContentCard[] = [];
  for (const id of cids) {
    const c = await contentById(id, auth.wallet);
    if (c) listings.push(c);
  }
  const bounties: BountyCard[] = [];
  for (const id of bids) {
    const b = await bountyById(id, auth.wallet);
    if (b) bounties.push(b);
  }
  return json({ listings, bounties });
}

export async function POST(req: Request) {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const body = await readBody(req);
  const kind = body.kind === "bounty" ? "bounty" : body.kind === "content" ? "content" : "";
  const id = str(body, "id");
  if (kind !== "content" && kind !== "bounty") {
    return json({ error: "Save a listing or a bounty." }, 400);
  }
  if (!id) return json({ error: "Missing id." }, 400);
  if (kind === "content") {
    const c = await contentById(id, auth.wallet);
    if (!c) return json({ error: "Listing not found." }, 404);
  } else {
    const b = await bountyById(id, auth.wallet);
    if (!b) return json({ error: "Bounty not found." }, 404);
  }
  const existing = await q<{ target_id: string }>(
    "SELECT target_id FROM saves WHERE wallet = ? AND kind = ? AND target_id = ?",
    [auth.wallet, kind, id],
  );
  if (existing[0]) {
    await run("DELETE FROM saves WHERE wallet = ? AND kind = ? AND target_id = ?", [auth.wallet, kind, id]);
    return json({ saved: false });
  }
  await run("INSERT INTO saves (wallet, kind, target_id, created_at) VALUES (?, ?, ?, ?)", [
    auth.wallet,
    kind,
    id,
    Date.now(),
  ]);
  return json({ saved: true });
}
