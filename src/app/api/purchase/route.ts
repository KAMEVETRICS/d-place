import { randomUUID } from "node:crypto";
import { isNimiqAddress } from "@/address";
import { q, run } from "@/db";
import { verifyPurchase } from "@/escrow";
import { json, mustUser, readBody, str, track } from "@/http";
import { txHashOk } from "@/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const body = await readBody(req);
  const contentId = str(body, "contentId");
  const txHash = str(body, "txHash");
  const hashErr = txHashOk(txHash);
  if (hashErr) return json({ error: hashErr }, 400);
  const item = (
    await q<{ id: string; creator_wallet: string; price_luna: number }>(
      "SELECT id, creator_wallet, price_luna FROM content WHERE id = ? AND status = 'live'",
      [contentId],
    )
  )[0];
  if (!item) return json({ error: "Listing not found." }, 404);
  if (item.creator_wallet === auth.wallet) return json({ error: "You already own your own listing." }, 400);
  if (isNimiqAddress(auth.wallet) && !isNimiqAddress(item.creator_wallet)) {
    return json(
      { error: "This listing is a demo stall. Real NIM has to go to an NQ address. Publish one from your Hub wallet." },
      400,
    );
  }
  const existing = (
    await q<{ id: string; status: string }>("SELECT id, status FROM purchases WHERE tx_hash = ?", [txHash])
  )[0];
  if (existing?.status === "confirmed") return json({ id: existing.id, owned: true });
  const ok = await verifyPurchase({
    contentId,
    txHash,
    from: auth.wallet,
    to: item.creator_wallet,
    amountLuna: Number(item.price_luna),
  });
  if (!ok) {
    if (!existing) {
      await run(
        `INSERT INTO purchases (id, buyer_wallet, content_id, tx_hash, amount_luna, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        [randomUUID(), auth.wallet, contentId, txHash, Number(item.price_luna), Date.now()],
      );
    }
    return json({ status: "pending", owned: false });
  }
  const id = existing?.id ?? randomUUID();
  if (existing) {
    await run("UPDATE purchases SET status = 'confirmed' WHERE id = ?", [id]);
  } else {
    await run(
      `INSERT INTO purchases (id, buyer_wallet, content_id, tx_hash, amount_luna, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'confirmed', ?)`,
      [id, auth.wallet, contentId, txHash, Number(item.price_luna), Date.now()],
    );
  }
  await run(
    `INSERT OR IGNORE INTO entitlements (wallet, content_id, purchase_id, granted_at) VALUES (?, ?, ?, ?)`,
    [auth.wallet, contentId, id, Date.now()],
  );
  await track(auth.wallet, "purchase", { contentId, txHash });
  return json({ id, owned: true, status: "confirmed" });
}
