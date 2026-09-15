import { randomUUID } from "node:crypto";
import { run } from "@/db";
import { json, mustUser, readBody, str, track } from "@/http";
import { bountyById, payoutsFor, submissionsFor } from "@/queries";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const body = await readBody(req);
  const bountyId = str(body, "bountyId");
  const winnerIds = Array.isArray(body.winnerIds) ? body.winnerIds.map(String) : [];
  const bounty = await bountyById(bountyId);
  if (!bounty || bounty.sponsorWallet !== auth.wallet) return json({ error: "Bounty not found." }, 404);
  if (bounty.state !== "review") return json({ error: "Select winners during review." }, 400);
  if (winnerIds.length < 1 || winnerIds.length > bounty.winnerCount) {
    return json({ error: `Pick between 1 and ${bounty.winnerCount} winner(s).` }, 400);
  }
  const subs = await submissionsFor(bountyId);
  const selected = subs.filter((s) => winnerIds.includes(s.id) && s.status === "submitted");
  if (selected.length !== winnerIds.length) return json({ error: "One of those submissions is not eligible." }, 400);
  const share = Math.floor(bounty.rewardLuna / selected.length);
  const remainder = bounty.rewardLuna - share * selected.length;
  for (const sub of subs) {
    await run("UPDATE submissions SET status = ? WHERE id = ?", [
      winnerIds.includes(sub.id) ? "winner" : "not_selected",
      sub.id,
    ]);
  }
  for (const [i, sub] of selected.entries()) {
    await run(
      `INSERT INTO payouts (id, bounty_id, recipient_wallet, amount_luna, status) VALUES (?, ?, ?, ?, 'pending')`,
      [randomUUID(), bountyId, sub.submitterWallet, share + (i === 0 ? remainder : 0)],
    );
  }
  await run("UPDATE bounties SET state = 'payout_pending' WHERE id = ?", [bountyId]);
  await track(auth.wallet, "winners_selected", { bountyId, count: selected.length });
  return json({
    payouts: await payoutsFor(bountyId),
    from: bounty.fundTx ? process.env.ESCROW_ADDRESS ?? "demo:escrow" : auth.wallet,
  });
}
