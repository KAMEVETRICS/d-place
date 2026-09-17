import { run } from "@/db";
import { escrowAddress } from "@/escrow";
import { json, mustUser, readBody, str } from "@/http";
import { bountyById } from "@/queries";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const body = await readBody(req);
  const bountyId = str(body, "bountyId");
  const action = str(body, "action");
  const bounty = await bountyById(bountyId);
  if (!bounty || bounty.sponsorWallet !== auth.wallet) return json({ error: "Bounty not found." }, 404);
  if (bounty.state !== "disputed") return json({ error: "Nothing to resolve." }, 400);
  if (action === "paid") {
    await run("UPDATE bounties SET state = 'paid' WHERE id = ?", [bountyId]);
    return json({ ok: true, state: "paid" });
  }
  if (action === "refund") {
    return json({
      state: "refund_needed",
      refund: {
        recipient: bounty.sponsorWallet,
        amountLuna: bounty.rewardLuna,
        memo: `dplace:refund:${bountyId}`,
        from: escrowAddress(),
      },
    });
  }
  return json({ error: "Resolve as paid or refund." }, 400);
}
