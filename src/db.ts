import { createClient, type InValue } from "@libsql/client";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

export const db = createClient({
  url:
    process.env.DATABASE_URL ??
    `file:${path.join(dataDir, "dplace.db").replaceAll("\\", "/")}`,
});

export async function migrate() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS profiles (
      wallet TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS challenges (
      nonce TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY,
      creator_wallet TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      price_luna INTEGER NOT NULL,
      preview TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      buyer_wallet TEXT NOT NULL,
      content_id TEXT NOT NULL,
      tx_hash TEXT NOT NULL UNIQUE,
      amount_luna INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS entitlements (
      wallet TEXT NOT NULL,
      content_id TEXT NOT NULL,
      purchase_id TEXT NOT NULL,
      granted_at INTEGER NOT NULL,
      PRIMARY KEY (wallet, content_id)
    );
    CREATE TABLE IF NOT EXISTS progress (
      wallet TEXT NOT NULL,
      content_id TEXT NOT NULL,
      percent INTEGER NOT NULL,
      PRIMARY KEY (wallet, content_id)
    );
    CREATE TABLE IF NOT EXISTS bounties (
      id TEXT PRIMARY KEY,
      sponsor_wallet TEXT NOT NULL,
      title TEXT NOT NULL,
      brief TEXT NOT NULL,
      category TEXT NOT NULL,
      deliverables TEXT NOT NULL,
      winner_count INTEGER NOT NULL,
      reward_luna INTEGER NOT NULL,
      deadline INTEGER NOT NULL,
      escrow_ref TEXT,
      fund_tx TEXT,
      state TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      bounty_id TEXT NOT NULL,
      submitter_wallet TEXT NOT NULL,
      asset_url TEXT NOT NULL,
      note TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE (bounty_id, submitter_wallet)
    );
    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      bounty_id TEXT NOT NULL,
      recipient_wallet TEXT NOT NULL,
      amount_luna INTEGER NOT NULL,
      tx_ref TEXT,
      status TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      reviewer_wallet TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE (reviewer_wallet, target_type, target_id)
    );
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_wallet TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet TEXT,
      name TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      owner_wallet TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS saves (
      wallet TEXT NOT NULL,
      kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (wallet, kind, target_id)
    );
  `);
  await addColumn("content", "file_id", "TEXT");
  await addColumn("submissions", "file_id", "TEXT");
  await dropDemo();
}

async function addColumn(table: string, name: string, type: string) {
  try {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
  } catch {
    /* already present */
  }
}

async function dropDemo() {
  const doomed = await q<{ id: string }>("SELECT id FROM files WHERE owner_wallet LIKE 'demo:%'");
  await run("DELETE FROM entitlements WHERE wallet LIKE 'demo:%' OR content_id IN (SELECT id FROM content WHERE creator_wallet LIKE 'demo:%' OR id LIKE 'seed-%')");
  await run("DELETE FROM purchases WHERE buyer_wallet LIKE 'demo:%' OR content_id IN (SELECT id FROM content WHERE creator_wallet LIKE 'demo:%' OR id LIKE 'seed-%')");
  await run("DELETE FROM progress WHERE wallet LIKE 'demo:%' OR content_id IN (SELECT id FROM content WHERE creator_wallet LIKE 'demo:%' OR id LIKE 'seed-%')");
  await run("DELETE FROM reviews WHERE reviewer_wallet LIKE 'demo:%' OR target_id LIKE 'seed-%'");
  await run("DELETE FROM saves WHERE wallet LIKE 'demo:%' OR target_id LIKE 'seed-%'");
  await run("DELETE FROM submissions WHERE submitter_wallet LIKE 'demo:%' OR bounty_id IN (SELECT id FROM bounties WHERE sponsor_wallet LIKE 'demo:%' OR id LIKE 'seed-%')");
  await run("DELETE FROM payouts WHERE recipient_wallet LIKE 'demo:%' OR bounty_id IN (SELECT id FROM bounties WHERE sponsor_wallet LIKE 'demo:%' OR id LIKE 'seed-%')");
  await run("DELETE FROM reports WHERE reporter_wallet LIKE 'demo:%' OR target_id LIKE 'seed-%'");
  await run("DELETE FROM files WHERE owner_wallet LIKE 'demo:%'");
  await run("DELETE FROM content WHERE creator_wallet LIKE 'demo:%' OR id LIKE 'seed-%'");
  await run("DELETE FROM bounties WHERE sponsor_wallet LIKE 'demo:%' OR id LIKE 'seed-%'");
  await run("DELETE FROM sessions WHERE wallet LIKE 'demo:%'");
  await run("DELETE FROM profiles WHERE wallet LIKE 'demo:%'");
  const filesDir = path.join(dataDir, "files");
  for (const row of doomed) {
    const p = path.join(filesDir, row.id);
    if (existsSync(p)) unlinkSync(p);
  }
}

export async function q<T>(sql: string, args: InValue[] = []) {
  const rs = await db.execute({ sql, args });
  return rs.rows as unknown as T[];
}

export async function run(sql: string, args: InValue[] = []) {
  return db.execute({ sql, args });
}
