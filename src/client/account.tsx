"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { BountyCard, ContentCard, Profile, SaleRow, StallStats } from "@/types";
import { Banner, Empty, Field, FilePick, Icon, Money, Skeleton, formData } from "./ui";
import { BountyTeaser } from "./bounties";
import { ListingCard, ListingsByCategory } from "./listings";
import { useLoad } from "./shared";
import { useSession } from "./session";
import { CATEGORIES } from "@/categories";
import { LIMIT } from "@/validate";
import { post, uploadFile } from "./api";

export function Create() {
  const router = useRouter();
  const { username } = useSession();
  const [tab, setTab] = useState<"listing" | "bounty">("listing");
  const [err, setErr] = useState("");
  if (!username) {
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
          <FilePick label="Private file (unlocked after purchase)" />
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

export function Saved() {
  const { username } = useSession();
  const { data, error, loading } = useLoad<{ listings: ContentCard[]; bounties: BountyCard[] }>("saves");
  if (!username) {
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

export function Library() {
  const { username } = useSession();
  const { data, error, loading } = useLoad<{ items: ContentCard[]; progress: { content_id: string; percent: number }[] }>(
    "library",
  );
  if (!username) return <Empty page title="Your library is tied to a username" body="Connect and pick a username to keep purchases." />;
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

export function Me() {
  const { signOut } = useSession();
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
        <button className="btn ghost" type="button" onClick={signOut}>
          <Icon name="out" />
          Sign out
        </button>
      </form>
    );
  }
  const p = data.profile;
  if (error || !p) return <Banner kind="err">{error || "Missing profile."}</Banner>;
  return (
    <div className="stack page">
      <div>
        <h1>@{p.username}</h1>
        <p>{p.displayName}</p>
        <p>{p.bio || "No bio yet."}</p>
        <p className="meta">{data.wallet}</p>
      </div>
      <div className="row actions">
        <button className="btn ghost" onClick={signOut}>
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
