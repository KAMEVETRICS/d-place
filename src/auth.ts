import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import * as ed from "@noble/ed25519";
import { sha256 } from "@noble/hashes/sha2.js";
import { addressFromPublicKey, sameAddress } from "./address";
import { q, run } from "./db";

const COOKIE = "dplace_session";
const USERNAME = /^[a-z0-9_]{3,20}$/;

export function demoEnabled() {
  return process.env.DEMO_PAYMENTS === "1";
}

export function loginMessage(nonce: string) {
  return `D place login ${nonce}`;
}

export function validUsername(value: string) {
  return USERNAME.test(value);
}

export async function issueChallenge() {
  const nonce = randomBytes(16).toString("hex");
  await run("INSERT INTO challenges (nonce, created_at) VALUES (?, ?)", [nonce, Date.now()]);
  return nonce;
}

const CHALLENGE_MS = 10 * 60 * 1000;

export async function consumeChallenge(nonce: string) {
  await run("DELETE FROM challenges WHERE created_at < ?", [Date.now() - CHALLENGE_MS]);
  const rows = await q<{ nonce: string; created_at: number }>(
    "SELECT nonce, created_at FROM challenges WHERE nonce = ?",
    [nonce],
  );
  const row = rows[0];
  if (!row) return false;
  await run("DELETE FROM challenges WHERE nonce = ?", [nonce]);
  return Date.now() - row.created_at <= CHALLENGE_MS;
}

export async function createSession(wallet: string) {
  const token = randomUUID();
  await run("INSERT INTO sessions (token, wallet, created_at) VALUES (?, ?, ?)", [
    token,
    wallet,
    Date.now(),
  ]);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return token;
}

export async function readSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const rows = await q<{ wallet: string }>("SELECT wallet FROM sessions WHERE token = ?", [token]);
  return rows[0]?.wallet ?? null;
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await run("DELETE FROM sessions WHERE token = ?", [token]);
  jar.delete(COOKIE, { path: "/", secure: process.env.NODE_ENV === "production" });
}

export async function profileFor(wallet: string) {
  const rows = await q<{
    wallet: string;
    username: string;
    display_name: string;
    bio: string;
    created_at: number;
  }>("SELECT wallet, username, display_name, bio, created_at FROM profiles WHERE wallet = ?", [
    wallet,
  ]);
  return rows[0] ?? null;
}

export function demoWalletOk(wallet: string, signature: string) {
  if (!demoEnabled()) return false;
  return wallet.startsWith("demo:") && signature === `demo-sig:${wallet}`;
}

function fromHex(hex: string) {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex.replace(/\s+/g, "");
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function signatureMatches(message: string, publicKey: Uint8Array, signature: Uint8Array) {
  const utf8 = new TextEncoder().encode(message);
  if (await ed.verifyAsync(signature, utf8, publicKey)) return true;
  const hub = sha256(new TextEncoder().encode(`\x16Nimiq Signed Message:\n${message.length}${message}`));
  return ed.verifyAsync(signature, hub, publicKey);
}

export async function verifyLogin(args: {
  wallet: string;
  nonce: string;
  signature: string;
  publicKey?: string;
}) {
  if (demoWalletOk(args.wallet, args.signature)) return true;
  const publicKey = fromHex(args.publicKey ?? "");
  const signature = fromHex(args.signature);
  if (!publicKey || publicKey.length !== 32 || !signature || signature.length !== 64) return false;
  if (!sameAddress(args.wallet, addressFromPublicKey(publicKey))) return false;
  return signatureMatches(loginMessage(args.nonce), publicKey, signature);
}
