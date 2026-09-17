"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./ui";
import { useSession } from "./session";

const STALL: { href: string; label: string; icon: IconName }[] = [
  { href: "/app", label: "Shop", icon: "shop" },
  { href: "/learn", label: "Listings", icon: "listings" },
  { href: "/bounties", label: "Bounties", icon: "bounties" },
];
const YOU: { href: string; label: string; icon: IconName }[] = [
  { href: "/library", label: "Library", icon: "library" },
  { href: "/create", label: "Create", icon: "create" },
  { href: "/saved", label: "Saved", icon: "saved" },
  { href: "/me", label: "Me", icon: "me" },
];
const DOCK: { href: string; label: string; icon: IconName }[] = [
  { href: "/app", label: "Shop", icon: "shop" },
  { href: "/bounties", label: "Bounties", icon: "bounties" },
  { href: "/create", label: "Create", icon: "create" },
  { href: "/library", label: "Library", icon: "library" },
  { href: "/me", label: "Me", icon: "me" },
];

function onPath(href: string, path: string) {
  if (href === "/app") return path === "/app";
  return path === href || path.startsWith(`${href}/`);
}

function NavLink({ href, label, icon, path }: { href: string; label: string; icon: IconName; path: string }) {
  return (
    <Link href={href} aria-current={onPath(href, path) ? "page" : undefined}>
      <Icon name={icon} />
      {label}
    </Link>
  );
}

export function StallShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { wallet, username, loading, payHost, error, busy, connectPayOrHub, signOut } = useSession();

  if (loading) {
    return (
      <div className="intro boot" role="status">
        <span className="intro-mark" aria-hidden>
          D
        </span>
        <span className="stamp" aria-hidden>
          D
        </span>
        <h1>D place</h1>
        <p className="lede">Opening the stall…</p>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="intro">
        <span className="intro-mark" aria-hidden>
          D
        </span>
        <span className="stamp" aria-hidden>
          D
        </span>
        <h1>Knowledge for NIM.</h1>
        <p className="lede">
          A stall inside your wallet. Unlock a listing, publish what you know, or fund a job.
        </p>
        {error ? <p className="banner err">{error}</p> : null}
        <div className="intro-actions">
          <button className="btn gold" onClick={connectPayOrHub} disabled={Boolean(busy)}>
            <Icon name="wallet" />
            {busy || (payHost ? "Use this Nimiq Pay wallet" : "Connect with Hub")}
          </button>
        </div>
        {!payHost ? (
          <p className="meta">
            Connect with Hub opens a popup. Allow it, pick or create a Nimiq account, then sign in.
            Get NIM at wallet.nimiq.com if the account is empty.
          </p>
        ) : null}
      </div>
    );
  }

  const who = username ? `@${username}` : "friend";
  const initial = (username || "?").slice(0, 1).toUpperCase();

  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="side">
        <Link className="brand" href="/app">
          <span className="stamp" aria-hidden>
            D
          </span>
          <span className="wordmark">D place</span>
        </Link>
        <div className="nav-label">Stall</div>
        <nav aria-label="Stall">
          {STALL.map((item) => (
            <NavLink key={item.href} {...item} path={path} />
          ))}
        </nav>
        <div className="nav-label">You</div>
        <nav aria-label="You">
          {YOU.map((item) => (
            <NavLink key={item.href} {...item} path={path} />
          ))}
        </nav>
      </aside>
      <header className="top">
        <Link className="brand phone-brand" href="/app">
          <span className="stamp" aria-hidden>
            D
          </span>
          <span className="wordmark">D place</span>
        </Link>
        <div className="greet desk-only">
          <p className="hello">Hello, {who}</p>
          <p>{username ? "The stall is open." : "Pick a username so people can find you."}</p>
        </div>
        <div className="utilities">
          <Link href="/saved" className="icon-btn" aria-label="Saved" aria-current={onPath("/saved", path) ? "page" : undefined}>
            <Icon name="saved" filled={onPath("/saved", path)} />
          </Link>
          <div className="account">
            <Link href="/me" className="userchip">
              <span className="avatar" aria-hidden>
                {initial}
              </span>
              <span>
                <strong>{username ? `@${username}` : "Set username"}</strong>
                <small>Wallet</small>
              </span>
            </Link>
            <button className="icon-btn ghost" onClick={signOut} disabled={Boolean(busy)} aria-label="Sign out">
              <Icon name="out" />
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="main">
        {error ? <p className="banner err">{error}</p> : null}
        {children}
      </main>
      <nav className="dock" aria-label="Primary">
        {DOCK.map((item) => (
          <NavLink key={item.href} {...item} path={path} />
        ))}
      </nav>
    </div>
  );
}
