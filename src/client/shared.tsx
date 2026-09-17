"use client";

import { useEffect, useState } from "react";
import { api, post } from "./api";
import { Banner, Field, Icon, formData } from "./ui";
import { explorerTx } from "@/money";
import { LIMIT } from "@/validate";

export function useLoad<T>(path: string) {
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

export function hay(q: string, ...parts: string[]) {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  return parts.some((p) => p.toLowerCase().includes(n));
}

export function TxLink({ hash }: { hash: string }) {
  const href = explorerTx(hash);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer">
      View on Nimiq Watch
    </a>
  );
}

export function SaveButton({ kind, id, saved }: { kind: "content" | "bounty"; id: string; saved: boolean }) {
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

export function PaidFile({ id, mime, name }: { id: string; mime: string | null; name: string | null }) {
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

export function Report({ targetType, targetId }: { targetType: "content" | "bounty"; targetId: string }) {
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
