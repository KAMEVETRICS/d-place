"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "./ui";

const DOCS = process.env.NEXT_PUBLIC_DOCS_URL || "https://docs.deplace.space";
const APP = (process.env.NEXT_PUBLIC_APP_URL || "https://app.deplace.space").replace(/\/$/, "");
const LANDING = "https://deplace.space";
const MAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";

function onAppHost() {
  return typeof window !== "undefined" && window.location.origin === APP;
}

function enterStall(router: ReturnType<typeof useRouter>) {
  if (onAppHost()) {
    router.push("/");
    return;
  }
  window.location.assign(`${APP}/`);
}

export function BackHome() {
  return (
    <a className="back-home" href={LANDING}>
      <span aria-hidden>←</span>
      Back home
    </a>
  );
}

function SiteBar() {
  return (
    <header className="site-bar">
      <a className="brand" href={LANDING}>
        <span className="stamp" aria-hidden>
          D
        </span>
        <span className="wordmark">D place</span>
      </a>
      <nav className="site-links" aria-label="Site">
        <a className="site-link-btn" href={APP} target="_blank" rel="noreferrer">
          Stall
        </a>
        <a href={DOCS} target="_blank" rel="noreferrer">
          Docs
        </a>
        <Link href="/support">Support</Link>
      </nav>
    </header>
  );
}

function PhonePreview() {
  return (
    <div className="phone-frame" aria-hidden>
      <div className="phone-screen">
        <p className="phone-title">My stall</p>
        <div className="phone-tabs">
          <span data-on="1">Shop</span>
          <span>Listings</span>
          <span>Bounties</span>
        </div>
        <div className="phone-card">
          <p className="phone-kicker">Featured</p>
          <p className="phone-card-title">Unlock knowledge for NIM</p>
          <p className="phone-card-body">
            Browse listings, fund a bounty, or publish what you know. Paid in NIM inside Nimiq Pay.
          </p>
        </div>
        <div className="phone-dots">
          <i data-on="1" />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="site site-landing">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="site-phone-shell">
        <SiteBar />
        <main id="main" className="site-main">
          <section className="site-hero-split">
            <div className="site-hero-copy">
              <h1 className="site-hero-title">
                <span>Welcome</span>
                <span>to</span>
                <span className="accent">D place</span>
              </h1>
              <p className="lede">
                Your stall for knowledge and funded work. Unlock a listing, publish what you know, or fund a job, paid
                in NIM.
              </p>
            </div>
            <PhonePreview />
            <div className="site-hero-actions row">
              <a className="btn gold" href={APP} target="_blank" rel="noreferrer">
                <Icon name="shop" />
                The Stall
              </a>
              <a className="btn ghost" href={DOCS} target="_blank" rel="noreferrer">
                <Icon name="paper" />
                Read the docs
              </a>
            </div>
          </section>
          <section className="site-grid">
            <article className="site-feature">
              <Icon name="lock" />
              <h2>Unlock</h2>
              <p>Pay the listed NIM. The file opens in the browser and stays in your library if the stallholder later delists it.</p>
            </article>
            <article className="site-feature">
              <Icon name="paper" />
              <h2>Publish</h2>
              <p>Course, guide, or template. You set the price. Duplicate live titles on your stall are blocked.</p>
            </article>
            <article className="site-feature">
              <Icon name="coin" />
              <h2>Fund a job</h2>
              <p>A bounty only goes live after the prize is paid into escrow. You choose how many winners to pay.</p>
            </article>
          </section>
          <section className="site-how">
            <h2>How you open it</h2>
            <p>
              In a browser, open The Stall then Connect with Hub. Inside Nimiq Pay, the Mini App uses the wallet already in
              the app.
            </p>
          </section>
        </main>
        <footer className="site-foot">
          <a href={DOCS} target="_blank" rel="noreferrer">
            Docs
          </a>
          <Link href="/support">Support</Link>
          <a href={APP} target="_blank" rel="noreferrer">
            Stall
          </a>
        </footer>
      </div>
    </div>
  );
}

export function Docs() {
  return (
    <div className="site">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <SiteBar />
      <main id="main" className="site-main doc doc-wide">
        <h1>Docs</h1>
        <p className="lede">How the stall works. Short, then you can go in.</p>
        <div className="doc-graph">
          <div className="doc-row one">
            <article className="doc-node">
              <header>
                <i className="doc-dot gold" />
                <h2>Open it</h2>
              </header>
              <p>
                In a browser, choose <strong>The Stall</strong>, then Connect with Hub. Sign the login. On Me, pick a
                username before you buy, publish, or fund a job.
              </p>
              <p>Inside Nimiq Pay, the Mini App uses the wallet already in the app. There is no Hub popup.</p>
            </article>
          </div>
          <div className="doc-wires fork" aria-hidden>
            <span className="stem" />
            <span className="bar" />
            <span className="drop" />
            <span className="drop" />
            <span className="drop" />
          </div>
          <div className="doc-row three">
            <article className="doc-node">
              <header>
                <i className="doc-dot" />
                <h2>Unlock</h2>
              </header>
              <p>Pay the listed NIM. The file opens here and stays in your library.</p>
            </article>
            <article className="doc-node">
              <header>
                <i className="doc-dot" />
                <h2>Publish</h2>
              </header>
              <p>Course, guide, or template. You set the price. Payment goes to your wallet.</p>
            </article>
            <article className="doc-node">
              <header>
                <i className="doc-dot stamp" />
                <h2>Fund a job</h2>
              </header>
              <p>The prize sits in escrow first. You choose how many winners to pay.</p>
            </article>
          </div>
          <div className="doc-wires join" aria-hidden>
            <span className="drop" />
            <span className="drop" />
            <span className="drop" />
            <span className="bar" />
            <span className="stem" />
          </div>
          <div className="doc-row one">
            <article className="doc-node">
              <header>
                <i className="doc-dot gold" />
                <h2>NIM</h2>
              </header>
              <p>
                Closing Hub without signing is not a payment. Nothing leaves the wallet. If the account is empty, get NIM
                at{" "}
                <a href="https://wallet.nimiq.com" rel="noreferrer">
                  wallet.nimiq.com
                </a>
                .
              </p>
            </article>
          </div>
        </div>
        <p>
          <a className="btn gold" href={DOCS} target="_blank" rel="noreferrer">
            Full handbook
          </a>
        </p>
      </main>
      <footer className="site-foot">
        <Link href="/support">Support</Link>
      </footer>
      <BackHome />
    </div>
  );
}

export function Support() {
  return (
    <div className="site">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <SiteBar />
      <main id="main" className="site-main doc doc-wide">
        <h1>Support</h1>
        <p className="lede">If a pay looks stuck, check the chain first. Then report from the listing.</p>
        <div className="doc-graph">
          <div className="doc-row one">
            <article className="doc-node">
              <header>
                <i className="doc-dot gold" />
                <h2>Start here</h2>
              </header>
              <p>Locked after a confirmed pay, or you closed Hub? Do these three checks before you write anyone.</p>
            </article>
          </div>
          <div className="doc-wires fork" aria-hidden>
            <span className="stem" />
            <span className="bar" />
            <span className="drop" />
            <span className="drop" />
            <span className="drop" />
          </div>
          <div className="doc-row three">
            <article className="doc-node">
              <header>
                <i className="doc-dot" />
                <h2>Check the chain</h2>
              </header>
              <p>Open the listing and choose Check the chain again.</p>
            </article>
            <article className="doc-node">
              <header>
                <i className="doc-dot" />
                <h2>Confirm the hash</h2>
              </header>
              <p>
                Look up the receipt hash on{" "}
                <a href="https://nimiq.watch" rel="noreferrer">
                  nimiq.watch
                </a>
                .
              </p>
            </article>
            <article className="doc-node">
              <header>
                <i className="doc-dot stamp" />
                <h2>Confirm the address</h2>
              </header>
              <p>The seller on the listing must be the NQ address you paid.</p>
            </article>
          </div>
          <div className="doc-wires join" aria-hidden>
            <span className="drop" />
            <span className="drop" />
            <span className="drop" />
            <span className="bar" />
            <span className="stem" />
          </div>
          <div className="doc-row one">
            <article className="doc-node">
              <header>
                <i className="doc-dot gold" />
                <h2>Then write</h2>
              </header>
              <p>A bad listing: use Send report on that listing page. Do not send NIM to anyone who DMs you as support.</p>
              {MAIL ? (
                <p>
                  <a className="btn gold" href={`mailto:${MAIL}`}>
                    {MAIL}
                  </a>
                </p>
              ) : (
                <p>Mail for stall problems will show here when it is public.</p>
              )}
            </article>
          </div>
        </div>
      </main>
      <footer className="site-foot">
        <a href={DOCS} target="_blank" rel="noreferrer">
          Docs
        </a>
      </footer>
      <BackHome />
    </div>
  );
}

const BEATS: { title: string; body: string; icon: IconName }[] = [
  { title: "Knowledge for NIM.", body: "A stall inside your wallet. Listings, bounties, and files priced in NIM.", icon: "shop" },
  { title: "Price what you know.", body: "Publish a course, guide, or template. Buyers keep it in their library.", icon: "paper" },
  { title: "Fund the prize first.", body: "A bounty goes live only after the NIM is in escrow. You set the winner count.", icon: "coin" },
];

export function OpenIntro() {
  const router = useRouter();

  return (
    <div className="site">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <SiteBar />
      <main id="main" className="site-main doc doc-wide intro-main">
        <h1>The stall</h1>
        <p className="lede">Three doors. Then you connect the wallet.</p>
        <div className="doc-graph intro-graph">
          {BEATS.map((beat, i) => (
            <article className="doc-node" key={beat.title}>
              <header>
                <i className={`doc-dot${i === 0 ? " gold" : i === 2 ? " stamp" : ""}`} />
                <h2>{beat.title}</h2>
              </header>
              <p>{beat.body}</p>
            </article>
          ))}
        </div>
        <div className="intro-actions">
          <button className="btn gold" type="button" onClick={() => enterStall(router)}>
            The Stall
            <Icon name="send" />
          </button>
        </div>
      </main>
      <BackHome />
    </div>
  );
}
