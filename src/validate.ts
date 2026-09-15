export const LIMIT = {
  title: 120,
  description: 2000,
  preview: 2000,
  body: 20_000,
  brief: 4000,
  deliverables: 4000,
  note: 2000,
  review: 500,
  report: 500,
  url: 500,
  txHash: 200,
  eventName: 40,
  eventPayload: 2000,
  nim: 1_000_000,
  winners: 50,
} as const;

export function tooLong(label: string, value: string, max: number) {
  if (value.length > max) return `${label} must be ${max} characters or fewer.`;
  return null;
}

export function httpUrl(value: string) {
  if (value.length > LIMIT.url) return "Work link is too long.";
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "Work link must be http or https.";
  } catch {
    return "Work link must be a valid URL.";
  }
  return null;
}

export function nimCap(nim: number, min: number) {
  if (!Number.isFinite(nim) || nim < min) return min <= 0 ? "Set a NIM price." : "Set a prize in NIM.";
  if (nim > LIMIT.nim) return `NIM amount must be ${LIMIT.nim} or less.`;
  return null;
}

export function winnersCap(n: number) {
  if (!Number.isInteger(n) || n < 1 || n > LIMIT.winners) {
    return `Winner count must be a whole number from 1 to ${LIMIT.winners}.`;
  }
  return null;
}

export function txHashOk(hash: string) {
  if (!hash || hash.length > LIMIT.txHash) return "Missing or invalid transaction hash.";
  return null;
}
