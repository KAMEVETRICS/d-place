import { q, run } from "./db";
import type { BountyCard, ContentCard, Profile, SaleRow, StallStats, Submission } from "./types";

export async function profileStats(wallet: string): Promise<Profile | null> {
  const rows = await q<{
    wallet: string;
    username: string;
    display_name: string;
    bio: string;
    created_at: number;
  }>("SELECT wallet, username, display_name, bio, created_at FROM profiles WHERE wallet = ?", [
    wallet,
  ]);
  const p = rows[0];
  if (!p) return null;
  const purchased = await q<{ n: number }>(
    "SELECT COUNT(*) AS n FROM entitlements WHERE wallet = ?",
    [wallet],
  );
  const published = await q<{ n: number }>(
    "SELECT COUNT(*) AS n FROM content WHERE creator_wallet = ? AND status = 'live'",
    [wallet],
  );
  const submitted = await q<{ n: number }>(
    "SELECT COUNT(*) AS n FROM submissions WHERE submitter_wallet = ?",
    [wallet],
  );
  const won = await q<{ n: number }>(
    "SELECT COUNT(*) AS n FROM submissions WHERE submitter_wallet = ? AND status = 'winner'",
    [wallet],
  );
  const earned = await q<{ n: number }>(
    "SELECT COALESCE(SUM(amount_luna), 0) AS n FROM payouts WHERE recipient_wallet = ? AND status = 'paid'",
    [wallet],
  );
  const sales = await q<{ n: number }>(
    "SELECT COALESCE(SUM(amount_luna), 0) AS n FROM purchases WHERE status = 'confirmed' AND content_id IN (SELECT id FROM content WHERE creator_wallet = ?)",
    [wallet],
  );
  return {
    wallet: p.wallet,
    username: p.username,
    displayName: p.display_name,
    bio: p.bio,
    createdAt: p.created_at,
    purchased: Number(purchased[0]?.n ?? 0),
    published: Number(published[0]?.n ?? 0),
    submitted: Number(submitted[0]?.n ?? 0),
    won: Number(won[0]?.n ?? 0),
    earnedLuna: Number(earned[0]?.n ?? 0) + Number(sales[0]?.n ?? 0),
  };
}

export async function listContent(wallet: string | null): Promise<ContentCard[]> {
  const rows = await q<{
    id: string;
    creator_wallet: string;
    username: string;
    type: ContentCard["type"];
    title: string;
    description: string;
    category: string;
    price_luna: number;
    preview: string;
    status: ContentCard["status"];
    created_at: number;
    rating_avg: number;
    rating_count: number;
    file_id: string | null;
  }>(
    `SELECT c.id, c.creator_wallet, p.username, c.type, c.title, c.description, c.category,
            c.price_luna, c.preview, c.status, c.created_at, c.file_id,
            COALESCE(AVG(r.rating), 0) AS rating_avg,
            COUNT(r.id) AS rating_count
     FROM content c
     JOIN profiles p ON p.wallet = c.creator_wallet
     LEFT JOIN reviews r ON r.target_type = 'content' AND r.target_id = c.id
     WHERE c.status = 'live'
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
  );
  const owned = new Set<string>();
  if (wallet) {
    const ents = await q<{ content_id: string }>(
      "SELECT content_id FROM entitlements WHERE wallet = ?",
      [wallet],
    );
    for (const e of ents) owned.add(e.content_id);
  }
  const saved = wallet ? await savedIds(wallet, "content") : new Set<string>();
  return rows.map((r) => toCard(r, owned.has(r.id), saved.has(r.id)));
}

type ContentRow = {
  id: string;
  creator_wallet: string;
  username: string;
  type: ContentCard["type"];
  title: string;
  description: string;
  category: string;
  price_luna: number;
  preview: string;
  status: ContentCard["status"];
  created_at: number;
  rating_avg: number;
  rating_count: number;
  file_id: string | null;
};

function toCard(r: ContentRow, owned: boolean, saved = false): ContentCard {
  return {
    id: r.id,
    creatorWallet: r.creator_wallet,
    creatorUsername: r.username,
    type: r.type,
    title: r.title,
    description: r.description,
    category: r.category,
    priceLuna: Number(r.price_luna),
    preview: r.preview,
    status: r.status,
    createdAt: Number(r.created_at),
    ratingAvg: Number(r.rating_avg),
    ratingCount: Number(r.rating_count),
    owned,
    saved,
    fileId: r.file_id,
  };
}

export async function savedIds(wallet: string, kind: "content" | "bounty") {
  const rows = await q<{ target_id: string }>(
    "SELECT target_id FROM saves WHERE wallet = ? AND kind = ?",
    [wallet, kind],
  );
  return new Set(rows.map((r) => r.target_id));
}

const CONTENT_SELECT = `SELECT c.id, c.creator_wallet, p.username, c.type, c.title, c.description, c.category,
            c.price_luna, c.preview, c.status, c.created_at, c.file_id,
            COALESCE(AVG(r.rating), 0) AS rating_avg,
            COUNT(r.id) AS rating_count
     FROM content c
     JOIN profiles p ON p.wallet = c.creator_wallet
     LEFT JOIN reviews r ON r.target_type = 'content' AND r.target_id = c.id`;

export async function contentById(id: string, wallet: string | null): Promise<ContentCard | null> {
  const rows = await q<ContentRow>(`${CONTENT_SELECT} WHERE c.id = ? GROUP BY c.id`, [id]);
  const r = rows[0];
  if (!r) return null;
  let owned = false;
  if (wallet) {
    if (r.creator_wallet === wallet) owned = true;
    else {
      const ents = await q<{ n: number }>(
        "SELECT COUNT(*) AS n FROM entitlements WHERE wallet = ? AND content_id = ?",
        [wallet, id],
      );
      owned = Number(ents[0]?.n) > 0;
    }
  }
  const saved = wallet ? (await savedIds(wallet, "content")).has(id) : false;
  return toCard(r, owned, saved);
}

export async function listOwnedContent(wallet: string): Promise<ContentCard[]> {
  const rows = await q<ContentRow>(
    `${CONTENT_SELECT}
     WHERE c.id IN (SELECT content_id FROM entitlements WHERE wallet = ?)
        OR c.creator_wallet = ?
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [wallet, wallet],
  );
  const saved = await savedIds(wallet, "content");
  return rows.map((r) => toCard(r, true, saved.has(r.id)));
}

export async function listBounties(wallet?: string | null): Promise<BountyCard[]> {
  const rows = await q<{
    id: string;
    sponsor_wallet: string;
    username: string;
    title: string;
    brief: string;
    category: string;
    deliverables: string;
    winner_count: number;
    reward_luna: number;
    deadline: number;
    state: BountyCard["state"];
    fund_tx: string | null;
    created_at: number;
    submission_count: number;
  }>(
    `SELECT b.id, b.sponsor_wallet, p.username, b.title, b.brief, b.category, b.deliverables,
            b.winner_count, b.reward_luna, b.deadline, b.state, b.fund_tx, b.created_at,
            (SELECT COUNT(*) FROM submissions s WHERE s.bounty_id = b.id AND s.status != 'withdrawn') AS submission_count
     FROM bounties b
     JOIN profiles p ON p.wallet = b.sponsor_wallet
     WHERE b.state IN ('open', 'review', 'payout_pending', 'paid')
     ORDER BY b.created_at DESC`,
  );
  const saved = wallet ? await savedIds(wallet, "bounty") : new Set<string>();
  return rows.map((r) => toBounty(r, saved.has(r.id)));
}

type BountyRow = {
  id: string;
  sponsor_wallet: string;
  username: string;
  title: string;
  brief: string;
  category: string;
  deliverables: string;
  winner_count: number;
  reward_luna: number;
  deadline: number;
  state: BountyCard["state"];
  fund_tx: string | null;
  created_at: number;
  submission_count: number;
};

function toBounty(r: BountyRow, saved = false): BountyCard {
  return {
    id: r.id,
    sponsorWallet: r.sponsor_wallet,
    sponsorUsername: r.username,
    title: r.title,
    brief: r.brief,
    category: r.category,
    deliverables: r.deliverables,
    winnerCount: Number(r.winner_count),
    rewardLuna: Number(r.reward_luna),
    deadline: Number(r.deadline),
    state: r.state,
    funded: Boolean(r.fund_tx),
    fundTx: r.fund_tx,
    createdAt: Number(r.created_at),
    submissionCount: Number(r.submission_count),
    saved,
  };
}

export async function bountyById(id: string, wallet?: string | null): Promise<BountyCard | null> {
  const rows = await q<{
    id: string;
    sponsor_wallet: string;
    username: string;
    title: string;
    brief: string;
    category: string;
    deliverables: string;
    winner_count: number;
    reward_luna: number;
    deadline: number;
    state: BountyCard["state"];
    fund_tx: string | null;
    created_at: number;
    submission_count: number;
  }>(
    `SELECT b.id, b.sponsor_wallet, p.username, b.title, b.brief, b.category, b.deliverables,
            b.winner_count, b.reward_luna, b.deadline, b.state, b.fund_tx, b.created_at,
            (SELECT COUNT(*) FROM submissions s WHERE s.bounty_id = b.id AND s.status != 'withdrawn') AS submission_count
     FROM bounties b
     JOIN profiles p ON p.wallet = b.sponsor_wallet
     WHERE b.id = ?`,
    [id],
  );
  const r = rows[0];
  if (!r) return null;
  const saved = wallet ? (await savedIds(wallet, "bounty")).has(id) : false;
  return toBounty(r, saved);
}

export async function submissionsFor(bountyId: string): Promise<Submission[]> {
  const rows = await q<{
    id: string;
    bounty_id: string;
    submitter_wallet: string;
    username: string;
    asset_url: string;
    note: string;
    file_id: string | null;
    status: Submission["status"];
    created_at: number;
  }>(
    `SELECT s.id, s.bounty_id, s.submitter_wallet, p.username, s.asset_url, s.note, s.file_id, s.status, s.created_at
     FROM submissions s JOIN profiles p ON p.wallet = s.submitter_wallet
     WHERE s.bounty_id = ?
     ORDER BY s.created_at ASC`,
    [bountyId],
  );
  return rows.map((r) => ({
    id: r.id,
    bountyId: r.bounty_id,
    submitterWallet: r.submitter_wallet,
    submitterUsername: r.username,
    assetUrl: r.asset_url,
    note: r.note,
    fileId: r.file_id ?? null,
    status: r.status,
    createdAt: Number(r.created_at),
  }));
}

export async function sponsorBounties(wallet: string): Promise<BountyCard[]> {
  const rows = await q<{
    id: string;
    sponsor_wallet: string;
    username: string;
    title: string;
    brief: string;
    category: string;
    deliverables: string;
    winner_count: number;
    reward_luna: number;
    deadline: number;
    state: BountyCard["state"];
    fund_tx: string | null;
    created_at: number;
    submission_count: number;
  }>(
    `SELECT b.id, b.sponsor_wallet, p.username, b.title, b.brief, b.category, b.deliverables,
            b.winner_count, b.reward_luna, b.deadline, b.state, b.fund_tx, b.created_at,
            (SELECT COUNT(*) FROM submissions s WHERE s.bounty_id = b.id AND s.status != 'withdrawn') AS submission_count
     FROM bounties b JOIN profiles p ON p.wallet = b.sponsor_wallet
     WHERE b.sponsor_wallet = ?
     ORDER BY b.created_at DESC`,
    [wallet],
  );
  const saved = await savedIds(wallet, "bounty");
  return rows.map((r) => toBounty(r, saved.has(r.id)));
}

export async function expireOpenBounties() {
  await run(
    "UPDATE bounties SET state = 'review' WHERE state = 'open' AND deadline < ?",
    [Date.now()],
  );
}

export async function relatedBounties(category: string, wallet?: string | null) {
  const all = await listBounties(wallet);
  return all.filter((b) => b.state === "open" && b.category === category);
}

export async function creatorSales(wallet: string): Promise<SaleRow[]> {
  const rows = await q<{
    id: string;
    title: string;
    status: SaleRow["status"];
    buyers: number;
    revenue: number;
    rating_avg: number;
    rating_count: number;
  }>(
    `SELECT c.id, c.title, c.status,
            COUNT(DISTINCT p.buyer_wallet) AS buyers,
            COALESCE(SUM(p.amount_luna), 0) AS revenue,
            COALESCE(AVG(r.rating), 0) AS rating_avg,
            COUNT(r.id) AS rating_count
     FROM content c
     LEFT JOIN purchases p ON p.content_id = c.id AND p.status = 'confirmed'
     LEFT JOIN reviews r ON r.target_type = 'content' AND r.target_id = c.id
     WHERE c.creator_wallet = ?
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [wallet],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    buyers: Number(r.buyers),
    revenueLuna: Number(r.revenue),
    ratingAvg: Number(r.rating_avg),
    ratingCount: Number(r.rating_count),
  }));
}

export async function stallStats(): Promise<StallStats> {
  const wallets = await q<{ n: number }>("SELECT COUNT(*) AS n FROM profiles");
  const purchases = await q<{ n: number }>("SELECT COUNT(*) AS n FROM purchases WHERE status = 'confirmed'");
  const listings = await q<{ n: number }>("SELECT COUNT(*) AS n FROM content WHERE status = 'live'");
  const submissions = await q<{ n: number }>("SELECT COUNT(*) AS n FROM submissions");
  const payouts = await q<{ n: number }>("SELECT COUNT(*) AS n FROM payouts WHERE status = 'paid'");
  return {
    uniqueWallets: Number(wallets[0]?.n ?? 0),
    purchases: Number(purchases[0]?.n ?? 0),
    listings: Number(listings[0]?.n ?? 0),
    submissions: Number(submissions[0]?.n ?? 0),
    payouts: Number(payouts[0]?.n ?? 0),
  };
}
