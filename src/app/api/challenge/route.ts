import { issueChallenge, loginMessage } from "@/auth";
import { boot, json } from "@/http";

export const dynamic = "force-dynamic";

export async function GET() {
  await boot();
  const nonce = await issueChallenge();
  return json({ nonce, message: loginMessage(nonce) });
}
