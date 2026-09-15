# Demo wallets

Alice (`demo:alice`) and Bob (`demo:bob`) exist so you can click through the stall on a machine that is not inside Nimiq Pay.

They appear only when:

- `DEMO_PAYMENTS=1`
- The page is **not** hosted inside Nimiq Pay (`window.nimiq` is absent)

They never intercept a real Pay session.

## What they cannot do

- Receive real NIM. A Hub/NQ buyer cannot pay a demo seller.
- Be used as `ESCROW_ADDRESS` in production. Demo escrow is `demo:escrow` and only when demo payments are on.

Turn `DEMO_PAYMENTS` off on a public host before you take real buyers.
