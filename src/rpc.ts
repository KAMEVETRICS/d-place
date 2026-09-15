import { blake2b } from "@noble/hashes/blake2.js";
import { sameAddress } from "./address";

export type ChainTx = {
  hash: string;
  from: string;
  to: string;
  value: number;
  data: string;
};

const DEFAULT_RPC = "https://rpc.nimiqwatch.com";

function demoAllowed() {
  return process.env.DEMO_PAYMENTS === "1";
}

function rpcUrl() {
  return process.env.NIMIQ_RPC || DEFAULT_RPC;
}

function hexToBytes(hex: string) {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) return null;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function decodeData(raw: string) {
  if (!raw) return "";
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
    try {
      return new TextDecoder().decode(hexToBytes(raw) ?? new Uint8Array());
    } catch {
      return raw;
    }
  }
  return raw;
}

function looksLikeHash(value: string) {
  return /^[0-9a-fA-F]{64}$/.test(value);
}

async function rpc<T>(method: string, params: unknown[]): Promise<T | null> {
  const res = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = (await res.json()) as {
    result?: { data?: T } | T;
    error?: { message: string };
  };
  if (body.error || body.result === undefined) return null;
  if (body.result && typeof body.result === "object" && "data" in body.result) {
    return (body.result as { data: T }).data ?? null;
  }
  return body.result as T;
}

function asTx(row: {
  hash: string;
  from: string;
  to: string;
  value: number;
  data?: string;
  recipientData?: string;
}): ChainTx {
  return {
    hash: row.hash,
    from: row.from,
    to: row.to,
    value: row.value,
    data: decodeData(row.recipientData ?? row.data ?? ""),
  };
}

async function fetchByHash(hash: string): Promise<ChainTx | null> {
  const row = await rpc<{
    hash: string;
    from: string;
    to: string;
    value: number;
    data?: string;
    recipientData?: string;
  } | null>("getTransactionByHash", [hash]);
  return row ? asTx(row) : null;
}

export async function getTransaction(hashOrRaw: string): Promise<ChainTx | null> {
  if (hashOrRaw.startsWith("demo:")) {
    if (!demoAllowed()) return null;
    const packed = hashOrRaw.slice("demo:".length).split("~");
    if (packed.length !== 4) return null;
    const [from, to, value, data] = packed.map(decodeURIComponent);
    return { hash: hashOrRaw, from, to, value: Number(value), data };
  }

  const hash = looksLikeHash(hashOrRaw)
    ? hashOrRaw
    : [...blake2b(hexToBytes(hashOrRaw) ?? new TextEncoder().encode(hashOrRaw), { dkLen: 32 })]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

  for (let i = 0; i < 10; i++) {
    const tx = await fetchByHash(hash);
    if (tx) return tx;
    await new Promise((r) => setTimeout(r, 400));
  }
  return fetchByHash(hash);
}

export async function findPayment(expected: {
  from: string;
  to: string;
  value: number;
  data?: string;
}): Promise<ChainTx | null> {
  const rows = await rpc<
    {
      hash: string;
      from: string;
      to: string;
      value: number;
      data?: string;
      recipientData?: string;
    }[]
  >("getTransactionsByAddress", [expected.to, 30, null]);
  if (!rows) return null;
  return rows.map(asTx).find((tx) => txMatches(tx, expected)) ?? null;
}

export function txMatches(
  tx: ChainTx,
  expected: { from?: string; to: string; value: number; data?: string },
) {
  if (!sameAddress(tx.to, expected.to)) return false;
  if (tx.value < expected.value) return false;
  if (expected.from && !sameAddress(tx.from, expected.from)) return false;
  if (expected.data && !tx.data.includes(expected.data)) return false;
  return true;
}
