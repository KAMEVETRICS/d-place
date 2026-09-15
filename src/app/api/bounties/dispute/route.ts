import { q, run } from "@/db";
import { json, mustUser, readBody, str } from "@/http";
import { bountyById } from "@/queries";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const bountyId = str(await readBody(req), "bountyId");
  const bounty = await bountyById(bountyId);
  if (!bounty) return json({ error: "Bounty not found." }, 404);
  const winner = (
    await q<{ n: number }>(
      "SELECT COUNT(*) AS n FROM submissions WHERE bounty_id = ? AND submitter_wallet = ? AND status = 'winner'",
      [bountyId, auth.wallet],
    )
  )[0];
  if (bounty.sponsorWallet !== auth.wallet && !Number(winner?.n)) {
    return json({ error: "Only the owner or a winner can open a dispute." }, 403);
  }
  if (bounty.state !== "payout_pending") return json({ error: "Disputes start from payout pending." }, 400);
  await run("UPDATE bounties SET state = 'disputed' WHERE id = ?", [bountyId]);
  return json({ ok: true, state: "disputed" });
}
