export const LUNA_PER_NIM = 100_000;

export function nimToLuna(nim: number) {
  if (!Number.isFinite(nim) || nim < 0) throw new Error("Invalid NIM amount");
  return Math.round(nim * LUNA_PER_NIM);
}

export function lunaToNim(luna: number) {
  return luna / LUNA_PER_NIM;
}

export function formatNim(luna: number) {
  const nim = lunaToNim(luna);
  return Number.isInteger(nim) ? `${nim} NIM` : `${nim.toFixed(2)} NIM`;
}

export function explorerTx(hash: string) {
  if (hash.startsWith("demo:")) return null;
  return `https://nimiq.watch/#${hash}`;
}
