import { NextResponse } from "next/server";
import { migrate, run } from "./db";
import { profileFor, readSession } from "./auth";

let ready: Promise<void> | null = null;

export function boot() {
  ready ??= migrate();
  return ready;
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function authed() {
  const wallet = await readSession();
  if (!wallet) return { wallet: null, profile: null };
  return { wallet, profile: await profileFor(wallet) };
}

export function needUser(wallet: string | null, hasProfile: boolean) {
  if (!wallet) return json({ error: "Connect a wallet first." }, 401);
  if (!hasProfile) return json({ error: "Pick a username to continue." }, 403);
  return null;
}

export async function guest() {
  await boot();
  return authed();
}

export async function mustUser() {
  const { wallet, profile } = await guest();
  const gate = needUser(wallet, Boolean(profile));
  if (gate) return { ok: false as const, res: gate };
  return { ok: true as const, wallet: wallet!, profile: profile! };
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  return (await req.json().catch(() => ({}))) as Record<string, unknown>;
}

export function str(body: Record<string, unknown>, key: string) {
  const v = body[key];
  if (v == null) return "";
  return String(v);
}

export async function track(wallet: string | null, name: string, payload: unknown) {
  await run("INSERT INTO events (wallet, name, payload, created_at) VALUES (?, ?, ?, ?)", [
    wallet,
    name,
    JSON.stringify(payload ?? {}),
    Date.now(),
  ]);
}
