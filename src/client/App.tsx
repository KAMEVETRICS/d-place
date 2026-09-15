"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, post } from "./api";
import { Bounties, Bounty, Create, Discover, Learn, Library, Listing, Me, Person, Saved } from "./screens";
import { Docs, Landing, OpenIntro, Support } from "./site";
import { Icon, type IconName } from "./ui";
import { demoHash, hubLogin, hubPay, inPay, sendNim, signInPay } from "./wallet";
import type { LoginProof, PayRequest } from "./wallet";
import type { Profile, Session } from "@/types";

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

function isSite(path: string) {
  return path === "/" || path === "/docs" || path === "/support" || path === "/open";
}

function NavLink({ href, label, icon, path }: { href: string; label: string; icon: IconName; path: string }) {
  return (
    <Link href={href} aria-current={onPath(href, path) ? "page" : undefined}>
      <Icon name={icon} />
      {label}
    </Link>
  );
}

export function App() {
  const path = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session & { profile?: Profile | null; loading: boolean }>({
    wallet: "",
    username: null,
    demo: true,
    loading: true,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [payHost, setPayHost] = useState(false);
  const booted = useRef(false);

  const refresh = useCallback(async () => {
    const s = await api<Session & { profile: Profile | null }>("session");
    setSession({ ...s, wallet: s.wallet ?? "", loading: false });
    return s;
  }, []);

  async function connectWith(proof: LoginProof, nonce: string) {
    await post("session", {
      wallet: proof.wallet,
      nonce,
      signature: proof.signature,
      publicKey: proof.publicKey ?? "",
    });
    await refresh();
  }

  const connectPayOrHub = useCallback(async () => {
    setError("");
    setBusy("Connecting");
    try {
      const { nonce, message } = await api<{ nonce: string; message: string }>("challenge");
      const proof = inPay() ? await signInPay(message) : await hubLogin(message);
      await connectWith(proof, nonce);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect.");
    } finally {
      setBusy("");
    }
  }, []);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const hosted = inPay();
    setPayHost(hosted);
    if (hosted && isSite(path)) router.replace("/app");
    refresh()
      .then(async (s) => {
        if (!hosted || s.wallet) return;
        await connectPayOrHub();
      })
      .catch((e: Error) => {
        setError(e.message);
        setSession((cur) => ({ ...cur, loading: false }));
      });
  }, [refresh, path, router]);

  const signOut = useCallback(async () => {
    localStorage.removeItem("dplace.demo");
    await post("logout", {});
    await refresh();
  }, [refresh]);

  async function useDemo(who: "demo:alice" | "demo:bob") {
    setError("");
    setBusy("Connecting");
    try {
      localStorage.setItem("dplace.demo", who);
      await post("logout", {});
      const { nonce } = await api<{ nonce: string; message: string }>("challenge");
      await post("session", { wallet: who, nonce, signature: `demo-sig:${who}` });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect.");
    } finally {
      setBusy("");
    }
  }

  const pay = useCallback(
    async (req: PayRequest) => {
      if (session.wallet.startsWith("demo:")) return demoHash(session.wallet, req);
      if (inPay()) return sendNim(req);
      return hubPay(req);
    },
    [session.wallet],
  );

  const page = useMemo(() => {
    const parts = path.split("/").filter(Boolean);
    if (parts[0] === "learn") return <Learn />;
    if (parts[0] === "library") return <Library authed={Boolean(session.username)} />;
    if (parts[0] === "saved") return <Saved authed={Boolean(session.username)} />;
    if (parts[0] === "create") return <Create authed={Boolean(session.username)} />;
    if (parts[0] === "me") return <Me onSignOut={signOut} onHub={connectPayOrHub} busy={busy} />;
    if (parts[0] === "u" && parts[1]) return <Person username={parts[1]} />;
    if (parts[0] === "c" && parts[1]) {
      return <Listing id={parts[1]} wallet={session.wallet} pay={pay} onChange={async () => { await refresh(); }} />;
    }
    if (parts[0] === "bounties" && parts[1]) {
      return <Bounty id={parts[1]} wallet={session.wallet} pay={pay} onChange={async () => { await refresh(); }} />;
    }
    if (parts[0] === "bounties") return <Bounties />;
    if (parts[0] === "app") return <Discover />;
    return <Discover />;
  }, [path, session.wallet, session.username, pay, refresh, signOut, connectPayOrHub, busy]);

  if (isSite(path) && !payHost) {
    if (path === "/docs") return <Docs />;
    if (path === "/support") return <Support />;
    if (path === "/open") return <OpenIntro />;
    return <Landing />;
  }

  if (session.loading) {
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

  if (!session.wallet) {
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
          {!payHost ? (
            <>
              <button className="btn ghost" onClick={() => useDemo("demo:alice")} disabled={Boolean(busy)}>
                <Icon name="person" />
                Demo Alice
              </button>
              <button className="btn ghost" onClick={() => useDemo("demo:bob")} disabled={Boolean(busy)}>
                <Icon name="person" />
                Demo Bob
              </button>
            </>
          ) : null}
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

  const who = session.username ? `@${session.username}` : "friend";
  const initial = (session.username || "?").slice(0, 1).toUpperCase();
  const demo = session.wallet.startsWith("demo:");

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
          <p>{session.username ? "The stall is open." : "Pick a username so people can find you."}</p>
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
                <strong>{session.username ? `@${session.username}` : "Set username"}</strong>
                <small>{demo ? "Demo" : "Wallet"}</small>
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
        {page}
      </main>
      <nav className="dock" aria-label="Primary">
        {DOCK.map((item) => (
          <NavLink key={item.href} {...item} path={path} />
        ))}
      </nav>
    </div>
  );
}
