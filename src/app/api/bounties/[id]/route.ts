import { fundIntent } from "@/escrow";
import { guest, json } from "@/http";
import { bountyById, expireOpenBounties, payoutsFor, submissionsFor } from "@/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { wallet } = await guest();
  const { id } = await ctx.params;
  await expireOpenBounties();
  const bounty = await bountyById(id, wallet);
  if (!bounty) return json({ error: "Bounty not found." }, 404);
  if (bounty.state === "funding" && bounty.sponsorWallet !== wallet) {
    return json({ error: "Bounty not found." }, 404);
  }
  const all = await submissionsFor(id);
  const subs =
    wallet === bounty.sponsorWallet || bounty.state !== "open"
      ? all
      : all.filter((s) => s.submitterWallet === wallet);
  const intent = bounty.state === "funding" ? fundIntent(bounty.id, bounty.rewardLuna) : null;
  return json({
    bounty,
    submissions: subs,
    fund: intent,
    payouts: await payoutsFor(id),
  });
}
