import { createClient, type InValue } from "@libsql/client";
import { mkdirSync } from "node:fs";
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
  await seed();
}

async function addColumn(table: string, name: string, type: string) {
  try {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
  } catch {
    /* already present */
  }
}

async function seed() {
  const existing = await q<{ n: number }>("SELECT COUNT(*) AS n FROM content WHERE id = ?", [
    "seed-course-data",
  ]);
  if (Number(existing[0]?.n)) return;
  const now = Date.now();
  await run(
    "INSERT OR IGNORE INTO profiles (wallet, username, display_name, bio, created_at) VALUES (?, ?, ?, ?, ?)",
    ["demo:alice", "alice", "Alice", "Teaches data analysis.", now],
  );
  await run(
    "INSERT OR IGNORE INTO profiles (wallet, username, display_name, bio, created_at) VALUES (?, ?, ?, ?, ?)",
    ["demo:bob", "bob", "Bob", "Learning in public.", now],
  );
  await run(
    `INSERT OR IGNORE INTO content (id, creator_wallet, type, title, description, category, price_luna, preview, body, status, created_at)
     VALUES (?, 'demo:alice', 'course', 'Intro to Data Analysis', 'Read a table, ask a question, write the answer.', 'data', 25000000, 'Module 1 is free: what a dataset even is.', 'Module 1. Open the CSV. Count the rows. Write one question the data can answer.', 'live', ?)`,
    ["seed-course-data", now],
  );
  const deadline = now + 7 * 86400000;
  await run(
    `INSERT OR IGNORE INTO bounties (id, sponsor_wallet, title, brief, category, deliverables, winner_count, reward_luna, deadline, escrow_ref, fund_tx, state, created_at)
     VALUES (?, 'demo:alice', 'Analyze this dataset', 'Produce a one-page analysis of the attached sample.', 'data', 'A short write-up with one chart description.', 2, 150000000, ?, 'demo:escrow', 'demo:seed-fund', 'open', ?)`,
    ["seed-bounty-data", deadline, now],
  );
}

export async function q<T>(sql: string, args: InValue[] = []) {
  const rs = await db.execute({ sql, args });
  return rs.rows as unknown as T[];
}

export async function run(sql: string, args: InValue[] = []) {
  return db.execute({ sql, args });
}
