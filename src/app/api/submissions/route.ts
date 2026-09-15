import { randomUUID } from "node:crypto";
import { run } from "@/db";
import { ownedFileId } from "@/files";
import { json, mustUser, readBody, str, track } from "@/http";
import { bountyById } from "@/queries";
import { LIMIT, httpUrl, tooLong } from "@/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const body = await readBody(req);
  const bountyId = str(body, "bountyId");
  const assetUrl = str(body, "assetUrl").trim();
  const fileId = str(body, "fileId").trim() || null;
  const note = str(body, "note").trim();
  const bounty = await bountyById(bountyId);
  if (!bounty || bounty.state !== "open") return json({ error: "This bounty is not accepting work." }, 400);
  if (bounty.deadline < Date.now()) return json({ error: "The deadline has passed." }, 400);
  if ((!assetUrl && !fileId) || !note) return json({ error: "Add a work link or file, and a short note." }, 400);
  const noteErr = tooLong("Note", note, LIMIT.note);
  if (noteErr) return json({ error: noteErr }, 400);
  if (assetUrl) {
    const urlErr = httpUrl(assetUrl);
    if (urlErr) return json({ error: urlErr }, 400);
  }
  const file = await ownedFileId(auth.wallet, fileId);
  if ("error" in file) return json({ error: file.error }, 400);
  const id = randomUUID();
  try {
    await run(
      `INSERT INTO submissions (id, bounty_id, submitter_wallet, asset_url, note, file_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?)`,
      [id, bountyId, auth.wallet, assetUrl, note, file.id, Date.now()],
    );
  } catch {
    return json({ error: "You already submitted to this bounty." }, 409);
  }
  await track(auth.wallet, "submission", { bountyId });
  return json({ id });
}
