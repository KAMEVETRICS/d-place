import { q, run } from "@/db";
import { escrowAddress, verifyPayout } from "@/escrow";
import { json, mustUser, readBody, str, track } from "@/http";
import { bountyById } from "@/queries";
import { txHashOk } from "@/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const body = await readBody(req);
  const bountyId = str(body, "bountyId");
  const payoutId = str(body, "payoutId");
  const txHash = str(body, "txHash");
  const hashErr = txHashOk(txHash);
  if (hashErr) return json({ error: hashErr }, 400);
  const bounty = await bountyById(bountyId);
  if (!bounty || bounty.sponsorWallet !== auth.wallet) return json({ error: "Bounty not found." }, 404);
  const payout = (
    await q<{ id: string; recipient_wallet: string; amount_luna: number; status: string }>(
      "SELECT id, recipient_wallet, amount_luna, status FROM payouts WHERE id = ? AND bounty_id = ?",
      [payoutId, bountyId],
    )
  )[0];
  if (!payout || payout.status === "paid") return json({ error: "Payout not found." }, 404);
  const ok = await verifyPayout({
    bountyId,
    txHash,
    from: bounty.fundTx ? escrowAddress() : auth.wallet,
    to: payout.recipient_wallet,
    amountLuna: Number(payout.amount_luna),
  });
  if (!ok) return json({ error: "Payout is not confirmed on chain yet." }, 400);
  await run("UPDATE payouts SET status = 'paid', tx_ref = ? WHERE id = ?", [txHash, payoutId]);
  const unpaid = await q<{ n: number }>(
    "SELECT COUNT(*) AS n FROM payouts WHERE bounty_id = ? AND status != 'paid'",
    [bountyId],
  );
  if (!Number(unpaid[0]?.n)) {
    await run("UPDATE bounties SET state = 'paid' WHERE id = ?", [bountyId]);
  }
  await track(auth.wallet, "payout", { bountyId, payoutId, txHash });
  return json({ ok: true, bountyState: !Number(unpaid[0]?.n) ? "paid" : "payout_pending" });
}
