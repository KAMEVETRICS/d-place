import { q } from "@/db";
import { fileMeta } from "@/files";
import { guest, json } from "@/http";
import { contentById, relatedBounties } from "@/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { wallet } = await guest();
  const { id } = await ctx.params;
  const card = await contentById(id, wallet);
  if (!card) return json({ error: "Listing not found." }, 404);
  const owned = card.owned;
  if (card.status !== "live" && !owned) return json({ error: "Listing not found." }, 404);
  const row = await q<{ body: string; file_id: string | null }>(
    "SELECT body, file_id FROM content WHERE id = ?",
    [id],
  );
  const file = row[0]?.file_id ? await fileMeta(row[0].file_id) : null;
  const related = card.status === "live" ? await relatedBounties(card.category, wallet) : [];
  const lastPay = wallet
    ? (
        await q<{ status: string; tx_hash: string; amount_luna: number }>(
          "SELECT status, tx_hash, amount_luna FROM purchases WHERE buyer_wallet = ? AND content_id = ? ORDER BY created_at DESC LIMIT 1",
          [wallet, id],
        )
      )[0]
    : undefined;
  return json({
    item: {
      ...card,
      owned,
      body: owned ? row[0]?.body ?? null : null,
      fileId: owned ? row[0]?.file_id ?? null : null,
      fileName: owned ? file?.filename ?? null : null,
      fileMime: owned ? file?.mime ?? null : null,
    },
    relatedBounties: related,
    pending: lastPay && lastPay.status !== "confirmed" ? { status: lastPay.status, txHash: lastPay.tx_hash } : null,
    receipt:
      owned && lastPay?.status === "confirmed"
        ? { amountLuna: Number(lastPay.amount_luna), txHash: lastPay.tx_hash }
        : null,
  });
}
