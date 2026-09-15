import { json, mustUser, readBody, str, track } from "@/http";
import { LIMIT } from "@/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const body = await readBody(req);
  const name = str(body, "name");
  if (!/^[a-z][a-z0-9_]{0,39}$/.test(name)) {
    return json({ error: "Unknown event." }, 400);
  }
  const payload = JSON.stringify(body);
  if (payload.length > LIMIT.eventPayload) return json({ error: "Event payload is too large." }, 400);
  await track(auth.wallet, name, body);
  return json({ ok: true });
}
