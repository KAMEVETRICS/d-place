# Publishing

Create → **Listing**. You need a username.

## Types

- **Course**
- **Guide**
- **Template**

## Fields

| Field | Rule |
|---|---|
| Title | Required, 120 characters. You cannot have two **live** listings with the same title (compared case-insensitive) |
| Description | Required, 2000 |
| Preview | Public text on the stall, 2000 |
| Body | Paid text, 20,000 |
| Category | One of the stall categories |
| Price | NIM, 0 up to 1,000,000 |
| File | Optional. Must already be yours. See [Files](files.md) |

Price 0 is allowed. It still creates an entitlement when someone “unlocks” it, and the chain check still expects a matching transaction of 0 luna only if you go through pay. Prefer a real price for paid work.

## After it is live

The listing appears on Shop and Listings under its category. Your public profile lists it.

**Remove from stall** sets status to `delisted`. It leaves the catalog. Existing library access stays.

You cannot edit a live listing in this version. To change copy, delist and publish a new title (or reuse the title once the old one is not live).

## Duplicate titles

The stall blocks a second **live** row with the same title from the same wallet. Titles from before that check may still exist as duplicates. Delist the extra ones.
