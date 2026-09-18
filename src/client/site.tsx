"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "./ui";

const DOCS = process.env.NEXT_PUBLIC_DOCS_URL ?? "";
const MAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";

function reduceMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function openApp(router: ReturnType<typeof useRouter>) {
  router.push(reduceMotion() ? "/app" : "/open");
}

function SiteBar() {
  const router = useRouter();
  return (
    <header className="site-bar">
      <Link className="brand" href="/">
        <span className="stamp" aria-hidden>
          D
        </span>
        <span className="wordmark">D place</span>
      </Link>
      <nav className="site-links" aria-label="Site">
        {DOCS ? (
          <a href={DOCS} rel="noreferrer">
            Docs
          </a>
        ) : (
          <Link href="/docs">Docs</Link>
        )}
        <Link href="/support">Support</Link>
        <button className="btn gold" type="button" onClick={() => openApp(router)}>
          <Icon name="shop" />
          Open app
        </button>
      </nav>
    </header>
  );
}

export function Landing() {
  const router = useRouter();
  return (
    <div className="site">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <SiteBar />
      <main id="main" className="site-main">
        <section className="site-hero">
          <span className="stamp" aria-hidden>
            D
          </span>
          <h1>A stall for knowledge. Paid in NIM.</h1>
          <p className="lede">
            D place is a Nimiq Pay Mini App. Unlock a listing, publish what you know, or fund a job.
          </p>
          <div className="row">
            <button className="btn gold" type="button" onClick={() => openApp(router)}>
              <Icon name="shop" />
              Open app
            </button>
            {DOCS ? (
              <a className="btn ghost" href={DOCS} rel="noreferrer">
                <Icon name="paper" />
                Read the docs
              </a>
            ) : (
              <Link className="btn ghost" href="/docs">
                <Icon name="paper" />
                Read the docs
              </Link>
            )}
          </div>
        </section>
        <section className="site-grid">
          <article className="card">
            <Icon name="lock" />
            <h2>Unlock</h2>
            <p>Pay the listed NIM. The file opens in the browser and stays in your library if the stallholder later delists it.</p>
          </article>
          <article className="card">
            <Icon name="paper" />
            <h2>Publish</h2>
            <p>Course, guide, or template. You set the price. Duplicate live titles on your stall are blocked.</p>
          </article>
          <article className="card">
            <Icon name="coin" />
            <h2>Fund a job</h2>
            <p>A bounty only goes live after the prize is paid into escrow. You choose how many winners to pay.</p>
          </article>
        </section>
        <section className="stack">
          <h2>How you open it</h2>
          <p>
            In a browser, Open app then Connect with Hub. Inside Nimiq Pay, the Mini App uses the wallet already in the
            app.
          </p>
        </section>
      </main>
      <footer className="site-foot">
        {DOCS ? (
          <a href={DOCS} rel="noreferrer">
            Docs
          </a>
        ) : (
          <Link href="/docs">Docs</Link>
        )}
        <Link href="/support">Support</Link>
        <Link href="/app">Stall</Link>
      </footer>
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
      <main id="main" className="site-main doc">
        <h1>Docs</h1>
        <p className="lede">The handbook lives on GitBook. This page only points there.</p>
        {DOCS ? (
          <p>
            <a className="btn gold" href={DOCS} rel="noreferrer">
              Open GitBook
            </a>
          </p>
        ) : (
          <p>
            Upload the gitbook folder in this repo to GitBook, then set NEXT_PUBLIC_DOCS_URL on the host. Until that
            URL exists, use the markdown in gitbook/.
          </p>
        )}
      </main>
      <footer className="site-foot">
        <Link href="/">Home</Link>
        <Link href="/support">Support</Link>
      </footer>
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
      <main id="main" className="site-main doc">
        <h1>Support</h1>
        <p className="lede">Mail only, for now. Report a bad listing from the listing page itself.</p>
        {MAIL ? (
          <p>
            <a className="btn gold" href={`mailto:${MAIL}`}>
              {MAIL}
            </a>
          </p>
        ) : (
          <p>The mailbox is not public yet. When it is, it will show on this page.</p>
        )}
        <p>Do not send NIM to anyone claiming to be support in a private message.</p>
      </main>
      <footer className="site-foot">
        <Link href="/">Home</Link>
        <Link href="/docs">Docs</Link>
      </footer>
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
  const [step, setStep] = useState(0);
  const last = step === BEATS.length - 1;
  const beat = BEATS[step];

  function skip() {
    router.push("/app");
  }

  function next() {
    if (last) skip();
    else setStep((s) => s + 1);
  }

  return (
    <div className="intro-flow" data-step={step}>
      <div className="intro-progress">
        <span className="meta">
          {step + 1}/{BEATS.length}
        </span>
        <div className="intro-ticks" aria-hidden>
          {BEATS.map((_, i) => (
            <i key={i} data-on={i <= step ? "1" : "0"} />
          ))}
        </div>
        <button className="btn ghost" type="button" onClick={skip}>
          Skip
        </button>
      </div>
      <div className="intro-body">
        <span className="intro-glyph" aria-hidden>
          <Icon name={beat.icon} size={88} />
        </span>
        <h1>{beat.title}</h1>
        <p className="lede">{beat.body}</p>
      </div>
      <div className="intro-actions">
        <button className="btn gold" type="button" onClick={next}>
          {last ? "Enter the stall" : "Next"}
          <Icon name="send" />
        </button>
      </div>
    </div>
  );
}
