# Getting started

## Browser (Nimiq Hub)

1. Open the landing page and choose **Open app**.
2. You can Skip the intro. The stall is at `/app`.
3. Choose **Connect with Hub**. Allow the popup.
4. Pick or create a Nimiq account.
5. Sign the login message. D place checks the signature and that the public key maps to that NQ address.
6. On **Me**, pick a username. You cannot publish, buy, submit, or save until this is set.

If the Hub account is empty, get NIM at [wallet.nimiq.com](https://wallet.nimiq.com).

Closing Hub without signing is not a payment. Nothing leaves the wallet.

## Nimiq Pay

Register the stall host as a Mini App. Pay should load `/app`.

Inside Pay the injected provider:

1. Lists the account (`listAccounts`)
2. Signs login (`sign`)
3. Sends NIM with a memo (`sendBasicTransactionWithData`)

There is no Hub popup inside Pay. Demo Alice and Bob never appear in a Pay session.

Open a Mini App from Pay with:

```
nimiqpay://miniapp?url=https://YOUR_DOMAIN/app
https://nimpay.app/miniapps/open/https://YOUR_DOMAIN/app
```

Use HTTPS. Hub and Pay will not treat a plain `http://` host as a production Mini App.

## Username

- Required next to the wallet for stall actions
- 3–20 characters: `a-z`, `0-9`, underscore
- Unique
- Chosen once. Later you can change display name (40 characters) and bio (280). You cannot rename the `@handle`

Until a username exists, the header says to pick one.

## Sign out

Header door icon, or **Sign out** on Me. That clears the D place session on this browser. It does not empty the Nimiq wallet.

On Me, a demo session can **Switch to Hub** to attach a real account.
