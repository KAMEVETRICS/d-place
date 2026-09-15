import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  clearSession,
  consumeChallenge,
  createSession,
  issueChallenge,
  loginMessage,
  profileFor,
  readSession,
  validUsername,
  verifyLogin,
} from "@/auth";
import { migrate, q, run } from "@/db";
import { escrowAddress, fundIntent, verifyFunding, verifyPayout, verifyPurchase, verifyRefund } from "@/escrow";
import { nimToLuna } from "@/money";
import {
  bountyById,
  creatorSales,
  expireOpenBounties,
  contentById,
  listBounties,
  listContent,
  listOwnedContent,
  profileStats,
  relatedBounties,
  savedIds,
  sponsorBounties,
  stallStats,
  submissionsFor,
} from "@/queries";
import type { BountyCard, ContentCard, ContentType } from "@/types";
import { isNimiqAddress } from "@/address";
import { parseCategory } from "@/categories";
import { fileMeta, ownedFileId } from "@/files";
import { LIMIT, httpUrl, nimCap, tooLong, txHashOk, winnersCap } from "@/validate";


export const dynamic = "force-dynamic";

let ready: Promise<void> | null = null;
function boot() {
  ready ??= migrate();
  return ready;
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function pathOf(params: { path?: string[] }) {
  return (params.path ?? []).join("/");
}

async function bodyOf(req: Request) {
  return (await req.json()) as Record<string, string | number | string[]>;
}

async function authed() {
  const wallet = await readSession();
  if (!wallet) return { wallet: null, profile: null };
  return { wallet, profile: await profileFor(wallet) };
}

function needUser(wallet: string | null, hasProfile: boolean) {
  if (!wallet) return json({ error: "Connect a wallet first." }, 401);
  if (!hasProfile) return json({ error: "Pick a username to continue." }, 403);
  return null;
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  await boot();
  const path = pathOf(await ctx.params);
  const { wallet, profile } = await authed();

  if (path === "session") {
    const stats = wallet ? await profileStats(wallet) : null;
    return json({
      wallet,
      username: profile?.username ?? null,
      demo: process.env.DEMO_PAYMENTS === "1",
      profile: stats,
    });
  }

  if (path === "challenge") {
    const nonce = await issueChallenge();
    return json({ nonce, message: loginMessage(nonce) });
  }

  if (path === "catalog") {
    return json({ items: await listContent(wallet) });
  }

  if (path.startsWith("content/")) {
    const id = path.slice("content/".length);
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

  if (path === "saves") {
    const gate = needUser(wallet, Boolean(profile));
    if (gate) return gate;
    const cids = [...(await savedIds(wallet!, "content"))];
    const bids = [...(await savedIds(wallet!, "bounty"))];
    const listings: ContentCard[] = [];
    for (const id of cids) {
      const c = await contentById(id, wallet);
      if (c) listings.push(c);
    }
    const bounties: BountyCard[] = [];
    for (const id of bids) {
      const b = await bountyById(id, wallet);
      if (b) bounties.push(b);
    }
    return json({ listings, bounties });
  }

  if (path === "library") {
    const gate = needUser(wallet, Boolean(profile));
    if (gate) return gate;
    const items = await listOwnedContent(wallet!);
    const progress = await q<{ content_id: string; percent: number }>(
      "SELECT content_id, percent FROM progress WHERE wallet = ?",
      [wallet!],
    );
    return json({ items, progress });
  }

  if (path === "bounties") {
    await expireOpenBounties();
    return json({ items: await listBounties(wallet) });
  }

  if (path.startsWith("bounties/")) {
    const id = path.slice("bounties/".length);
    await expireOpenBounties();
    const bounty = await bountyById(id, wallet);
    if (!bounty) return json({ error: "Bounty not found." }, 404);
    if (bounty.state === "funding" && bounty.sponsorWallet !== wallet) {
      return json({ error: "Bounty not found." }, 404);
    }
    const subs =
      wallet === bounty.sponsorWallet || bounty.state !== "open"
        ? await submissionsFor(id)
        : (await submissionsFor(id)).filter((s) => s.submitterWallet === wallet);
    const intent =
      bounty.state === "funding" ? fundIntent(bounty.id, bounty.rewardLuna) : null;
    return json({ bounty, submissions: subs, fund: intent });
  }

  if (path === "me") {
    const gate = needUser(wallet, Boolean(profile));
    if (gate) return gate;
    return json({
      profile: await profileStats(wallet!),
      sales: await creatorSales(wallet!),
      bounties: await sponsorBounties(wallet!),
      stats: await stallStats(),
    });
  }

  if (path.startsWith("u/")) {
    const username = path.slice("u/".length);
    const row = await q<{ wallet: string }>("SELECT wallet FROM profiles WHERE username = ?", [
      username,
    ]);
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

  if (path === "feed") {
    const items = await listContent(wallet);
    const bounties = await listBounties(wallet);
    return json({
      listings: items.slice(0, 6),
      bounties: bounties.filter((b) => b.state === "open").slice(0, 6),
    });
  }

  return json({ error: "Unknown route." }, 404);
}

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  await boot();
  const path = pathOf(await ctx.params);
  const { wallet, profile } = await authed();
  const body = await bodyOf(req).catch(() => ({}) as Record<string, string | number | string[]>);

  if (path === "session") {
    const w = String(body.wallet ?? "");
    const nonce = String(body.nonce ?? "");
    const signature = String(body.signature ?? "");
    const publicKey = String(body.publicKey ?? "");
    if (!w || !nonce || !signature) return json({ error: "Wallet, nonce, and signature are required." }, 400);
    if (!(await consumeChallenge(nonce))) return json({ error: "Login challenge expired. Try again." }, 400);
    if (!(await verifyLogin({ wallet: w, nonce, signature, publicKey }))) {
      return json({ error: "Could not verify that wallet signature." }, 401);
    }
    await createSession(w);
    const existing = await profileFor(w);
    return json({ wallet: w, username: existing?.username ?? null });
  }

  if (path === "logout") {
    await clearSession();
    return json({ ok: true });
  }

  if (path === "profile") {
    if (!wallet) return json({ error: "Connect a wallet first." }, 401);
    const username = String(body.username ?? "").trim().toLowerCase();
    const displayName = String(body.displayName ?? username);
    const bio = String(body.bio ?? "");
    if (!validUsername(username)) {
      return json({ error: "Username must be 3-20 characters: a-z, 0-9, underscore." }, 400);
    }
    const existing = await profileFor(wallet);
    if (existing) {
      await run("UPDATE profiles SET display_name = ?, bio = ? WHERE wallet = ?", [
        displayName.slice(0, 40),
        bio.slice(0, 280),
        wallet,
      ]);
    } else {
      try {
        await run(
          "INSERT INTO profiles (wallet, username, display_name, bio, created_at) VALUES (?, ?, ?, ?, ?)",
          [wallet, username, displayName.slice(0, 40), bio.slice(0, 280), Date.now()],
        );
      } catch {
        return json({ error: "That username is taken." }, 409);
      }
    }
    return json({ profile: await profileStats(wallet) });
  }

  const gate = needUser(wallet, Boolean(profile));
  if (gate) return gate;

  if (path === "saves") {
    const kind = body.kind === "bounty" ? "bounty" : body.kind === "content" ? "content" : "";
    const id = String(body.id ?? "");
    if (kind !== "content" && kind !== "bounty") {
      return json({ error: "Save a listing or a bounty." }, 400);
    }
    if (!id) return json({ error: "Missing id." }, 400);
    if (kind === "content") {
      const c = await contentById(id, wallet);
      if (!c) return json({ error: "Listing not found." }, 404);
    } else {
      const b = await bountyById(id, wallet);
      if (!b) return json({ error: "Bounty not found." }, 404);
    }
    const existing = await q<{ target_id: string }>(
      "SELECT target_id FROM saves WHERE wallet = ? AND kind = ? AND target_id = ?",
      [wallet!, kind, id],
    );
    if (existing[0]) {
      await run("DELETE FROM saves WHERE wallet = ? AND kind = ? AND target_id = ?", [wallet!, kind, id]);
      return json({ saved: false });
    }
    await run("INSERT INTO saves (wallet, kind, target_id, created_at) VALUES (?, ?, ?, ?)", [
      wallet!,
      kind,
      id,
      Date.now(),
    ]);
    return json({ saved: true });
  }

  if (path === "content") {
    const type = String(body.type ?? "") as ContentType;
    if (!["course", "guide", "template"].includes(type)) {
      return json({ error: "Type must be course, guide, or template." }, 400);
    }
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const category = parseCategory(String(body.category ?? ""));
    const preview = String(body.preview ?? "").trim();
    const contentBody = String(body.body ?? "").trim();
    const fileId = String(body.fileId ?? "").trim() || null;
    const priceNim = Number(body.priceNim);
    if (!title || !description || !preview || !contentBody) {
      return json({ error: "Title, description, preview, and body are required." }, 400);
    }
    const long =
      tooLong("Title", title, LIMIT.title) ||
      tooLong("Description", description, LIMIT.description) ||
      tooLong("Preview", preview, LIMIT.preview) ||
      tooLong("Body", contentBody, LIMIT.body);
    if (long) return json({ error: long }, 400);
    const priceErr = nimCap(priceNim, 0);
    if (priceErr) return json({ error: priceErr }, 400);
    const file = await ownedFileId(wallet!, fileId);
    if ("error" in file) return json({ error: file.error }, 400);
    const dup = await q<{ n: number }>(
      "SELECT COUNT(*) AS n FROM content WHERE creator_wallet = ? AND lower(trim(title)) = lower(?) AND status = 'live'",
      [wallet!, title],
    );
    if (Number(dup[0]?.n)) {
      return json({ error: "You already have a live listing with that title." }, 409);
    }
    const id = randomUUID();
    await run(
      `INSERT INTO content (id, creator_wallet, type, title, description, category, price_luna, preview, body, status, file_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'live', ?, ?)`,
      [id, wallet!, type, title, description, category, nimToLuna(priceNim), preview, contentBody, file.id, Date.now()],
    );
    await track(wallet!, "content_published", { id });
    return json({ id });
  }

  if (path === "content/delist") {
    const contentId = String(body.id ?? "");
    const row = await q<{ creator_wallet: string; status: string }>(
      "SELECT creator_wallet, status FROM content WHERE id = ?",
      [contentId],
    );
    if (!row[0] || row[0].creator_wallet !== wallet) return json({ error: "Listing not found." }, 404);
    if (row[0].status !== "live") return json({ error: "That listing is already off the stall." }, 400);
    await run("UPDATE content SET status = 'delisted' WHERE id = ?", [contentId]);
    return json({ ok: true });
  }

  if (path === "purchase") {
    const contentId = String(body.contentId ?? "");
    const txHash = String(body.txHash ?? "");
    const hashErr = txHashOk(txHash);
    if (hashErr) return json({ error: hashErr }, 400);
    const item = (
      await q<{ id: string; creator_wallet: string; price_luna: number }>(
        "SELECT id, creator_wallet, price_luna FROM content WHERE id = ? AND status = 'live'",
        [contentId],
      )
    )[0];
    if (!item) return json({ error: "Listing not found." }, 404);
    if (item.creator_wallet === wallet) return json({ error: "You already own your own listing." }, 400);
    if (isNimiqAddress(wallet!) && !isNimiqAddress(item.creator_wallet)) {
      return json(
        { error: "This listing is a demo stall. Real NIM has to go to an NQ address. Publish one from your Hub wallet." },
        400,
      );
    }
    const existing = (
      await q<{ id: string; status: string }>(
        "SELECT id, status FROM purchases WHERE tx_hash = ?",
        [txHash],
      )
    )[0];
    if (existing?.status === "confirmed") return json({ id: existing.id, owned: true });
    const ok = await verifyPurchase({
      contentId,
      txHash,
      from: wallet!,
      to: item.creator_wallet,
      amountLuna: Number(item.price_luna),
    });
    if (!ok) {
      if (!existing) {
        await run(
          `INSERT INTO purchases (id, buyer_wallet, content_id, tx_hash, amount_luna, status, created_at)
           VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
          [randomUUID(), wallet!, contentId, txHash, Number(item.price_luna), Date.now()],
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
        [id, wallet!, contentId, txHash, Number(item.price_luna), Date.now()],
      );
    }
    await run(
      `INSERT OR IGNORE INTO entitlements (wallet, content_id, purchase_id, granted_at) VALUES (?, ?, ?, ?)`,
      [wallet!, contentId, id, Date.now()],
    );
    await track(wallet!, "purchase", { contentId, txHash });
    return json({ id, owned: true, status: "confirmed" });
  }

  if (path === "progress") {
    const contentId = String(body.contentId ?? "");
    const percent = Math.max(0, Math.min(100, Number(body.percent ?? 0)));
    const owned = await q<{ n: number }>(
      "SELECT COUNT(*) AS n FROM entitlements WHERE wallet = ? AND content_id = ?",
      [wallet!, contentId],
    );
    if (!owned[0]?.n) return json({ error: "Unlock this listing first." }, 403);
    await run(
      `INSERT INTO progress (wallet, content_id, percent) VALUES (?, ?, ?)
       ON CONFLICT(wallet, content_id) DO UPDATE SET percent = excluded.percent`,
      [wallet!, contentId, percent],
    );
    return json({ percent });
  }

  if (path === "bounties") {
    const title = String(body.title ?? "").trim();
    const brief = String(body.brief ?? "").trim();
    const category = parseCategory(String(body.category ?? ""));
    const deliverables = String(body.deliverables ?? "").trim();
    const winnerCount = Math.floor(Number(body.winnerCount));
    const rewardNim = Number(body.rewardNim);
    const deadline = Number(body.deadline);
    if (!title || !brief || !deliverables) {
      return json({ error: "Title, brief, category, and deliverables are required." }, 400);
    }
    const long =
      tooLong("Title", title, LIMIT.title) ||
      tooLong("Brief", brief, LIMIT.brief) ||
      tooLong("Deliverables", deliverables, LIMIT.deliverables);
    if (long) return json({ error: long }, 400);
    const winErr = winnersCap(winnerCount);
    if (winErr) return json({ error: winErr }, 400);
    const prizeErr = nimCap(rewardNim, 0.01);
    if (prizeErr) return json({ error: prizeErr }, 400);
    if (!Number.isFinite(deadline) || deadline <= Date.now()) {
      return json({ error: "Deadline must be in the future." }, 400);
    }
    try {
      escrowAddress();
    } catch {
      return json({ error: "Set ESCROW_ADDRESS to a Nimiq address that will hold bounty prizes." }, 400);
    }
    const id = randomUUID();
    const rewardLuna = nimToLuna(rewardNim);
    await run(
      `INSERT INTO bounties (id, sponsor_wallet, title, brief, category, deliverables, winner_count, reward_luna, deadline, state, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'funding', ?)`,
      [id, wallet!, title, brief, category, deliverables, winnerCount, rewardLuna, deadline, Date.now()],
    );
    await track(wallet!, "bounty_created", { id });
    return json({ id, fund: fundIntent(id, rewardLuna) });
  }

  if (path === "bounties/fund") {
    const bountyId = String(body.bountyId ?? "");
    const txHash = String(body.txHash ?? "");
    const hashErr = txHashOk(txHash);
    if (hashErr) return json({ error: hashErr }, 400);
    const bounty = await bountyById(bountyId);
    if (!bounty || bounty.sponsorWallet !== wallet) return json({ error: "Bounty not found." }, 404);
    if (bounty.state !== "funding") return json({ error: "This bounty is already funded." }, 400);
    const ok = await verifyFunding({
      bountyId,
      txHash,
      from: wallet!,
      amountLuna: bounty.rewardLuna,
    });
    if (!ok) return json({ error: "Prize funding is not confirmed on chain yet." }, 400);
    await run("UPDATE bounties SET state = 'open', fund_tx = ?, escrow_ref = ? WHERE id = ?", [
      txHash,
      fundIntent(bountyId, bounty.rewardLuna).recipient,
      bountyId,
    ]);
    await track(wallet!, "bounty_funded", { bountyId, txHash });
    return json({ ok: true, state: "open" });
  }

  if (path === "submissions") {
    const bountyId = String(body.bountyId ?? "");
    const assetUrl = String(body.assetUrl ?? "").trim();
    const fileId = String(body.fileId ?? "").trim() || null;
    const note = String(body.note ?? "").trim();
    const bounty = await bountyById(bountyId);
    if (!bounty || bounty.state !== "open") return json({ error: "This bounty is not accepting work." }, 400);
    if (bounty.deadline < Date.now()) return json({ error: "The deadline has passed." }, 400);
    if ((!assetUrl && !fileId) || !note) return json({ error: "Add a work link or file, and a short note." }, 400);
    const noteErr = tooLong("Note", note, LIMIT.note);
    if (noteErr) return json({ error: noteErr }, 400);
    if (assetUrl) {
      const urlErr = httpUrl(assetUrl);
      if (urlErr) return json({ error: urlErr }, 400);
    }
    const file = await ownedFileId(wallet!, fileId);
    if ("error" in file) return json({ error: file.error }, 400);
    const id = randomUUID();
    try {
      await run(
        `INSERT INTO submissions (id, bounty_id, submitter_wallet, asset_url, note, file_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?)`,
        [id, bountyId, wallet!, assetUrl, note, file.id, Date.now()],
      );
    } catch {
      return json({ error: "You already submitted to this bounty." }, 409);
    }
    await track(wallet!, "submission", { bountyId });
    return json({ id });
  }

  if (path === "bounties/close") {
    const bountyId = String(body.bountyId ?? "");
    const bounty = await bountyById(bountyId);
    if (!bounty || bounty.sponsorWallet !== wallet) return json({ error: "Bounty not found." }, 404);
    if (bounty.state !== "open") return json({ error: "Only open bounties can move to review." }, 400);
    await run("UPDATE bounties SET state = 'review' WHERE id = ?", [bountyId]);
    return json({ ok: true, state: "review" });
  }

  if (path === "bounties/winners") {
    const bountyId = String(body.bountyId ?? "");
    const winnerIds = Array.isArray(body.winnerIds) ? body.winnerIds.map(String) : [];
    const bounty = await bountyById(bountyId);
    if (!bounty || bounty.sponsorWallet !== wallet) return json({ error: "Bounty not found." }, 404);
    if (bounty.state !== "review") return json({ error: "Select winners during review." }, 400);
    if (winnerIds.length < 1 || winnerIds.length > bounty.winnerCount) {
      return json({ error: `Pick between 1 and ${bounty.winnerCount} winner(s).` }, 400);
    }
    const subs = await submissionsFor(bountyId);
    const selected = subs.filter((s) => winnerIds.includes(s.id) && s.status === "submitted");
    if (selected.length !== winnerIds.length) return json({ error: "One of those submissions is not eligible." }, 400);
    const share = Math.floor(bounty.rewardLuna / selected.length);
    const remainder = bounty.rewardLuna - share * selected.length;
    for (const sub of subs) {
      await run("UPDATE submissions SET status = ? WHERE id = ?", [
        winnerIds.includes(sub.id) ? "winner" : "not_selected",
        sub.id,
      ]);
    }
    for (const [i, sub] of selected.entries()) {
      await run(
        `INSERT INTO payouts (id, bounty_id, recipient_wallet, amount_luna, status) VALUES (?, ?, ?, ?, 'pending')`,
        [randomUUID(), bountyId, sub.submitterWallet, share + (i === 0 ? remainder : 0)],
      );
    }
    await run("UPDATE bounties SET state = 'payout_pending' WHERE id = ?", [bountyId]);
    await track(wallet!, "winners_selected", { bountyId, count: selected.length });
    const payouts = await q<{ id: string; recipient_wallet: string; amount_luna: number }>(
      "SELECT id, recipient_wallet, amount_luna FROM payouts WHERE bounty_id = ?",
      [bountyId],
    );
    return json({
      payouts: payouts.map((p) => ({
        id: p.id,
        wallet: p.recipient_wallet,
        amountLuna: Number(p.amount_luna),
        memo: `dplace:payout:${bountyId}`,
      })),
      from: bounty.fundTx ? process.env.ESCROW_ADDRESS ?? "demo:escrow" : wallet,
    });
  }

  if (path === "payouts/confirm") {
    const bountyId = String(body.bountyId ?? "");
    const payoutId = String(body.payoutId ?? "");
    const txHash = String(body.txHash ?? "");
    const hashErr = txHashOk(txHash);
    if (hashErr) return json({ error: hashErr }, 400);
    const bounty = await bountyById(bountyId);
    if (!bounty || bounty.sponsorWallet !== wallet) return json({ error: "Bounty not found." }, 404);
    const payout = (
      await q<{ id: string; recipient_wallet: string; amount_luna: number; status: string }>(
        "SELECT id, recipient_wallet, amount_luna, status FROM payouts WHERE id = ? AND bounty_id = ?",
        [payoutId, bountyId],
      )
    )[0];
    if (!payout || payout.status === "paid") return json({ error: "Payout not found." }, 404);
    const ok = await verifyPayout({
      bountyId,
      txHash,
      from: process.env.ESCROW_ADDRESS && process.env.ESCROW_ADDRESS !== "demo:escrow" ? process.env.ESCROW_ADDRESS : wallet!,
      to: payout.recipient_wallet,
      amountLuna: Number(payout.amount_luna),
    });
    if (!ok) return json({ error: "Payout is not confirmed on chain yet." }, 400);
    await run("UPDATE payouts SET status = 'paid', tx_ref = ? WHERE id = ?", [txHash, payoutId]);
    const unpaid = await q<{ n: number }>(
      "SELECT COUNT(*) AS n FROM payouts WHERE bounty_id = ? AND status != 'paid'",
      [bountyId],
    );
    if (!Number(unpaid[0]?.n)) {
      await run("UPDATE bounties SET state = 'paid' WHERE id = ?", [bountyId]);
    }
    await track(wallet!, "payout", { bountyId, payoutId, txHash });
    return json({ ok: true, bountyState: !Number(unpaid[0]?.n) ? "paid" : "payout_pending" });
  }

  if (path === "bounties/cancel") {
    const bountyId = String(body.bountyId ?? "");
    const bounty = await bountyById(bountyId);
    if (!bounty || bounty.sponsorWallet !== wallet) return json({ error: "Bounty not found." }, 404);
    if (bounty.state !== "funding" && bounty.state !== "open") {
      return json({ error: "This bounty can no longer be cancelled." }, 400);
    }
    if (bounty.state === "open" && bounty.submissionCount > 0) {
      return json({ error: "Cancel is only allowed before any submissions." }, 400);
    }
    if (!bounty.funded) {
      await run("UPDATE bounties SET state = 'cancelled' WHERE id = ?", [bountyId]);
      return json({ ok: true, state: "cancelled" });
    }
    return json({
      state: "refund_needed",
      refund: {
        recipient: bounty.sponsorWallet,
        amountLuna: bounty.rewardLuna,
        memo: `dplace:refund:${bountyId}`,
        from: process.env.ESCROW_ADDRESS ?? "demo:escrow",
      },
    });
  }

  if (path === "bounties/refund") {
    const bountyId = String(body.bountyId ?? "");
    const txHash = String(body.txHash ?? "");
    const hashErr = txHashOk(txHash);
    if (hashErr) return json({ error: hashErr }, 400);
    const bounty = await bountyById(bountyId);
    if (!bounty || bounty.sponsorWallet !== wallet) return json({ error: "Bounty not found." }, 404);
    if (!["open", "funding", "disputed", "payout_pending"].includes(bounty.state)) {
      return json({ error: "This bounty cannot be refunded." }, 400);
    }
    const from =
      process.env.ESCROW_ADDRESS && process.env.ESCROW_ADDRESS !== "demo:escrow"
        ? process.env.ESCROW_ADDRESS
        : wallet!;
    const ok = await verifyRefund({
      bountyId,
      txHash,
      from,
      to: bounty.sponsorWallet,
      amountLuna: bounty.rewardLuna,
    });
    if (!ok) return json({ error: "Refund is not confirmed on chain yet." }, 400);
    await run("UPDATE bounties SET state = 'refunded' WHERE id = ?", [bountyId]);
    return json({ ok: true, state: "refunded" });
  }

  if (path === "bounties/dispute") {
    const bountyId = String(body.bountyId ?? "");
    const bounty = await bountyById(bountyId);
    if (!bounty) return json({ error: "Bounty not found." }, 404);
    const winner = (
      await q<{ n: number }>(
        "SELECT COUNT(*) AS n FROM submissions WHERE bounty_id = ? AND submitter_wallet = ? AND status = 'winner'",
        [bountyId, wallet!],
      )
    )[0];
    if (bounty.sponsorWallet !== wallet && !Number(winner?.n)) {
      return json({ error: "Only the owner or a winner can open a dispute." }, 403);
    }
    if (bounty.state !== "payout_pending") return json({ error: "Disputes start from payout pending." }, 400);
    await run("UPDATE bounties SET state = 'disputed' WHERE id = ?", [bountyId]);
    return json({ ok: true, state: "disputed" });
  }

  if (path === "bounties/resolve") {
    const bountyId = String(body.bountyId ?? "");
    const action = String(body.action ?? "");
    const bounty = await bountyById(bountyId);
    if (!bounty || bounty.sponsorWallet !== wallet) return json({ error: "Bounty not found." }, 404);
    if (bounty.state !== "disputed") return json({ error: "Nothing to resolve." }, 400);
    if (action === "paid") {
      await run("UPDATE bounties SET state = 'paid' WHERE id = ?", [bountyId]);
      return json({ ok: true, state: "paid" });
    }
    if (action === "refund") {
      return json({
        state: "refund_needed",
        refund: {
          recipient: bounty.sponsorWallet,
          amountLuna: bounty.rewardLuna,
          memo: `dplace:refund:${bountyId}`,
          from: process.env.ESCROW_ADDRESS ?? "demo:escrow",
        },
      });
    }
    return json({ error: "Resolve as paid or refund." }, 400);
  }

  if (path === "reviews") {
    const targetType = String(body.targetType ?? "");
    const targetId = String(body.targetId ?? "");
    const rating = Math.floor(Number(body.rating));
    const text = String(body.text ?? "").trim();
    if (targetType !== "content" || !targetId) return json({ error: "Reviews are for listings." }, 400);
    if (rating < 1 || rating > 5) return json({ error: "Rating must be 1 to 5." }, 400);
    const textErr = tooLong("Review", text, LIMIT.review);
    if (textErr) return json({ error: textErr }, 400);
    const listing = await contentById(targetId, wallet);
    if (!listing) return json({ error: "Listing not found." }, 404);
    const owned = await q<{ n: number }>(
      "SELECT COUNT(*) AS n FROM entitlements WHERE wallet = ? AND content_id = ?",
      [wallet!, targetId],
    );
    if (!owned[0]?.n) return json({ error: "Unlock the listing before rating it." }, 403);
    await run(
      `INSERT INTO reviews (id, reviewer_wallet, target_type, target_id, rating, text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(reviewer_wallet, target_type, target_id) DO UPDATE SET rating = excluded.rating, text = excluded.text`,
      [randomUUID(), wallet!, targetType, targetId, rating, text, Date.now()],
    );
    return json({ ok: true });
  }

  if (path === "reports") {
    const targetType = String(body.targetType ?? "");
    const targetId = String(body.targetId ?? "");
    const reason = String(body.reason ?? "").trim();
    if (!["content", "bounty"].includes(targetType) || !targetId || !reason) {
      return json({ error: "Say what you are reporting and why." }, 400);
    }
    if (reason.length < 8) return json({ error: "Say a bit more about the report." }, 400);
    const reasonErr = tooLong("Report", reason, LIMIT.report);
    if (reasonErr) return json({ error: reasonErr }, 400);
    if (targetType === "content" && !(await contentById(targetId, wallet))) {
      return json({ error: "Listing not found." }, 404);
    }
    if (targetType === "bounty" && !(await bountyById(targetId, wallet))) {
      return json({ error: "Bounty not found." }, 404);
    }
    await run(
      `INSERT INTO reports (id, reporter_wallet, target_type, target_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), wallet!, targetType, targetId, reason, Date.now()],
    );
    if (targetType === "content") {
      await run("UPDATE content SET status = 'suspended' WHERE id = ?", [targetId]);
    }
    return json({ ok: true });
  }

  if (path === "events") {
    const name = String(body.name ?? "");
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(name)) {
      return json({ error: "Unknown event." }, 400);
    }
    const payload = JSON.stringify(body);
    if (payload.length > LIMIT.eventPayload) return json({ error: "Event payload is too large." }, 400);
    await track(wallet, name, body);
    return json({ ok: true });
  }

  return json({ error: "Unknown route." }, 404);
}

async function track(wallet: string | null, name: string, payload: unknown) {
  await run("INSERT INTO events (wallet, name, payload, created_at) VALUES (?, ?, ?, ?)", [
    wallet,
    name,
    JSON.stringify(payload ?? {}),
    Date.now(),
  ]);
}
