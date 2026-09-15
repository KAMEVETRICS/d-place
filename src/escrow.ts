import { findPayment, getTransaction, txMatches } from "./rpc";

async function confirmed(hash: string, expected: { from: string; to: string; value: number; data?: string }) {
  const tx = await getTransaction(hash);
  if (tx && txMatches(tx, expected)) return true;
  return Boolean(await findPayment(expected));
}

export type FundIntent = {
  recipient: string;
  amountLuna: number;
  memo: string;
};

export function escrowAddress() {
  const address = process.env.ESCROW_ADDRESS;
  if (address) return address;
  if (process.env.DEMO_PAYMENTS === "1") return "demo:escrow";
  throw new Error("ESCROW_ADDRESS is not set");
}

export function fundIntent(bountyId: string, amountLuna: number): FundIntent {
  return {
    recipient: escrowAddress(),
    amountLuna,
    memo: `dplace:bounty:${bountyId}`,
  };
}

export async function verifyFunding(args: {
  bountyId: string;
  txHash: string;
  from: string;
  amountLuna: number;
}) {
  const intent = fundIntent(args.bountyId, args.amountLuna);
  return confirmed(args.txHash, {
    from: args.from,
    to: intent.recipient,
    value: intent.amountLuna,
    data: intent.memo,
  });
}

export async function verifyPurchase(args: {
  contentId: string;
  txHash: string;
  from: string;
  to: string;
  amountLuna: number;
}) {
  return confirmed(args.txHash, {
    from: args.from,
    to: args.to,
    value: args.amountLuna,
    data: `dplace:content:${args.contentId}`,
  });
}

export async function verifyPayout(args: {
  bountyId: string;
  txHash: string;
  from: string;
  to: string;
  amountLuna: number;
}) {
  return confirmed(args.txHash, {
    from: args.from,
    to: args.to,
    value: args.amountLuna,
    data: `dplace:payout:${args.bountyId}`,
  });
}

export async function verifyRefund(args: {
  bountyId: string;
  txHash: string;
  from: string;
  to: string;
  amountLuna: number;
}) {
  return confirmed(args.txHash, {
    from: args.from,
    to: args.to,
    value: args.amountLuna,
    data: `dplace:refund:${args.bountyId}`,
  });
}
