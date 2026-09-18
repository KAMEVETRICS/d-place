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
| `ESCROW_ADDRESS` | NQ address that receives bounty prizes. Required for bounties |
| `NEXT_PUBLIC_DOCS_URL` | Published handbook. Live value: `https://docs.deplace.space` |
| `NEXT_PUBLIC_APP_URL` | Stall origin. Live value: `https://app.deplace.space` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Support mailbox for the Support page |

## GitBook

Git Sync creates the site from `gitbook-docs.yaml` at the repository root. That file maps the Handbook space to `./gitbook`. Keep `gitbook/.gitbook.yaml`, `gitbook/README.md`, and `gitbook/SUMMARY.md` in place.

Published site: [docs.deplace.space](https://docs.deplace.space). That hostname is owned by GitBook DNS, not this VPS.

## Mini App URL

Point Nimiq Pay at the app host:

```
https://app.deplace.space/app
```

Landing stays at `https://deplace.space/`. Inside Pay, `/` redirects to `/app`.

### App subdomain checklist

1. DNS at your registrar for `deplace.space`:
   - `A` record: `app` → VPS IPv4 (`169.58.20.173`)
   - Optional `AAAA` record: `app` → VPS IPv6
2. Reverse proxy (Caddy) serves `app.deplace.space` to the same Next process as the apex.
3. Rebuild after setting `NEXT_PUBLIC_*` env values. Those are baked in at build time.
4. Register the Mini App URL in Nimiq Pay as `https://app.deplace.space/app`.

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
- Keep `NEXT_PUBLIC_DOCS_URL=https://docs.deplace.space`
- Point `app.deplace.space` DNS at the VPS and register that Mini App URL in Pay
- Set `NEXT_PUBLIC_SUPPORT_EMAIL` when the mailbox exists
- Delist any leftover duplicate live titles from early tests
