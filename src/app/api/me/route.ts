import { json, mustUser } from "@/http";
import { creatorSales, profileStats, sponsorBounties, stallStats } from "@/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  return json({
    profile: await profileStats(auth.wallet),
    sales: await creatorSales(auth.wallet),
    bounties: await sponsorBounties(auth.wallet),
    stats: await stallStats(),
  });
}
