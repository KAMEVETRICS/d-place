import { q } from "@/db";
import { boot, json } from "@/http";
import { listContent, profileStats } from "@/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ username: string }> }) {
  await boot();
  const { username } = await ctx.params;
  const row = await q<{ wallet: string }>("SELECT wallet FROM profiles WHERE username = ?", [username]);
  if (!row[0]) return json({ error: "No one with that username." }, 404);
  const stats = await profileStats(row[0].wallet);
  const listings = (await listContent(null)).filter((c) => c.creatorWallet === row[0].wallet);
  const wins = await q<{ bounty_id: string; title: string }>(
    `SELECT s.bounty_id, b.title FROM submissions s JOIN bounties b ON b.id = s.bounty_id
     WHERE s.submitter_wallet = ? AND s.status = 'winner'`,
    [row[0].wallet],
  );
  return json({ profile: stats, listings, wins });
}
