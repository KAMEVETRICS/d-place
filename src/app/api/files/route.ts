import { NextResponse } from "next/server";
import { profileFor, readSession } from "@/auth";
import { migrate } from "@/db";
import { storeUpload } from "@/files";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await migrate();
  const wallet = await readSession();
  if (!wallet) return NextResponse.json({ error: "Connect a wallet first." }, { status: 401 });
  if (!(await profileFor(wallet))) {
    return NextResponse.json({ error: "Pick a username to continue." }, { status: 403 });
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file." }, { status: 400 });
  }
  try {
    const stored = await storeUpload(wallet, file);
    return NextResponse.json(stored);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status: 400 });
  }
}
