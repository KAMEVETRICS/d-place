"use client";

import Link from "next/link";
import { FormEvent, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { BountyCard, PayoutRow, Submission } from "@/types";
import { Banner, Empty, Field, FilePick, Icon, Money, SearchField, Skeleton, formData } from "./ui";
import { PaidFile, Report, SaveButton, hay, useLoad } from "./shared";
import { useSession } from "./session";
import { type PayRequest } from "./wallet";
import { PayBar, usePayFlow } from "./pay";
import { formatNim } from "@/money";
import { categoryLabel } from "@/categories";
import { LIMIT } from "@/validate";
import { post, uploadFile } from "./api";
import type { BountyState } from "@/types";

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
  const { wallet, refresh } = useSession();
  const { data, error, loading, reload } = useLoad<{
    bounty: BountyCard;
    submissions: Submission[];
    fund: { recipient: string; amountLuna: number; memo: string } | null;
    payouts: PayoutRow[];
  }>(`bounties/${id}`);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const b = data?.bounty;
  const fundFlow = usePayFlow({
    confirm: async (hash) => {
      try {
        await post("bounties/fund", { bountyId: id, txHash: hash });
        await refresh();
        reload();
        return true;
      } catch {
        return false;
      }
    },
  });
  const payFlow = usePayFlow();

  if (loading) return <Skeleton label="Opening bounty" />;
  if (error || !b) return <Banner kind="err">{error || "Missing bounty."}</Banner>;
  const mine = b.sponsorWallet === wallet;
  const ctx: BountyCtx = {
    id,
    b,
    mine,
    wallet,
    fund: data.fund,
    payouts: data.payouts ?? [],
    submissions: data.submissions,
    picked,
    setPicked,
    fundFlow,
    payFlow,
    reload,
    refresh,
    setNote,
  };

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
      {fundFlow.status && fundFlow.status !== "failed" ? <Banner>{fundFlow.status}</Banner> : null}
      {fundFlow.err ? <Banner kind="err">{fundFlow.err}</Banner> : null}
      {payFlow.status && payFlow.status !== "failed" ? <Banner>{payFlow.status}</Banner> : null}
      {payFlow.err ? <Banner kind="err">{payFlow.err}</Banner> : null}
      {note ? <Banner kind="err">{note}</Banner> : null}
      {STATE_PANEL[b.state](ctx)}
      <Submissions ctx={ctx} />
      <Report targetType="bounty" targetId={b.id} />
    </div>
  );
}

type BountyCtx = {
  id: string;
  b: BountyCard;
  mine: boolean;
  wallet: string;
  fund: { recipient: string; amountLuna: number; memo: string } | null;
  payouts: PayoutRow[];
  submissions: Submission[];
  picked: string[];
  setPicked: Dispatch<SetStateAction<string[]>>;
  fundFlow: ReturnType<typeof usePayFlow>;
  payFlow: ReturnType<typeof usePayFlow>;
  reload: () => void;
  refresh: () => Promise<unknown>;
  setNote: (s: string) => void;
};

function FundingPanel({ ctx }: { ctx: BountyCtx }) {
  if (!ctx.mine) return null;
  return (
    <>
      {ctx.fundFlow.armed && !ctx.fundFlow.status ? (
        <Banner>
          You will send {formatNim(ctx.b.rewardLuna)} to escrow ({ctx.fund?.recipient}). Hub opens a popup.
          The prize is not live until that payment confirms.
        </Banner>
      ) : null}
      {ctx.fund ? (
        <PayBar
          icon="coin"
          idle="Fund prize with NIM"
          armedLabel={`Pay ${formatNim(ctx.b.rewardLuna)} prize`}
          armed={ctx.fundFlow.armed}
          waiting={ctx.fundFlow.waiting}
          onIdle={ctx.fundFlow.arm}
          onPay={() => void ctx.fundFlow.run(ctx.fund!)}
          onBack={ctx.fundFlow.disarm}
          onRetry={ctx.fundFlow.retry}
        />
      ) : null}
      <button className="btn ghost" type="button" onClick={() => void act(ctx, "cancel")}>
        <Icon name="close" />
        Cancel without funding
      </button>
    </>
  );
}

function OpenPanel({ ctx }: { ctx: BountyCtx }) {
  if (ctx.mine) {
    return (
      <div className="row">
        <button className="btn" type="button" onClick={() => void act(ctx, "close")}>
          <Icon name="check" />
          Close submissions
        </button>
        <button className="btn ghost" type="button" onClick={() => void act(ctx, "cancel")}>
          <Icon name="close" />
          Cancel bounty
        </button>
      </div>
    );
  }
  return (
    <form className="stack" onSubmit={(e) => void submitWork(e, ctx)}>
      <h2>Submit work</h2>
      {!ctx.wallet ? <Banner kind="err">Wallet disconnected. Connect from the header.</Banner> : null}
      <Field name="assetUrl" label="Work link (or attach a file)" />
      <FilePick label="Attached file" />
      <Field name="note" label="What you delivered" textarea required maxLength={LIMIT.note} />
      <button className="btn" type="submit" disabled={!ctx.wallet}>
        <Icon name="send" />
        Submit work
      </button>
    </form>
  );
}

function ReviewPanel({ ctx }: { ctx: BountyCtx }) {
  if (!ctx.mine) return null;
  return (
    <button className="btn gold" type="button" onClick={() => void act(ctx, "winners")} disabled={ctx.picked.length < 1}>
      <Icon name="pay" />
      Mark {ctx.picked.length || 0} winner{ctx.picked.length === 1 ? "" : "s"}
    </button>
  );
}

function PayoutPanel({ ctx }: { ctx: BountyCtx }) {
  return (
    <>
      {ctx.payouts.length ? (
        <section className="stack">
          <h2>Payouts</h2>
          <p className="meta">Pay each winner on its own. If Hub closes, that row stays unpaid so you can retry it.</p>
          {ctx.payouts.map((p) => (
            <article className="card" key={p.id}>
              <div className="card-foot">
                <Money luna={p.amountLuna} />
                <span className="meta">{p.wallet}</span>
                {p.status === "paid" ? <span className="badge">Paid</span> : null}
              </div>
              {ctx.mine && p.status !== "paid" ? (
                <button className="btn gold" type="button" onClick={() => void payOne(ctx, p)}>
                  <Icon name="pay" />
                  Pay this winner
                </button>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}
      {ctx.b.state === "payout_pending" ? (
        <button className="btn danger" type="button" onClick={() => void act(ctx, "dispute")}>
          <Icon name="flag" />
          Open a dispute
        </button>
      ) : null}
    </>
  );
}

function DisputePanel({ ctx }: { ctx: BountyCtx }) {
  if (!ctx.mine) return null;
  return (
    <div className="row">
      <button className="btn" type="button" onClick={() => void act(ctx, "paid")}>
        <Icon name="check" />
        Resolve as paid
      </button>
      <button className="btn ghost" type="button" onClick={() => void act(ctx, "refund")}>
        <Icon name="wallet" />
        Refund prize
      </button>
    </div>
  );
}

const STATE_PANEL: Record<BountyState, (ctx: BountyCtx) => ReactNode> = {
  funding: (ctx) => <FundingPanel ctx={ctx} />,
  open: (ctx) => <OpenPanel ctx={ctx} />,
  review: () => null,
  payout_pending: (ctx) => <PayoutPanel ctx={ctx} />,
  paid: (ctx) => <PayoutPanel ctx={ctx} />,
  disputed: (ctx) => <DisputePanel ctx={ctx} />,
  refunded: () => null,
  cancelled: () => null,
};

function Submissions({ ctx }: { ctx: BountyCtx }) {
  return (
    <>
      <h2>Submissions</h2>
      {ctx.submissions.length === 0 ? (
        <Empty title="No submissions yet" body="When work comes in, it lands here." />
      ) : (
        ctx.submissions.map((s) => (
          <article className="card" key={s.id}>
            <div className="row">
              <Link href={`/u/${s.submitterUsername}`}>@{s.submitterUsername}</Link>
              <span className="meta">{s.status}</span>
            </div>
            <p>{s.note}</p>
            {s.assetUrl ? <a href={s.assetUrl}>{s.assetUrl}</a> : null}
            {s.fileId ? <PaidFile id={s.fileId} mime={null} name="Submission file" /> : null}
            {ctx.mine && ctx.b.state === "review" ? (
              <label className="row">
                <input
                  type="checkbox"
                  checked={ctx.picked.includes(s.id)}
                  onChange={(e) => {
                    ctx.setPicked((cur) => {
                      if (e.target.checked) return [...cur, s.id].slice(0, ctx.b.winnerCount);
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
      {ctx.mine && ctx.b.state === "review" ? <ReviewPanel ctx={ctx} /> : null}
    </>
  );
}

async function submitWork(e: FormEvent<HTMLFormElement>, ctx: BountyCtx) {
  e.preventDefault();
  if (!ctx.wallet) {
    ctx.setNote("Wallet disconnected. Connect from the header.");
    return;
  }
  const f = formData(e);
  const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement | null;
  ctx.setNote("");
  try {
    let fileId = "";
    if (input?.files?.[0]) fileId = (await uploadFile(input.files[0])).id;
    await post("submissions", { bountyId: ctx.b.id, assetUrl: f.assetUrl, note: f.note, fileId });
    location.reload();
  } catch (er) {
    ctx.setNote(er instanceof Error ? er.message : "Submit failed.");
  }
}

async function payOne(ctx: BountyCtx, p: PayoutRow) {
  await ctx.payFlow.run({ recipient: p.wallet, amountLuna: p.amountLuna, memo: p.memo }, async (hash) => {
    try {
      await post("payouts/confirm", { bountyId: ctx.id, payoutId: p.id, txHash: hash });
      await ctx.refresh();
      ctx.reload();
      return true;
    } catch {
      return false;
    }
  });
}

async function act(ctx: BountyCtx, kind: "cancel" | "close" | "winners" | "dispute" | "paid" | "refund") {
  ctx.setNote("");
  try {
    if (kind === "cancel") {
      const res = await post<{ state: string; refund?: PayRequest }>("bounties/cancel", { bountyId: ctx.id });
      if (res.refund) {
        await ctx.payFlow.run(res.refund, async (hash) => {
          await post("bounties/refund", { bountyId: ctx.id, txHash: hash });
          return true;
        });
      }
      location.reload();
      return;
    }
    if (kind === "close") await post("bounties/close", { bountyId: ctx.id });
    if (kind === "winners") await post("bounties/winners", { bountyId: ctx.id, winnerIds: ctx.picked });
    if (kind === "dispute") await post("bounties/dispute", { bountyId: ctx.id });
    if (kind === "paid") await post("bounties/resolve", { bountyId: ctx.id, action: "paid" });
    if (kind === "refund") {
      const res = await post<{ refund?: PayRequest }>("bounties/resolve", { bountyId: ctx.id, action: "refund" });
      if (res.refund) {
        await ctx.payFlow.run(res.refund, async (hash) => {
          await post("bounties/refund", { bountyId: ctx.id, txHash: hash });
          return true;
        });
      }
    }
    await ctx.refresh();
    ctx.reload();
  } catch (e) {
    ctx.setNote(e instanceof Error ? e.message : "That action failed.");
  }
}
