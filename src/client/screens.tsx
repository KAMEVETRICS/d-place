"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api, post, uploadFile } from "./api";
import type { BountyCard, ContentCard, ContentDetail, Profile, SaleRow, StallStats, Submission } from "@/types";
import { Banner, Empty, Field, Icon, Meter, Money, SearchField, Skeleton, formData, type IconName } from "./ui";
import { payError, type PayRequest } from "./wallet";
import { explorerTx, formatNim } from "@/money";
import { isNimiqAddress } from "@/address";
import { CATEGORIES, categoryLabel, groupByCategory } from "@/categories";
import { LIMIT } from "@/validate";


function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    api<T>(path)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e: Error) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [path, tick]);
  return { data, error, loading, setData, reload: () => setTick((n) => n + 1) };
}

function TxLink({ hash }: { hash: string }) {
  const href = explorerTx(hash);
  if (!href) return <span className="meta">demo payment</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer">
      View on Nimiq Watch
    </a>
  );
}

function hay(q: string, ...parts: string[]) {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  return parts.some((p) => p.toLowerCase().includes(n));
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

function ListingsByCategory({
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

function SaveButton({ kind, id, saved }: { kind: "content" | "bounty"; id: string; saved: boolean }) {
  const [on, setOn] = useState(saved);
  const [err, setErr] = useState("");
  useEffect(() => {
    setOn(saved);
  }, [saved]);
  return (
    <>
      <button
        type="button"
        className="icon-btn"
        aria-pressed={on}
        aria-label={on ? "Remove save" : "Save"}
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          setErr("");
          try {
            const res = await post<{ saved: boolean }>("saves", { kind, id });
            setOn(res.saved);
          } catch (er) {
            setErr(er instanceof Error ? er.message : "Could not save.");
          }
        }}
      >
        <Icon name="saved" filled={on} />
      </button>
      {err ? <span className="meta">{err}</span> : null}
    </>
  );
}

function ListingCard({ item, progress }: { item: ContentCard; progress?: number }) {
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

function BountyTeaser({ bounty, featured }: { bounty: BountyCard; featured?: boolean }) {
  return (
    <article className={`card ${featured ? "wide ticket" : ""}`}>
      <Link className="card-body" href={`/bounties/${bounty.id}`}>
        <div className="row">
          <span className="badge">Prize funded</span>
          <span className="kicker">{categoryLabel(bounty.category)}</span>
        </div>
        <h4>{bounty.title}</h4>
        <p>{bounty.brief}</p>
      </Link>
      <div className="card-foot meta-foot">
        <Money luna={bounty.rewardLuna} />
        <span className="meta">
          {bounty.winnerCount} winner{bounty.winnerCount === 1 ? "" : "s"} · due {new Date(bounty.deadline).toLocaleDateString()}
        </span>
      </div>
      <div className="card-foot act-foot">
        <SaveButton kind="bounty" id={bounty.id} saved={bounty.saved} />
        <Link className="btn" href={`/bounties/${bounty.id}`}>
          <Icon name="coin" />
          Open
        </Link>
      </div>
    </article>
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

export function Listing({
  id,
  wallet,
  pay,
  onChange,
}: {
  id: string;
  wallet: string;
  pay: (req: PayRequest) => Promise<string>;
  onChange: () => Promise<void>;
}) {
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
          await onChange();
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
      await onChange();
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

function PaidFile({ id, mime, name }: { id: string; mime: string | null; name: string | null }) {
  const src = `/api/files/${id}`;
  const kind = mime ?? "";
  return (
    <div className="stack">
      {kind.startsWith("image/") ? (
        <div className="viewer">
          <img src={src} alt={name ?? "Attached image"} />
        </div>
      ) : null}
      {kind.startsWith("video/") ? (
        <video className="viewer" src={src} controls playsInline />
      ) : null}
      {kind === "application/pdf" || kind.startsWith("text/") ? (
        <iframe className="viewer" title={name ?? "Attached file"} src={src} />
      ) : null}
      {!kind.startsWith("image/") && !kind.startsWith("video/") && kind !== "application/pdf" && !kind.startsWith("text/") ? (
        <p className="meta">{name ?? "Attached file"} cannot play in the browser.</p>
      ) : null}
      <a className="btn ghost" href={`${src}?download=1`}>
        <Icon name="down" />
        Download{name ? ` ${name}` : ""}
      </a>
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

export function Bounties() {
  const { data, error, loading } = useLoad<{ items: BountyCard[] }>("bounties");
  const [q, setQ] = useState("");
  if (loading) return <Skeleton label="Loading bounties" />;
  if (error) return <Banner kind="err">{error}</Banner>;
  const items = (data?.items ?? []).filter((b) => hay(q, b.title, b.brief, b.sponsorUsername, categoryLabel(b.category)));
  return (
    <div className="stack page">
      <div>
        <h1>Bounties</h1>
        <p>Only prizes that are already funded appear here. Winner count is set by the owner.</p>
      </div>
      <SearchField label="Search bounties" value={q} onChange={setQ} />
      {items.length === 0 ? (
        <Empty
          title={q ? "No bounties match that" : "No live bounties"}
          body={q ? "Try another word, or clear the search." : "Fund a prize first. Until the chain confirms it, the listing stays hidden."}
          action={
            q ? null : (
              <Link className="btn" href="/create">
                <Icon name="coin" />
                Create a bounty
              </Link>
            )
          }
        />
      ) : (
        <div className="grid">
          {items.map((b) => (
            <BountyTeaser key={b.id} bounty={b} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Bounty({
  id,
  wallet,
  pay,
  onChange,
}: {
  id: string;
  wallet: string;
  pay: (req: PayRequest) => Promise<string>;
  onChange: () => Promise<void>;
}) {
  const { data, error, loading, reload } = useLoad<{
    bounty: BountyCard;
    submissions: Submission[];
    fund: { recipient: string; amountLuna: number; memo: string } | null;
  }>(`bounties/${id}`);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [fundConfirm, setFundConfirm] = useState(false);
  const b = data?.bounty;
  const mine = b?.sponsorWallet === wallet;

  async function fundIt() {
    if (!data?.fund || !b) return;
    if (!fundConfirm) {
      setFundConfirm(true);
      setErr("");
      return;
    }
    setErr("");
    setStatus("A Hub window should open. Approve the prize payment there.");
    try {
      const txHash = await pay(data.fund);
      setStatus("NIM sent to escrow. Confirming on the chain…");
      await post("bounties/fund", { bountyId: b.id, txHash });
      await onChange();
      reload();
      setStatus("");
      setFundConfirm(false);
    } catch (e) {
      setErr(payError(e));
      setStatus("");
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!b) return;
    if (!wallet) {
      setErr("Wallet disconnected. Connect from the header.");
      return;
    }
    const f = formData(e);
    const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement | null;
    setErr("");
    try {
      let fileId = "";
      if (input?.files?.[0]) fileId = (await uploadFile(input.files[0])).id;
      await post("submissions", { bountyId: b.id, assetUrl: f.assetUrl, note: f.note, fileId });
      location.reload();
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Submit failed.");
    }
  }

  async function cancelBounty() {
    if (!b) return;
    setErr("");
    try {
      const res = await post<{ state: string; refund?: PayRequest }>("bounties/cancel", { bountyId: b.id });
      if (res.refund) {
        setStatus("Approve the refund payment…");
        const txHash = await pay(res.refund);
        await post("bounties/refund", { bountyId: b.id, txHash });
      }
      location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not cancel.");
    }
  }

  async function closeReview() {
    await post("bounties/close", { bountyId: id });
    location.reload();
  }

  async function chooseWinners() {
    if (!b) return;
    setErr("");
    try {
      const res = await post<{
        payouts: { id: string; wallet: string; amountLuna: number; memo: string }[];
        from: string;
      }>("bounties/winners", { bountyId: id, winnerIds: picked });
      setStatus("Paying winners…");
      for (const p of res.payouts) {
        const txHash = await pay({ recipient: p.wallet, amountLuna: p.amountLuna, memo: p.memo });
        await post("payouts/confirm", { bountyId: id, payoutId: p.id, txHash });
      }
      await onChange();
      location.reload();
    } catch (e) {
      setErr(payError(e));
    }
  }

  if (loading) return <Skeleton label="Opening bounty" />;
  if (error || !b) return <Banner kind="err">{error || "Missing bounty."}</Banner>;
  return (
    <div className="stack page">
      <div className="page-head">
        <Link href="/bounties" className="icon-btn" aria-label="Back to bounties">
          <Icon name="back" />
        </Link>
        <SaveButton kind="bounty" id={b.id} saved={b.saved} />
      </div>
      <div className="row">
        {b.funded ? <span className="badge">Prize funded · {b.state.replace("_", " ")}</span> : <span className="kicker">Not live until funded</span>}
      </div>
      <h1>{b.title}</h1>
      <p>
        Owner <Link href={`/u/${b.sponsorUsername}`}>@{b.sponsorUsername}</Link>
      </p>
      <Money luna={b.rewardLuna} />
      <p className="meta">
        {b.winnerCount} winner{b.winnerCount === 1 ? "" : "s"} · due {new Date(b.deadline).toLocaleString()}
        {b.deadline < Date.now() ? " · deadline passed" : ""}
      </p>
      <p>{b.brief}</p>
      <p>
        <strong>Deliver:</strong> {b.deliverables}
      </p>
      {status ? <Banner>{status}</Banner> : null}
      {err ? <Banner kind="err">{err}</Banner> : null}
      {b.state === "funding" && mine && fundConfirm ? (
        <Banner>
          You will send {formatNim(b.rewardLuna)} to escrow ({data?.fund?.recipient}). Hub opens a popup.
          The prize is not live until that payment confirms.
        </Banner>
      ) : null}
      {b.state === "funding" && mine ? (
        <div className="pay-bar">
          <button className="btn gold" onClick={fundIt}>
            <Icon name="coin" />
            {fundConfirm ? `Pay ${formatNim(b.rewardLuna)} prize` : "Fund prize with NIM"}
          </button>
          {fundConfirm ? (
            <button className="btn ghost" type="button" onClick={() => setFundConfirm(false)}>
              <Icon name="back" />
              Back
            </button>
          ) : null}
        </div>
      ) : null}
      {b.state === "open" && !mine ? (
        <form className="stack" onSubmit={submit}>
          <h2>Submit work</h2>
          {!wallet ? <Banner kind="err">Wallet disconnected. Connect from the header.</Banner> : null}
          <Field name="assetUrl" label="Work link (or attach a file)" />
          <label className="field">
            <span>File</span>
            <input type="file" />
          </label>
          <Field name="note" label="What you delivered" textarea required maxLength={LIMIT.note} />
          <button className="btn" type="submit" disabled={!wallet}>
            <Icon name="send" />
            Submit work
          </button>
        </form>
      ) : null}
      {b.state === "open" && mine ? (
        <div className="row">
          <button className="btn" onClick={closeReview}>
            <Icon name="check" />
            Close submissions
          </button>
          <button className="btn ghost" onClick={cancelBounty}>
            <Icon name="close" />
            Cancel bounty
          </button>
        </div>
      ) : null}
      {b.state === "funding" && mine ? (
        <button className="btn ghost" onClick={cancelBounty}>
          <Icon name="close" />
          Cancel without funding
        </button>
      ) : null}
      {b.state === "payout_pending" ? (
        <button className="btn danger" onClick={async () => { await post("bounties/dispute", { bountyId: id }); location.reload(); }}>
          <Icon name="flag" />
          Open a dispute
        </button>
      ) : null}
      {b.state === "disputed" && mine ? (
        <div className="row">
          <button
            className="btn"
            onClick={async () => {
              await post("bounties/resolve", { bountyId: id, action: "paid" });
              location.reload();
            }}
          >
            <Icon name="check" />
            Resolve as paid
          </button>
          <button
            className="btn ghost"
            onClick={async () => {
              const res = await post<{ refund?: PayRequest }>("bounties/resolve", { bountyId: id, action: "refund" });
              if (res.refund) {
                const txHash = await pay(res.refund);
                await post("bounties/refund", { bountyId: id, txHash });
              }
              location.reload();
            }}
          >
            <Icon name="wallet" />
            Refund prize
          </button>
        </div>
      ) : null}
      <h2>Submissions</h2>
      {(data?.submissions.length ?? 0) === 0 ? (
        <Empty title="No submissions yet" body="When work comes in, it lands here." />
      ) : (
        data!.submissions.map((s) => (
          <article className="card" key={s.id}>
            <div className="row">
              <Link href={`/u/${s.submitterUsername}`}>@{s.submitterUsername}</Link>
              <span className="meta">{s.status}</span>
            </div>
            <p>{s.note}</p>
            {s.assetUrl ? <a href={s.assetUrl}>{s.assetUrl}</a> : null}
            {s.fileId ? <PaidFile id={s.fileId} mime={null} name="Submission file" /> : null}
            {mine && b.state === "review" ? (
              <label className="row">
                <input
                  type="checkbox"
                  checked={picked.includes(s.id)}
                  onChange={(e) => {
                    setPicked((cur) => {
                      if (e.target.checked) return [...cur, s.id].slice(0, b.winnerCount);
                      return cur.filter((id) => id !== s.id);
                    });
                  }}
                />
                Pick as winner
              </label>
            ) : null}
          </article>
        ))
      )}
      {mine && b.state === "review" ? (
        <button className="btn gold" onClick={chooseWinners} disabled={picked.length < 1}>
          <Icon name="pay" />
          Pay {picked.length || 0} winner{picked.length === 1 ? "" : "s"}
        </button>
      ) : null}
      <Report targetType="bounty" targetId={b.id} />
    </div>
  );
}

function Report({ targetType, targetId }: { targetType: "content" | "bounty"; targetId: string }) {
  const [done, setDone] = useState(false);
  if (done) {
    return (
      <Banner>
        {targetType === "content" ? "Report sent. This listing is held." : "Report sent."}
      </Banner>
    );
  }
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = formData(e);
        await post("reports", { targetType, targetId, reason: f.reason });
        setDone(true);
      }}
    >
      <Field name="reason" label="Report this" textarea required maxLength={LIMIT.report} />
      <button className="btn danger" type="submit">
        <Icon name="flag" />
        Send report
      </button>
    </form>
  );
}

export function Create({ authed }: { authed: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<"listing" | "bounty">("listing");
  const [err, setErr] = useState("");
  if (!authed) {
    return <Empty page title="Username required" body="Connect a wallet and pick a username before you publish." />;
  }
  async function publishListing(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    setErr("");
    try {
      const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement | null;
      const fileId = input?.files?.[0] ? (await uploadFile(input.files[0])).id : "";
      const res = await post<{ id: string }>("content", {
        type: f.type,
        title: f.title,
        description: f.description,
        category: f.category,
        preview: f.preview,
        body: f.body,
        priceNim: Number(f.priceNim),
        fileId,
      });
      router.push(`/c/${res.id}`);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Could not publish.");
    }
  }
  async function publishBounty(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = formData(e);
    setErr("");
    try {
      const days = Number(f.days);
      const res = await post<{ id: string }>("bounties", {
        title: f.title,
        brief: f.brief,
        category: f.category,
        deliverables: f.deliverables,
        winnerCount: Number(f.winnerCount),
        rewardNim: Number(f.rewardNim),
        deadline: Date.now() + days * 86400000,
      });
      router.push(`/bounties/${res.id}`);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Could not create bounty.");
    }
  }
  return (
    <div className="stack page">
      <h1>Create</h1>
      <div className="row actions" role="tablist" aria-label="What to create">
        <button
          className={`btn ${tab === "listing" ? "" : "ghost"}`}
          role="tab"
          aria-selected={tab === "listing"}
          onClick={() => setTab("listing")}
        >
          <Icon name="paper" />
          Listing
        </button>
        <button
          className={`btn ${tab === "bounty" ? "" : "ghost"}`}
          role="tab"
          aria-selected={tab === "bounty"}
          onClick={() => setTab("bounty")}
        >
          <Icon name="coin" />
          Bounty
        </button>
      </div>
      {err ? <Banner kind="err">{err}</Banner> : null}
      {tab === "listing" ? (
        <form key="listing" className="stack" onSubmit={publishListing}>
          <label className="field">
            <span>Type</span>
            <select name="type" defaultValue="course">
              <option value="course">Course</option>
              <option value="guide">Guide / PDF</option>
              <option value="template">Template / asset</option>
            </select>
          </label>
          <Field name="title" label="Title" required maxLength={LIMIT.title} />
          <label className="field">
            <span>Category</span>
            <select name="category" defaultValue="other">
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <Field name="description" label="What the buyer gets" textarea required maxLength={LIMIT.description} />
          <Field name="preview" label="Free preview" textarea required maxLength={LIMIT.preview} />
          <Field name="body" label="Paid body" textarea required maxLength={LIMIT.body} />
          <Field name="priceNim" label="Price in NIM" type="number" min={0} max={LIMIT.nim} step={0.01} required defaultValue={250} />
          <label className="field">
            <span>Private file (unlocked after purchase)</span>
            <input type="file" name="file" />
          </label>
          <button className="btn" type="submit">
            <Icon name="paper" />
            Publish listing
          </button>
        </form>
      ) : (
        <form key="bounty" className="stack" onSubmit={publishBounty}>
          <Field name="title" label="Title" required maxLength={LIMIT.title} />
          <label className="field">
            <span>Category</span>
            <select name="category" defaultValue="other">
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <Field name="brief" label="Brief" textarea required maxLength={LIMIT.brief} />
          <Field name="deliverables" label="Required output" textarea required maxLength={LIMIT.deliverables} />
          <Field name="winnerCount" label="How many winners" type="number" min={1} max={LIMIT.winners} required defaultValue={1} />
          <Field name="rewardNim" label="Prize in NIM" type="number" min={1} max={LIMIT.nim} step={0.01} required defaultValue={1500} />
          <Field name="days" label="Days open" type="number" min={1} required defaultValue={7} />
          <button className="btn" type="submit">
            <Icon name="coin" />
            Create bounty
          </button>
          <p className="meta">It stays hidden until you fund the prize.</p>
        </form>
      )}
    </div>
  );
}

export function Saved({ authed }: { authed: boolean }) {
  const { data, error, loading } = useLoad<{ listings: ContentCard[]; bounties: BountyCard[] }>("saves");
  if (!authed) {
    return <Empty page title="Saves need a username" body="Connect and pick a username, then save listings and bounties for later." />;
  }
  if (loading) return <Skeleton label="Opening saves" />;
  if (error) return <Banner kind="err">{error}</Banner>;
  const listings = data?.listings ?? [];
  const bounties = data?.bounties ?? [];
  return (
    <div className="stack page">
      <h1>Saved</h1>
      {listings.length === 0 && bounties.length === 0 ? (
        <Empty title="No saves" body="Save a listing or bounty from its page to keep it here." />
      ) : (
        <>
          {listings.length > 0 ? <ListingsByCategory items={listings} /> : null}
          {bounties.length > 0 ? (
            <div className="grid">
              {bounties.map((b) => (
                <BountyTeaser key={b.id} bounty={b} />
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export function Library({ authed }: { authed: boolean }) {
  const { data, error, loading } = useLoad<{ items: ContentCard[]; progress: { content_id: string; percent: number }[] }>(
    "library",
  );
  if (!authed) return <Empty page title="Your library is tied to a username" body="Connect and pick a username to keep purchases." />;
  if (loading) return <Skeleton label="Opening library" />;
  if (error) return <Banner kind="err">{error}</Banner>;
  const items = data?.items ?? [];
  const progress = new Map((data?.progress ?? []).map((p) => [p.content_id, p.percent]));
  return (
    <div className="stack page">
      <h1>Library</h1>
      {items.length === 0 ? (
        <Empty
          title="Nothing unlocked"
          body="Pay-to-unlock listings show up here and stay attached to this wallet."
          action={
            <Link className="btn" href="/learn">
              <Icon name="listings" />
              Browse listings
            </Link>
          }
        />
      ) : (
        <ListingsByCategory items={items} progress={progress} />
      )}
    </div>
  );
}

export function Me({
  onSignOut,
  onHub,
  busy,
}: {
  onSignOut: () => Promise<void>;
  onHub: () => Promise<void>;
  busy: string;
}) {
  const { data, error, loading } = useLoad<{
    wallet: string;
    username: string | null;
    profile: Profile | null;
  }>("session");
  const [err, setErr] = useState("");
  if (loading) return <Skeleton label="Loading profile" />;
  if (!data?.wallet) return <Empty page title="No wallet yet" body="Connect from the header to enter D place." />;
  if (!data.username) {
    return (
      <form
        className="stack page"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = formData(e);
          setErr("");
          try {
            await post("profile", { username: f.username, displayName: f.displayName, bio: f.bio });
            location.reload();
          } catch (er) {
            setErr(er instanceof Error ? er.message : "Could not save username.");
          }
        }}
      >
        <h1>Pick a username</h1>
        <p>Required. It sits next to your wallet on every listing, bounty, and payout.</p>
        {err ? <Banner kind="err">{err}</Banner> : null}
        <Field name="username" label="Username" required />
        <Field name="displayName" label="Display name" />
        <Field name="bio" label="Bio" textarea />
        <button className="btn" type="submit">
          <Icon name="check" />
          Save username
        </button>
        <button className="btn ghost" type="button" onClick={onSignOut}>
          <Icon name="out" />
          Sign out
        </button>
      </form>
    );
  }
  const p = data.profile;
  if (error || !p) return <Banner kind="err">{error || "Missing profile."}</Banner>;
  const demo = data.wallet.startsWith("demo:");
  return (
    <div className="stack page">
      <div>
        <h1>@{p.username}</h1>
        <p>{p.displayName}</p>
        <p>{p.bio || "No bio yet."}</p>
        <p className="meta">{demo ? "Demo wallet. Sign out, then Connect with Hub for real NIM." : data.wallet}</p>
      </div>
      <div className="row actions">
        {demo ? (
          <button className="btn gold" onClick={onHub} disabled={Boolean(busy)}>
            <Icon name="wallet" />
            {busy || "Switch to Hub"}
          </button>
        ) : null}
        <button className="btn ghost" onClick={onSignOut}>
          <Icon name="out" />
          Sign out
        </button>
      </div>
      <div className="ledger">
        <div className="kicker">NIM earned</div>
        <Money luna={p.earnedLuna} />
        <p className="meta">
          {p.purchased} purchased · {p.published} published · {p.submitted} submitted · {p.won} won
        </p>
      </div>
      <Dashboard />
    </div>
  );
}

function Dashboard() {
  const { data, loading } = useLoad<{
    sales: SaleRow[];
    bounties: BountyCard[];
    stats: StallStats;
  }>("me");
  if (loading || !data) return <Skeleton label="Loading stall" />;
  return (
    <div className="stack">
      <h2>Your stall</h2>
      {data.sales.length === 0 ? (
        <p className="meta">No listings yet.</p>
      ) : (
        data.sales.map((s) => (
          <Link key={s.id} className="card" href={`/c/${s.id}`}>
            <h4>{s.title}</h4>
            <p className="meta">
              {s.status === "delisted" ? "Off the stall · " : ""}
              {s.buyers} buyer{s.buyers === 1 ? "" : "s"} · {s.ratingCount ? `${s.ratingAvg.toFixed(1)} / 5` : "no ratings"}
            </p>
            <Money luna={s.revenueLuna} />
          </Link>
        ))
      )}
      <h2>Your bounties</h2>
      {data.bounties.length === 0 ? (
        <p className="meta">You have not funded a bounty.</p>
      ) : (
        data.bounties.map((b) => (
          <Link key={b.id} className="card" href={`/bounties/${b.id}`}>
            <div className="row">
              {b.funded ? <span className="badge">Prize funded</span> : <span className="kicker">{b.state}</span>}
            </div>
            <h4>{b.title}</h4>
            <p className="meta">
              {b.state} · {b.submissionCount} submission{b.submissionCount === 1 ? "" : "s"}
            </p>
          </Link>
        ))
      )}
      <h2>Stall totals</h2>
      <p className="meta">
        {data.stats.uniqueWallets} wallets · {data.stats.listings} listings · {data.stats.purchases}{" "}
        purchases · {data.stats.submissions} submissions · {data.stats.payouts} payouts
      </p>
    </div>
  );
}

export function Person({ username }: { username: string }) {
  const { data, error, loading } = useLoad<{
    profile: Profile;
    listings: ContentCard[];
    wins: { bounty_id: string; title: string }[];
  }>(`u/${username}`);
  if (loading) return <Skeleton label={`Loading @${username}`} />;
  if (error || !data) return <Banner kind="err">{error || "No such person."}</Banner>;
  const p = data.profile;
  return (
    <div className="stack page">
      <h1>@{p.username}</h1>
      <p>{p.bio || "No bio yet."}</p>
      <p className="meta">
        {p.published} listings · {p.won} wins · <Money luna={p.earnedLuna} />
      </p>
      <h2>Listings</h2>
      {data.listings.length === 0 ? <p>No public listings.</p> : data.listings.map((c) => <ListingCard key={c.id} item={c} />)}
      <h2>Wins</h2>
      {data.wins.length === 0 ? (
        <p>No bounty wins yet.</p>
      ) : (
        data.wins.map((w) => (
          <Link key={w.bounty_id} className="card" href={`/bounties/${w.bounty_id}`}>
            {w.title}
          </Link>
        ))
      )}
    </div>
  );
}
