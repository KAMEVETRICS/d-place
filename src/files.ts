import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { q, run } from "./db";

const dir = path.join(process.cwd(), "data", "files");
mkdirSync(dir, { recursive: true });

const ALLOWED = new Set([
  "application/pdf",
  "application/zip",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
]);

export type StoredFile = {
  id: string;
  ownerWallet: string;
  filename: string;
  mime: string;
};

function sniffMime(buf: Buffer, filename: string) {
  if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return "application/pdf";
  }
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) return "application/zip";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buf.length >= 8 && buf.toString("ascii", 4, 8) === "ftyp") return "video/mp4";
  const head = buf.subarray(0, Math.min(1024, buf.length));
  if (head.includes(0)) return null;
  return filename.toLowerCase().endsWith(".md") ? "text/markdown" : "text/plain";
}

export async function storeUpload(ownerWallet: string, file: File) {
  if (file.size > 10 * 1024 * 1024) throw new Error("File must be 10 MB or smaller.");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf, file.name);
  if (!mime || !ALLOWED.has(mime)) throw new Error("That file type is not allowed.");
  const id = randomUUID();
  writeFileSync(path.join(dir, id), buf);
  await run("INSERT INTO files (id, owner_wallet, filename, mime, created_at) VALUES (?, ?, ?, ?, ?)", [
    id,
    ownerWallet,
    file.name.slice(0, 180),
    mime,
    Date.now(),
  ]);
  return { id, filename: file.name, mime };
}

export async function ownedFileId(wallet: string, fileId: string | null) {
  if (!fileId) return { id: null as string | null };
  const meta = await fileMeta(fileId);
  if (!meta || meta.ownerWallet !== wallet) return { error: "That file is not yours." };
  return { id: fileId };
}

export async function fileMeta(id: string): Promise<StoredFile | null> {
  const rows = await q<{ id: string; owner_wallet: string; filename: string; mime: string }>(
    "SELECT id, owner_wallet, filename, mime FROM files WHERE id = ?",
    [id],
  );
  const r = rows[0];
  if (!r) return null;
  return { id: r.id, ownerWallet: r.owner_wallet, filename: r.filename, mime: r.mime };
}

export function fileBytes(id: string) {
  const p = path.join(dir, id);
  if (!existsSync(p)) return null;
  return readFileSync(p);
}

export async function canReadFile(id: string, wallet: string | null) {
  const meta = await fileMeta(id);
  if (!meta) return false;
  if (wallet && meta.ownerWallet === wallet) return true;
  if (!wallet) return false;
  const asContent = await q<{ n: number }>(
    `SELECT COUNT(*) AS n FROM content c
     LEFT JOIN entitlements e ON e.content_id = c.id AND e.wallet = ?
     WHERE c.file_id = ? AND (c.creator_wallet = ? OR e.wallet IS NOT NULL)`,
    [wallet, id, wallet],
  );
  if (Number(asContent[0]?.n)) return true;
  const asSub = await q<{ n: number }>(
    `SELECT COUNT(*) AS n FROM submissions s
     JOIN bounties b ON b.id = s.bounty_id
     WHERE s.file_id = ? AND (s.submitter_wallet = ? OR b.sponsor_wallet = ?)`,
    [id, wallet, wallet],
  );
  return Number(asSub[0]?.n) > 0;
}
