# Bounties

A bounty is a funded job. It is not public until the prize is on chain.

## Create

Create → **Bounty**.

| Field | Rule |
|---|---|
| Title | 120 characters |
| Brief | 4000 |
| Deliverables | 4000 |
| Category | Stall categories |
| Winner count | Whole number from 1 to 50. You choose this. The stall does not force a single winner |
| Prize | NIM, at least 0.01, at most 1,000,000 |
| Deadline | Must be in the future |

The host must have `ESCROW_ADDRESS` set to a Nimiq address. Otherwise create fails.

State after create: `funding`. Not on Shop or Bounties yet.

## Fund

The owner pays the prize to the escrow address. Memo: `dplace:bounty:{id}`.

When the chain confirms from, to, amount, and memo, the bounty becomes `open` and appears on the stall.

## Submit work

While `open` and before the deadline: one submission per wallet. You need a work link (http or https) or a file you own, and a note (2000 characters).

## Review and winners

The owner can **Close submissions** (`review`), then pick between 1 and `winner_count` submissions.

The prize is split evenly in luna. Any remainder luna goes to the first winner.

State becomes `payout_pending`. Each winner has a pending payout. Memo for those sends: `dplace:payout:{bounty-id}`.

The owner (or the escrow key, when `ESCROW_ADDRESS` is a real NQ) sends each payout. D place confirms each hash. When none remain unpaid, the bounty is `paid`.

## Cancel and refund

| State | Cancel |
|---|---|
| `funding` (not yet paid in) | Cancel in place. No chain tx |
| `open`, no submissions | Refund the prize from escrow back to the owner. Memo `dplace:refund:{id}` |
| `open` with submissions | Cancel is blocked |

## Dispute

Owner or a marked winner can open a dispute from `payout_pending`. Resolve as **paid** or start a **refund** of the prize to the owner.

This is operator-shaped: the escrow key must actually send the NIM. The stall records the hash; it is not a Nimiq native multisig.

## States

`funding` → `open` → `review` → `payout_pending` → `paid`

Also: `cancelled`, `refunded`, `disputed`.
