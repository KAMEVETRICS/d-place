# Operators

This page is for whoever runs the host.

## Why a VPS

D place writes SQLite at `data/dplace.db` and files at `data/files/`. Those need a disk that survives deploys.

Put landing, intro, docs pointer, support, and `/app` on **one** VPS with a custom domain and TLS.

Vercel (or any ephemeral serverless host) is the wrong place for this binary until the database is remote (for example Turso) and files sit in object storage.

Fly.io or Render with a **persistent volume** is the same idea as a VPS.

## Environment

Copy `.env.example`.

| Variable | Meaning |
|---|---|
| `NIMIQ_RPC` | Albatross RPC used to confirm payments. Default `https://rpc.nimiqwatch.com` |
| `ESCROW_ADDRESS` | NQ address that receives bounty prizes. Required for live bounties when demo is off |
| `DEMO_PAYMENTS` | `1` allows Alice/Bob outside Pay. Use `0` in public beta |
| `NEXT_PUBLIC_DOCS_URL` | GitBook URL for the in-app Docs button |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Support mailbox for the Support page |

## Mini App URL

Point Nimiq Pay at:

```
https://YOUR_DOMAIN/app
```

Landing stays at `https://YOUR_DOMAIN/`. Inside Pay, `/` redirects to `/app`.

## Process

```
npm install
npm run build
npm start
```

Bind to a reverse proxy (Caddy or nginx) that terminates TLS. Persist `data/`. Back up `data/dplace.db` and `data/files/` on a schedule you actually test.

## Hub

Desktop login and checkout open Hub popups. The public origin must be HTTPS. Allow popups for the Hub domain.

## After go-live

- Set `ESCROW_ADDRESS` to an NQ you control and can spend from for winner payouts and refunds
- Set `DEMO_PAYMENTS=0`
- Publish this GitBook and set `NEXT_PUBLIC_DOCS_URL`
- Set `NEXT_PUBLIC_SUPPORT_EMAIL` when the mailbox exists
- Delist any leftover duplicate live titles from early tests
