import { blake2b } from "@noble/hashes/blake2.js";

const BASE32 = "0123456789ABCDEFGHJKLMNPQRSTUVXY";

function toBase32(bytes: Uint8Array) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function ibanCheck(str: string) {
  const num = [...str.toUpperCase()]
    .map((c) => {
      const code = c.charCodeAt(0);
      return code >= 48 && code <= 57 ? c : String(code - 55);
    })
    .join("");
  let tmp = "";
  for (let i = 0; i < num.length; i += 6) {
    tmp = String(Number(tmp + num.slice(i, i + 6)) % 97);
  }
  return 98 - Number(tmp);
}

export function normalizeAddress(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function addressFromPublicKey(publicKey: Uint8Array) {
  if (publicKey.length !== 32) throw new Error("Nimiq public key must be 32 bytes.");
  const hash = blake2b(publicKey, { dkLen: 32 }).subarray(0, 20);
  const base32 = toBase32(hash);
  const check = String(ibanCheck(base32 + "NQ00")).padStart(2, "0");
  const raw = `NQ${check}${base32}`;
  return raw.replace(/(.{4})/g, "$1 ").trim();
}

export function sameAddress(a: string, b: string) {
  return normalizeAddress(a) === normalizeAddress(b);
}

export function isNimiqAddress(value: string) {
  const compact = normalizeAddress(value);
  return compact.startsWith("NQ") && compact.length === 36 && !compact.startsWith("NQDEMO");
}
