# Payments

## Listing purchase

- **From:** buyer wallet
- **To:** seller’s NQ address on the listing
- **Amount:** listing `price_luna`
- **Memo:** `dplace:content:{listing-id}`

The stall verifies the transaction on the configured RPC. Pending hashes are stored. A later confirm of the same hash grants the entitlement once.

## Bounty fund

- **To:** `ESCROW_ADDRESS` (or `demo:escrow` when demo payments are on and escrow is unset)
- **Memo:** `dplace:bounty:{id}`

## Bounty payout

- **From:** escrow if it is a real NQ, otherwise the owner wallet in demo
- **To:** winner
- **Memo:** `dplace:payout:{id}`

## Bounty refund

- **From:** escrow or owner (demo)
- **To:** bounty owner
- **Memo:** `dplace:refund:{id}`

## Explorer

Real hashes link to `https://nimiq.watch/#{hash}`. Hashes that start with `demo:` have no explorer link.

## Closing Hub

If you close Hub without finishing checkout, D place reports that no NIM left the wallet. That is not a failed chain payment. It is a cancelled Hub session.

## What this escrow is not

Nimiq Pay Mini App has no native HTLC or listing-level multisig in the SDK used here. Escrow is an address the operator controls, plus the stall’s records. Treat `ESCROW_ADDRESS` as a hot wallet you actually operate.
