import { init, type NimiqProvider, type SignatureResult } from "@nimiq/mini-app-sdk";

export type PayRequest = {
  recipient: string;
  amountLuna: number;
  memo: string;
};

export type LoginProof = {
  wallet: string;
  signature: string;
  publicKey?: string;
};

let provider: Promise<NimiqProvider> | null = null;

export function inPay() {
  return typeof window !== "undefined" && Boolean(window.nimiqPay);
}

function toHex(value: Uint8Array | string) {
  if (typeof value === "string") {
    if (/^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0) return value.toLowerCase();
    return [...new TextEncoder().encode(value)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return [...value].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getNimiq() {
  provider ??= init({ timeout: 12_000 }).catch((err: unknown) => {
    provider = null;
    throw err;
  });
  return provider;
}

export async function payAccounts() {
  const nimiq = await getNimiq();
  const accounts = await nimiq.listAccounts();
  if ("error" in accounts) throw new Error(accounts.error.message);
  if (!accounts[0]) throw new Error("No Nimiq account in this wallet.");
  return accounts;
}

export async function signInPay(message: string): Promise<LoginProof> {
  const accounts = await payAccounts();
  const nimiq = await getNimiq();
  const signed = await nimiq.sign(message);
  if ("error" in signed) throw new Error(signed.error.message);
  const proof = signed as SignatureResult;
  return {
    wallet: accounts[0],
    publicKey: toHex(proof.publicKey),
    signature: toHex(proof.signature),
  };
}

export async function sendNim(req: PayRequest) {
  const nimiq = await getNimiq();
  const result = await nimiq.sendBasicTransactionWithData({
    recipient: req.recipient,
    value: req.amountLuna,
    data: req.memo,
  });
  if (typeof result !== "string") throw new Error(result.error.message);
  return result;
}

export async function hubPay(req: PayRequest) {
  const HubApi = (await import("@nimiq/hub-api")).default;
  const hub = new HubApi("https://hub.nimiq.com");
  const result = await hub.checkout({
    appName: "D place",
    recipient: req.recipient,
    value: req.amountLuna,
    extraData: new TextEncoder().encode(req.memo),
  });
  return result.hash;
}

export async function hubLogin(message: string): Promise<LoginProof> {
  const HubApi = (await import("@nimiq/hub-api")).default;
  const hub = new HubApi("https://hub.nimiq.com");
  const signed = await hub.signMessage({ appName: "D place", message });
  return {
    wallet: signed.signer,
    publicKey: toHex(signed.signerPublicKey),
    signature: toHex(signed.signature),
  };
}

export function demoHash(from: string, req: PayRequest) {
  return `demo:${[from, req.recipient, String(req.amountLuna), req.memo].map(encodeURIComponent).join("~")}`;
}

export function payError(e: unknown) {
  const m = e instanceof Error ? e.message : "Payment failed.";
  if (/cancel|closed|abort|denied|reject/i.test(m)) {
    return "You closed Hub without paying. No NIM left your wallet.";
  }
  return m;
}
