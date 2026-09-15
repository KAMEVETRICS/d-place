import { NextResponse } from "next/server";
import { readSession } from "@/auth";
import { migrate } from "@/db";
import { canReadFile, fileBytes, fileMeta } from "@/files";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await migrate();
  const { id } = await ctx.params;
  const wallet = await readSession();
  if (!(await canReadFile(id, wallet))) {
    return NextResponse.json({ error: "Unlock this file first." }, { status: 403 });
  }
  const meta = await fileMeta(id);
  const bytes = fileBytes(id);
  if (!meta || !bytes) return NextResponse.json({ error: "File not found." }, { status: 404 });
  const download = new URL(req.url).searchParams.get("download") === "1";
  const filename = meta.filename.replace(/"/g, "");
  return new NextResponse(bytes, {
    headers: {
      "content-type": meta.mime,
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
    },
  });
}
