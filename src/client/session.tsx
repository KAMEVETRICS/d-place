"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, post } from "./api";
import { demoHash, hubLogin, hubPay, inPay, sendNim, signInPay } from "./wallet";
import type { LoginProof, PayRequest } from "./wallet";
import type { Profile, Session } from "@/types";

type Boot = Session & { profile?: Profile | null; loading: boolean };

type SessionApi = {
  wallet: string;
  username: string | null;
  demo: boolean;
  loading: boolean;
  payHost: boolean;
  error: string;
  busy: string;
  refresh: () => Promise<Session & { profile: Profile | null }>;
  pay: (req: PayRequest) => Promise<string>;
  connectPayOrHub: () => Promise<void>;
  signOut: () => Promise<void>;
  useDemo: (who: "demo:alice" | "demo:bob") => Promise<void>;
};

const Ctx = createContext<SessionApi | null>(null);

function isSite(path: string) {
  return path === "/" || path === "/docs" || path === "/support" || path === "/open";
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Boot>({
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
  }, [refresh, path, router, connectPayOrHub]);

  const signOut = useCallback(async () => {
    localStorage.removeItem("dplace.demo");
    await post("logout", {});
    await refresh();
  }, [refresh]);

  const useDemo = useCallback(async (who: "demo:alice" | "demo:bob") => {
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
  }, [refresh]);

  const pay = useCallback(
    async (req: PayRequest) => {
      if (session.wallet.startsWith("demo:")) return demoHash(session.wallet, req);
      if (inPay()) return sendNim(req);
      return hubPay(req);
    },
    [session.wallet],
  );

  const value = useMemo<SessionApi>(
    () => ({
      wallet: session.wallet,
      username: session.username,
      demo: session.demo,
      loading: session.loading,
      payHost,
      error,
      busy,
      refresh,
      pay,
      connectPayOrHub,
      signOut,
      useDemo,
    }),
    [session, payHost, error, busy, refresh, pay, connectPayOrHub, signOut, useDemo],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession needs SessionProvider");
  return ctx;
}
