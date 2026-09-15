import { clearSession } from "@/auth";
import { boot, json } from "@/http";

export const dynamic = "force-dynamic";

export async function POST() {
  await boot();
  await clearSession();
  return json({ ok: true });
}
