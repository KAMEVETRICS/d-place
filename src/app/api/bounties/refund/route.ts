import { run } from "@/db";
import { verifyRefund } from "@/escrow";
import { json, mustUser, readBody, str } from "@/http";
import { bountyById } from "@/queries";
import { txHashOk } from "@/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const body = await readBody(req);
  const bountyId = str(body, "bountyId");
  const txHash = str(body, "txHash");
  const hashErr = txHashOk(txHash);
  if (hashErr) return json({ error: hashErr }, 400);
  const bounty = await bountyById(bountyId);
  if (!bounty || bounty.sponsorWallet !== auth.wallet) return json({ error: "Bounty not found." }, 404);
  if (!["open", "funding", "disputed", "payout_pending"].includes(bounty.state)) {
    return json({ error: "This bounty cannot be refunded." }, 400);
  }
  const from =
    process.env.ESCROW_ADDRESS && process.env.ESCROW_ADDRESS !== "demo:escrow"
      ? process.env.ESCROW_ADDRESS
      : auth.wallet;
  const ok = await verifyRefund({
    bountyId,
    txHash,
    from,
    to: bounty.sponsorWallet,
    amountLuna: bounty.rewardLuna,
  });
  if (!ok) return json({ error: "Refund is not confirmed on chain yet." }, 400);
  await run("UPDATE bounties SET state = 'refunded' WHERE id = ?", [bountyId]);
  return json({ ok: true, state: "refunded" });
}
