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
  if (bounty.state !== "open") return json({ error: "Only open bounties can move to review." }, 400);
  await run("UPDATE bounties SET state = 'review' WHERE id = ?", [bountyId]);
  return json({ ok: true, state: "review" });
}
