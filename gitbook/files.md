# Files

Paid media lives under `data/files/` on the host. The stall sniffs bytes. It does not trust the browser’s content-type alone.

## Allowed types

PDF, ZIP, plain text, Markdown, PNG, JPEG, WebP, MP4.

Maximum size: **10 MB**.

Anything else is rejected, including files whose magic bytes do not match.

## Who can read a file

The owner, or a wallet with an entitlement on a listing that points at that file. Unauthenticated requests get 403.

The file route can show the bytes **inline** (image, video, PDF, text) or `?download=1` as an attachment.

## Bounty submissions

A submitter may attach a file they uploaded, or an http(s) work link, plus a note. The file still has to belong to their wallet.
