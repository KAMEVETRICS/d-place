import { randomUUID } from "node:crypto";
import { parseCategory } from "@/categories";
import { run } from "@/db";
import { escrowAddress, fundIntent } from "@/escrow";
import { guest, json, mustUser, readBody, str, track } from "@/http";
import { nimToLuna } from "@/money";
import { expireOpenBounties, listBounties } from "@/queries";
import { LIMIT, nimCap, tooLong, winnersCap } from "@/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  const { wallet } = await guest();
  await expireOpenBounties();
  return json({ items: await listBounties(wallet) });
}

export async function POST(req: Request) {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const body = await readBody(req);
  const title = str(body, "title").trim();
  const brief = str(body, "brief").trim();
  const category = parseCategory(str(body, "category"));
  const deliverables = str(body, "deliverables").trim();
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
    [id, auth.wallet, title, brief, category, deliverables, winnerCount, rewardLuna, deadline, Date.now()],
  );
  await track(auth.wallet, "bounty_created", { id });
  return json({ id, fund: fundIntent(id, rewardLuna) });
}
