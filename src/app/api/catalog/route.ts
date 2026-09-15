import { guest, json } from "@/http";
import { listContent } from "@/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const { wallet } = await guest();
  return json({ items: await listContent(wallet) });
}
