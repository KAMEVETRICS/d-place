# D place

A Nimiq Pay Mini App stall for knowledge and funded work. Paid in NIM.

Username sits next to the wallet. Bounty owners pick how many winners.

Live host: [deplace.store](https://deplace.store) (stall at `/app`). Handbook is in `gitbook/` for GitBook.

## Run

```
npm install
cp .env.example .env.local
npm run dev
```

## Nimiq Pay

Uses `@nimiq/mini-app-sdk` `init()` inside Pay:

1. `listAccounts`
2. `sign` for login
3. `sendBasicTransactionWithData` for purchases, bounty funding, and payouts
4. Confirmation against `NIMIQ_RPC` (default `https://rpc.nimiqwatch.com`)

```
nimiqpay://miniapp?url=https://deplace.store/app
https://nimpay.app/miniapps/open/https://deplace.store/app
```

In a browser, Connect with Hub.

## Env

See `.env.example`. `ESCROW_ADDRESS` is required for live bounties. `DEMO_PAYMENTS=1` allows Alice/Bob only outside Pay.

## License

MIT
