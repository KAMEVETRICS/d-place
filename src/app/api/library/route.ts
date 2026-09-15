import { q } from "@/db";
import { json, mustUser } from "@/http";
import { listOwnedContent } from "@/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const items = await listOwnedContent(auth.wallet);
  const progress = await q<{ content_id: string; percent: number }>(
    "SELECT content_id, percent FROM progress WHERE wallet = ?",
    [auth.wallet],
  );
  return json({ items, progress });
}
