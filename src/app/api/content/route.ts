import { randomUUID } from "node:crypto";
import { parseCategory } from "@/categories";
import { q, run } from "@/db";
import { ownedFileId } from "@/files";
import { json, mustUser, readBody, str, track } from "@/http";
import { nimToLuna } from "@/money";
import type { ContentType } from "@/types";
import { LIMIT, nimCap, tooLong } from "@/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await mustUser();
  if (!auth.ok) return auth.res;
  const body = await readBody(req);
  const type = str(body, "type") as ContentType;
  if (!["course", "guide", "template"].includes(type)) {
    return json({ error: "Type must be course, guide, or template." }, 400);
  }
  const title = str(body, "title").trim();
  const description = str(body, "description").trim();
  const category = parseCategory(str(body, "category"));
  const preview = str(body, "preview").trim();
  const contentBody = str(body, "body").trim();
  const fileId = str(body, "fileId").trim() || null;
  const priceNim = Number(body.priceNim);
  if (!title || !description || !preview || !contentBody) {
    return json({ error: "Title, description, preview, and body are required." }, 400);
  }
  const long =
    tooLong("Title", title, LIMIT.title) ||
    tooLong("Description", description, LIMIT.description) ||
    tooLong("Preview", preview, LIMIT.preview) ||
    tooLong("Body", contentBody, LIMIT.body);
  if (long) return json({ error: long }, 400);
  const priceErr = nimCap(priceNim, 0);
  if (priceErr) return json({ error: priceErr }, 400);
  const file = await ownedFileId(auth.wallet, fileId);
  if ("error" in file) return json({ error: file.error }, 400);
  const dup = await q<{ n: number }>(
    "SELECT COUNT(*) AS n FROM content WHERE creator_wallet = ? AND lower(trim(title)) = lower(?) AND status = 'live'",
    [auth.wallet, title],
  );
  if (Number(dup[0]?.n)) {
    return json({ error: "You already have a live listing with that title." }, 409);
  }
  const id = randomUUID();
  await run(
    `INSERT INTO content (id, creator_wallet, type, title, description, category, price_luna, preview, body, status, file_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'live', ?, ?)`,
    [id, auth.wallet, type, title, description, category, nimToLuna(priceNim), preview, contentBody, file.id, Date.now()],
  );
  await track(auth.wallet, "content_published", { id });
  return json({ id });
}
