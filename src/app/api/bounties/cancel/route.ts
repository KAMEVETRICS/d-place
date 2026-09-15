import { run } from "@/db";
import { json, mustUser, readBody, str } from "@/http";
import { bountyById } from "@/queries";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const bountyId = str(await readBody(req), "bountyId");
  const bounty = await bountyById(bountyId);
  if (!bounty || bounty.sponsorWallet !== auth.wallet) return json({ error: "Bounty not found." }, 404);
  if (bounty.state !== "funding" && bounty.state !== "open") {
    return json({ error: "This bounty can no longer be cancelled." }, 400);
  }
  if (bounty.state === "open" && bounty.submissionCount > 0) {
    return json({ error: "Cancel is only allowed before any submissions." }, 400);
  }
  if (!bounty.funded) {
    await run("UPDATE bounties SET state = 'cancelled' WHERE id = ?", [bountyId]);
    return json({ ok: true, state: "cancelled" });
  }
  return json({
    state: "refund_needed",
    refund: {
      recipient: bounty.sponsorWallet,
      amountLuna: bounty.rewardLuna,
      memo: `dplace:refund:${bountyId}`,
      from: process.env.ESCROW_ADDRESS ?? "demo:escrow",
    },
  });
}
