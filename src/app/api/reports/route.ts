import { randomUUID } from "node:crypto";
import { run } from "@/db";
import { json, mustUser, readBody, str } from "@/http";
import { bountyById, contentById } from "@/queries";
import { LIMIT, tooLong } from "@/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const body = await readBody(req);
  const targetType = str(body, "targetType");
  const targetId = str(body, "targetId");
  const reason = str(body, "reason").trim();
  if (!["content", "bounty"].includes(targetType) || !targetId || !reason) {
    return json({ error: "Say what you are reporting and why." }, 400);
  }
  if (reason.length < 8) return json({ error: "Say a bit more about the report." }, 400);
  const reasonErr = tooLong("Report", reason, LIMIT.report);
  if (reasonErr) return json({ error: reasonErr }, 400);
  if (targetType === "content" && !(await contentById(targetId, auth.wallet))) {
    return json({ error: "Listing not found." }, 404);
  }
  if (targetType === "bounty" && !(await bountyById(targetId, auth.wallet))) {
    return json({ error: "Bounty not found." }, 404);
  }
  await run(
    `INSERT INTO reports (id, reporter_wallet, target_type, target_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [randomUUID(), auth.wallet, targetType, targetId, reason, Date.now()],
  );
  if (targetType === "content") {
    await run("UPDATE content SET status = 'suspended' WHERE id = ?", [targetId]);
  }
  return json({ ok: true });
}
