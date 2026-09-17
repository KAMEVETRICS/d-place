# D place

D place is a stall for knowledge, paid in NIM. It runs as a [Nimiq Pay](https://nimpay.app) Mini App and, in a desktop browser, through [Nimiq Hub](https://hub.nimiq.com).

You list a course, guide, or template. A buyer pays the listed NIM from their wallet. The file unlocks in the browser and stays in their library. You can also fund a bounty: the prize must sit in escrow before the job is public. You choose how many winners to pay.

This handbook matches the product as it ships. It is for people who use the stall and for whoever hosts it.

## What D place is not

- Not a custodial exchange. Listing payments go to the seller’s Nimiq address. Bounty prizes go to an escrow address you configure, then out to winners.
- Not a social network. Identity is a Nimiq wallet plus a username you pick once.
- Not a place to send NIM to a name that is not an NQ address. Listing payments go to the seller’s wallet.

## Two doors

| Door | Who it is for | How you sign in |
|---|---|---|
| Open app in a browser | Desktop, Hub wallet | Connect with Hub, then sign a login message |
| Mini App inside Nimiq Pay | Phone wallet | Pay injects the account. There is no Hub popup |

Nimiq Pay should open the stall URL (`/app`), not the public landing page.

## Public pages vs the stall

| URL | What it is |
|---|---|
| `/` | Landing. What D place is, then Open app |
| `/open` | Short intro after Open app. Skip is allowed |
| `/docs` | Pointer to this GitBook |
| `/support` | How to reach us |
| `/app` | Shop. The Mini App root |
| `/learn` | Listings only |
| `/bounties` | Funded jobs |
| `/create` | New listing or bounty |
| `/library` | What you unlocked |
| `/saved` | Bookmarks |
| `/me` | Username, sign out |

## NIM

1 NIM = 100,000 luna. Prices on the stall are shown in NIM. On chain they move as luna.

Confirmed transactions are checked against a public Albatross RPC (default `https://rpc.nimiqwatch.com`). A receipt on a listing links to [nimiq.watch](https://nimiq.watch) when the hash is a real chain transaction.

## Read next

1. [Getting started](getting-started.md)
2. [Buying](buying.md) or [Publishing](publishing.md)
3. [Bounties](bounties.md) if you are funding or taking a job
4. [Operators](operators.md) if you are putting D place on a domain
