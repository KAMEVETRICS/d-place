import { consumeChallenge, createSession, profileFor, verifyLogin } from "@/auth";
import { profileStats } from "@/queries";
import { boot, guest, json, readBody, str } from "@/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const { wallet, profile } = await guest();
  const stats = wallet ? await profileStats(wallet) : null;
  return json({
    wallet,
    username: profile?.username ?? null,
    profile: stats,
  });
}

export async function POST(req: Request) {
  await boot();
  const body = await readBody(req);
  const w = str(body, "wallet");
  const nonce = str(body, "nonce");
  const signature = str(body, "signature");
  const publicKey = str(body, "publicKey");
  if (!w || !nonce || !signature) return json({ error: "Wallet, nonce, and signature are required." }, 400);
  if (w.startsWith("demo:")) return json({ error: "Could not verify that wallet signature." }, 401);
  if (!(await consumeChallenge(nonce))) return json({ error: "Login challenge expired. Try again." }, 400);
  if (!(await verifyLogin({ wallet: w, nonce, signature, publicKey }))) {
    return json({ error: "Could not verify that wallet signature." }, 401);
  }
  await createSession(w);
  const existing = await profileFor(w);
  return json({ wallet: w, username: existing?.username ?? null });
}
