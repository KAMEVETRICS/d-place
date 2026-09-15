"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BountyCard, ContentCard, ContentDetail } from "@/types";
import { Banner, Empty, Field, Icon, Meter, Money, SearchField, Skeleton, formData, type IconName } from "./ui";
import { BountyTeaser } from "./bounties";
import { PaidFile, Report, SaveButton, TxLink, hay, useLoad } from "./shared";
import { useSession } from "./session";
import { payError } from "./wallet";
import { formatNim } from "@/money";
import { isNimiqAddress } from "@/address";
import { categoryLabel, groupByCategory } from "@/categories";
import { post } from "./api";

function catIcon(id: string): IconName {
  if (id === "data" || id === "code" || id === "design" || id === "writing" || id === "video" || id === "music" || id === "business" || id === "education") {
    return id;
  }
  return "other";
}

function CategoryTiles({ items }: { items: ContentCard[] }) {
  const groups = groupByCategory(items);
  if (groups.length < 2) return null;
  return (
    <div className="cat-grid">
      {groups.map((g) => (
        <a key={g.id} className="cat-tile" href={`#cat-${g.id}`}>
          <Icon name={catIcon(g.id)} />
          <strong>{g.label}</strong>
          <span className="meta">
            {g.items.length} listing{g.items.length === 1 ? "" : "s"}
          </span>
        </a>
      ))}
    </div>
  );
}

export function ListingsByCategory({
  items,
  progress,
}: {
  items: ContentCard[];
  progress?: Map<string, number>;
}) {
  return (
    <div className="stack">
      <CategoryTiles items={items} />
      {groupByCategory(items).map((group) => (
        <section key={group.id} id={`cat-${group.id}`} className="stack section-anchor">
          <h2>{group.label}</h2>
          <div className="grid two">
            {group.items.map((c) => (
              <ListingCard key={c.id} item={c} progress={progress?.get(c.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function ListingCard({ item, progress }: { item: ContentCard; progress?: number }) {
  return (
    <article className="card">
      <Link className="card-body" href={`/c/${item.id}`}>
        <div className="kicker">
          {item.type} · {categoryLabel(item.category)}
        </div>
        <h4>{item.title}</h4>
        <p>{item.description}</p>
      </Link>
      {progress != null ? <Meter value={progress} label={`${progress}% finished`} /> : null}
      <div className="card-foot">
        <Money luna={item.priceLuna} />
        <span className="meta">@{item.creatorUsername}</span>
        {item.ratingCount ? (
          <span className="meta">
            {item.ratingAvg.toFixed(1)} / 5 ({item.ratingCount})
          </span>
        ) : null}
        {item.owned ? <span className="badge quiet">In your library</span> : null}
        {!isNimiqAddress(item.creatorWallet) ? <span className="kicker">Demo seller</span> : null}
      </div>
      <div className="card-foot">
        <SaveButton kind="content" id={item.id} saved={item.saved} />
        <Link className={`btn ${item.owned ? "" : "gold"}`} href={`/c/${item.id}`}>
          <Icon name={item.owned ? "library" : "lock"} />
          {item.owned ? "Open" : "Unlock"}
        </Link>
      </div>
    </article>
  );
}

export function Discover() {
  const { data, error, loading } = useLoad<{ listings: ContentCard[]; bounties: BountyCard[] }>("feed");
  const [q, setQ] = useState("");
  if (loading) return <Skeleton label="Loading the counter" />;
  if (error) return <Banner kind="err">{error}</Banner>;
  const listings = (data?.listings ?? []).filter((c) => hay(q, c.title, c.description, c.creatorUsername, categoryLabel(c.category)));
  const bounties = (data?.bounties ?? []).filter((b) => hay(q, b.title, b.brief, b.sponsorUsername, categoryLabel(b.category)));
  return (
    <div className="stack page">
      <div>
        <h1>Shop</h1>
        <p className="lede">Unlock a listing, publish what you know, or take a funded bounty.</p>
      </div>
      <SearchField label="Search the stall" value={q} onChange={setQ} />
      <section className="stack">
        <h2>Open prizes</h2>
        {bounties.length === 0 ? (
          <Empty
            title={q ? "No prizes match that" : "No funded bounties yet"}
            body={q ? "Try another word, or clear the search." : "A bounty only goes live after the prize is paid into escrow."}
            action={
              q ? null : (
                <Link className="btn" href="/create">
                  <Icon name="coin" />
                  Fund a bounty
                </Link>
              )
            }
          />
        ) : (
          <div className="grid">
            {bounties.map((b, i) => (
              <BountyTeaser key={b.id} bounty={b} featured={i === 0 && !q} />
            ))}
          </div>
        )}
      </section>
      <section className="stack">
        <h2>On the stall</h2>
        {listings.length === 0 ? (
          <Empty
            title={q ? "No listings match that" : "The stall is empty"}
            body={q ? "Try another word, or clear the search." : "Publish a course, guide, or template and price it in NIM."}
            action={
              q ? null : (
                <Link className="btn" href="/create">
                  <Icon name="paper" />
                  Publish a listing
                </Link>
              )
            }
          />
        ) : (
          <ListingsByCategory items={listings} />
        )}
      </section>
    </div>
  );
}

export function Learn() {
  const { data, error, loading } = useLoad<{ items: ContentCard[] }>("catalog");
  const [q, setQ] = useState("");
  if (loading) return <Skeleton label="Loading listings" />;
  if (error) return <Banner kind="err">{error}</Banner>;
  const items = (data?.items ?? []).filter((c) => hay(q, c.title, c.description, c.creatorUsername, categoryLabel(c.category)));
  return (
    <div className="stack page">
      <div>
        <h1>Listings</h1>
        <p>Courses, guides, and templates priced in NIM. What you buy stays in your library.</p>
      </div>
      <SearchField label="Search listings" value={q} onChange={setQ} />
      {items.length === 0 ? (
        <Empty
          title={q ? "No listings match that" : "Nothing listed"}
          body={q ? "Try another word, or clear the search." : "Be the first stallholder."}
        />
      ) : (
        <ListingsByCategory items={items} />
      )}
    </div>
  );
}

export function Listing({ id }: { id: string }) {
  const { wallet, pay, refresh } = useSession();
  const { data, error, loading, reload } = useLoad<{
    item: ContentDetail;
    relatedBounties: BountyCard[];
    pending: { status: string; txHash: string } | null;
    receipt: { amountLuna: number; txHash: string } | null;
  }>(`content/${id}`);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [txHash, setTxHash] = useState("");
  const [confirming, setConfirming] = useState(false);
  const item = data?.item;
  const pendingHash = txHash || data?.pending?.txHash || "";
  useEffect(() => {
    if (!pendingHash || data?.item?.body) return;
    let stop = false;
    let n = 0;
    async function tick() {
      n += 1;
      try {
        const res = await post<{ owned?: boolean }>("purchase", { contentId: id, txHash: pendingHash });
        if (stop) return;
        if (res.owned) {
          await refresh();
          reload();
          return;
        }
      } catch {
        /* chain not ready */
      }
      if (!stop && n < 8) window.setTimeout(tick, 2500);
    }
    tick();
    return () => {
      stop = true;
    };
  }, [id, pendingHash, data?.item?.body]);
  async function confirm(hash: string) {
    const res = await post<{ owned?: boolean; status?: string }>("purchase", { contentId: item!.id, txHash: hash });
    if (res.owned) {
      await refresh();
      reload();
      setStatus("");
      setConfirming(false);
      return true;
    }
    setStatus("NIM already left your wallet. Waiting for the chain to confirm it.");
    return false;
  }
  async function unlock() {
    if (!item) return;
    if (!wallet) {
      setErr("Wallet disconnected. Connect from the header.");
      return;
    }
    if (!confirming) {
      setConfirming(true);
      setErr("");
      setStatus("");
      return;
    }
    setErr("");
    setStatus("A Hub window should open. Approve the payment there.");
    try {
      const hash = await pay({
        recipient: item.creatorWallet,
        amountLuna: item.priceLuna,
        memo: `dplace:content:${item.id}`,
      });
      setTxHash(hash);
      setStatus("NIM sent. Confirming on the Nimiq chain…");
      await confirm(hash);
    } catch (e) {
      setErr(payError(e));
      setStatus("failed");
    }
  }
  if (loading) return <Skeleton label="Opening listing" />;
  if (error || !item) return <Banner kind="err">{error || "Missing listing."}</Banner>;
  const related = data?.relatedBounties ?? [];
  const demoSeller = !isNimiqAddress(item.creatorWallet);
  const realBuyer = Boolean(wallet) && isNimiqAddress(wallet);
  return (
    <div className="stack page">
      <div className="page-head">
        <Link href="/learn" className="icon-btn" aria-label="Back to listings">
          <Icon name="back" />
        </Link>
        <SaveButton kind="content" id={item.id} saved={item.saved} />
      </div>
      <div className="kicker">
        {item.type} · {categoryLabel(item.category)}
        {demoSeller ? " · demo seller" : ""}
      </div>
      <h1>{item.title}</h1>
      <p>
        by <Link href={`/u/${item.creatorUsername}`}>@{item.creatorUsername}</Link>
      </p>
      <div className="row">
        <Money luna={item.priceLuna} />
      </div>
      <p>{item.description}</p>
      {demoSeller ? (
        <Banner>
          @{item.creatorUsername} is a seeded demo account, not an NQ wallet. Real NIM cannot be sent here.
          Publish a listing from your Hub wallet to receive NIM, or sign out and use Demo Bob to walk the fake loop.
        </Banner>
      ) : null}
      <section className="stack">
        <h2>Preview</h2>
        <div className="well">
          <p>{item.preview}</p>
        </div>
      </section>
      {item.body ? (
        <section className="stack">
          <h2>Unlocked</h2>
          {item.status === "delisted" ? (
            <Banner>This listing is off the stall. You still have what you paid for.</Banner>
          ) : null}
          {data?.receipt ? (
            <Banner kind="ok">
              Paid {formatNim(data.receipt.amountLuna)} to @{item.creatorUsername}.{" "}
              <TxLink hash={data.receipt.txHash} />
            </Banner>
          ) : null}
          <pre className="body">{item.body}</pre>
          {item.fileId ? (
            <PaidFile id={item.fileId} mime={item.fileMime} name={item.fileName} />
          ) : null}
          <Progress id={item.id} />
          <ReviewForm id={item.id} />
          {wallet === item.creatorWallet && item.status === "live" ? (
            <button
              className="btn ghost"
              onClick={async () => {
                await post("content/delist", { id: item.id });
                location.reload();
              }}
            >
              <Icon name="close" />
              Remove from stall
            </button>
          ) : null}
        </section>
      ) : (
        <div className="stack">
          {!wallet ? <Banner kind="err">Wallet disconnected. Connect from the header to pay.</Banner> : null}
          {confirming && !status ? (
            <Banner>
              You will pay {formatNim(item.priceLuna)} to @{item.creatorUsername}
              {isNimiqAddress(item.creatorWallet) ? ` (${item.creatorWallet})` : ""}. Hub opens a popup; allow it.
              NIM goes to that wallet, not to D place.
            </Banner>
          ) : null}
          {status && status !== "failed" ? <Banner>{status}</Banner> : null}
          {err ? <Banner kind="err">{err}</Banner> : null}
          {txHash || data?.pending?.txHash ? <TxLink hash={txHash || data!.pending!.txHash} /> : null}
          {demoSeller && realBuyer ? null : data?.pending || (txHash && status !== "failed" && !item.body) ? (
            <div className="pay-bar">
              <button
                className="btn gold"
                onClick={() => confirm(txHash || data?.pending?.txHash || "")}
                disabled={!(txHash || data?.pending?.txHash)}
              >
                <Icon name="check" />
                Check the chain again
              </button>
            </div>
          ) : (
            <div className="pay-bar">
              <button className="btn gold" onClick={unlock} disabled={!wallet || Boolean(status) && status !== "failed"}>
                <Icon name="lock" />
                {confirming ? `Pay ${formatNim(item.priceLuna)}` : "Unlock with NIM"}
              </button>
              {confirming ? (
                <button className="btn ghost" type="button" onClick={() => setConfirming(false)}>
                  <Icon name="back" />
                  Back
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}
      {related.length ? (
        <section className="stack">
          <h2>Funded work for this skill</h2>
          {related.map((b) => (
            <BountyTeaser key={b.id} bounty={b} />
          ))}
        </section>
      ) : null}
      <Report targetType="content" targetId={item.id} />
    </div>
  );
}

function Progress({ id }: { id: string }) {
  return (
    <form
      className="row"
      onSubmit={async (e) => {
        e.preventDefault();
        await post("progress", { contentId: id, percent: 100 });
      }}
    >
      <button className="btn ghost" type="submit">
        <Icon name="check" />
        Mark finished
      </button>
    </form>
  );
}

function ReviewForm({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  if (done) return <Banner kind="ok">Rating saved.</Banner>;
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = formData(e);
        await post("reviews", { targetType: "content", targetId: id, rating: Number(f.rating), text: f.text });
        setDone(true);
      }}
    >
      <h3>Rate this listing</h3>
      <label className="field">
        <span>Stars</span>
        <select name="rating" defaultValue="5">
          <option value="5">5</option>
          <option value="4">4</option>
          <option value="3">3</option>
          <option value="2">2</option>
          <option value="1">1</option>
        </select>
      </label>
      <Field name="text" label="Note" textarea />
      <button className="btn" type="submit">
        <Icon name="check" />
        Save rating
      </button>
    </form>
  );
}
