"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { BountyCard, PayoutRow, Submission } from "@/types";
import { Banner, Empty, Field, Icon, Money, SearchField, Skeleton, formData } from "./ui";
import { PaidFile, Report, SaveButton, hay, useLoad } from "./shared";
import { useSession } from "./session";
import { payError, type PayRequest } from "./wallet";
import { formatNim } from "@/money";
import { categoryLabel } from "@/categories";
import { LIMIT } from "@/validate";
import { post, uploadFile } from "./api";

export function BountyTeaser({ bounty, featured }: { bounty: BountyCard; featured?: boolean }) {
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

export function Bounty({ id }: { id: string }) {
  const { wallet, pay, refresh } = useSession();
  const { data, error, loading, reload } = useLoad<{
    bounty: BountyCard;
    submissions: Submission[];
    fund: { recipient: string; amountLuna: number; memo: string } | null;
    payouts: PayoutRow[];
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
      await refresh();
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
      await post("bounties/winners", { bountyId: id, winnerIds: picked });
      await refresh();
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not mark winners.");
    }
  }

  async function payOne(p: PayoutRow) {
    setErr("");
    setStatus(`Approve ${formatNim(p.amountLuna)} to ${p.wallet} in Hub…`);
    try {
      const txHash = await pay({ recipient: p.wallet, amountLuna: p.amountLuna, memo: p.memo });
      await post("payouts/confirm", { bountyId: id, payoutId: p.id, txHash });
      setStatus("");
      await refresh();
      reload();
    } catch (e) {
      setErr(payError(e));
      setStatus("");
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
      {b.state === "payout_pending" || (data.payouts?.length ?? 0) > 0 ? (
        <section className="stack">
          <h2>Payouts</h2>
          <p className="meta">Pay each winner on its own. If Hub closes, that row stays unpaid so you can retry it.</p>
          {(data.payouts ?? []).map((p) => (
            <article className="card" key={p.id}>
              <div className="card-foot">
                <Money luna={p.amountLuna} />
                <span className="meta">{p.wallet}</span>
                {p.status === "paid" ? <span className="badge">Paid</span> : null}
              </div>
              {mine && p.status !== "paid" ? (
                <button className="btn gold" type="button" onClick={() => payOne(p)}>
                  <Icon name="pay" />
                  Pay this winner
                </button>
              ) : null}
            </article>
          ))}
        </section>
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
                      return cur.filter((sid) => sid !== s.id);
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
          Mark {picked.length || 0} winner{picked.length === 1 ? "" : "s"}
        </button>
      ) : null}
      <Report targetType="bounty" targetId={b.id} />
    </div>
  );
}
