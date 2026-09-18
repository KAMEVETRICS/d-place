# D place

A Nimiq Pay Mini App stall for knowledge and funded work. Paid in NIM.

Username sits next to the wallet. Bounty owners pick how many winners.

Landing: [deplace.space](https://deplace.space). Stall: [app.deplace.space/app](https://app.deplace.space/app). Handbook: [docs.deplace.space](https://docs.deplace.space). Source docs live in `gitbook/`; GitBook Git Sync reads `gitbook-docs.yaml` at the repo root.

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
nimiqpay://miniapp?url=https://app.deplace.space/app
https://nimpay.app/miniapps/open/https://app.deplace.space/app
```

In a browser, Connect with Hub. Open app on the landing page jumps to `app.deplace.space`.

## Env

See `.env.example`. `ESCROW_ADDRESS` is required for bounties.

## License

MIT
