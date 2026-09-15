import { guest, json } from "@/http";
import { listBounties, listContent } from "@/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const { wallet } = await guest();
  const items = await listContent(wallet);
  const bounties = await listBounties(wallet);
  return json({
    listings: items.slice(0, 6),
    bounties: bounties.filter((b) => b.state === "open").slice(0, 6),
  });
}
