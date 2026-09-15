import { profileFor, validUsername } from "@/auth";
import { run } from "@/db";
import { guest, json, readBody, str } from "@/http";
import { profileStats } from "@/queries";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { wallet } = await guest();
  if (!wallet) return json({ error: "Connect a wallet first." }, 401);
  const body = await readBody(req);
  const username = str(body, "username").trim().toLowerCase();
  const displayName = str(body, "displayName") || username;
  const bio = str(body, "bio");
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
