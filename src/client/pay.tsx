"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./ui";
import { useSession } from "./session";
import { payError, type PayRequest } from "./wallet";

export function usePayFlow(opts: {
  pendingHash?: string;
  settled?: boolean;
  confirm?: (hash: string) => Promise<boolean>;
} = {}) {
  const { pay } = useSession();
  const [armed, setArmed] = useState(false);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [hash, setHash] = useState("");
  const confirmRef = useRef(opts.confirm);
  confirmRef.current = opts.confirm;
  const activeHash = hash || opts.pendingHash || "";
  const waiting = Boolean(activeHash && !opts.settled && status !== "failed");

  useEffect(() => {
    if (!activeHash || opts.settled || !confirmRef.current) return;
    let stop = false;
    let n = 0;
    async function tick() {
      n += 1;
      try {
        if (await confirmRef.current!(activeHash)) {
          if (!stop) {
            setStatus("");
            setArmed(false);
          }
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
  }, [activeHash, opts.settled]);

  return {
    armed,
    status,
    err,
    hash: activeHash,
    waiting,
    arm() {
      setArmed(true);
      setErr("");
      setStatus("");
    },
    disarm() {
      setArmed(false);
    },
    async run(req: PayRequest, confirm?: (hash: string) => Promise<boolean>) {
      const check = confirm ?? confirmRef.current;
      setErr("");
      setStatus("A Hub window should open. Approve the payment there.");
      try {
        const sent = await pay(req);
        setHash(sent);
        setStatus("NIM sent. Confirming on the Nimiq chain…");
        if (!check) {
          setStatus("");
          setArmed(false);
          return true;
        }
        const ok = await check(sent);
        if (ok) {
          setStatus("");
          setArmed(false);
          return true;
        }
        setStatus("NIM already left your wallet. Waiting for the chain to confirm it.");
        return false;
      } catch (e) {
        setErr(payError(e));
        setStatus("failed");
        return false;
      }
    },
    retry() {
      if (activeHash && confirmRef.current) void confirmRef.current(activeHash);
    },
  };
}

export function PayBar({
  icon,
  idle,
  armedLabel,
  armed,
  disabled,
  waiting,
  onIdle,
  onPay,
  onBack,
  onRetry,
}: {
  icon: IconName;
  idle: string;
  armedLabel: string;
  armed: boolean;
  disabled?: boolean;
  waiting?: boolean;
  onIdle: () => void;
  onPay: () => void;
  onBack: () => void;
  onRetry?: () => void;
}) {
  if (waiting) {
    return (
      <div className="pay-bar">
        <button className="btn gold" type="button" onClick={onRetry} disabled={!onRetry}>
          <Icon name="check" />
          Check the chain again
        </button>
      </div>
    );
  }
  return (
    <div className="pay-bar">
      <button className="btn gold" type="button" onClick={armed ? onPay : onIdle} disabled={disabled}>
        <Icon name={icon} />
        {armed ? armedLabel : idle}
      </button>
      {armed ? (
        <button className="btn ghost" type="button" onClick={onBack}>
          <Icon name="back" />
          Back
        </button>
      ) : null}
    </div>
  );
}
