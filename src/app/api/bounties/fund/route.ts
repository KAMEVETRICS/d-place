import { run } from "@/db";
import { fundIntent, verifyFunding } from "@/escrow";
import { json, mustUser, readBody, str, track } from "@/http";
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
  if (bounty.state !== "funding") return json({ error: "This bounty is already funded." }, 400);
  const ok = await verifyFunding({
    bountyId,
    txHash,
    from: auth.wallet,
    amountLuna: bounty.rewardLuna,
  });
  if (!ok) return json({ error: "Prize funding is not confirmed on chain yet." }, 400);
  await run("UPDATE bounties SET state = 'open', fund_tx = ?, escrow_ref = ? WHERE id = ?", [
    txHash,
    fundIntent(bountyId, bounty.rewardLuna).recipient,
    bountyId,
  ]);
  await track(auth.wallet, "bounty_funded", { bountyId, txHash });
  return json({ ok: true, state: "open" });
}
