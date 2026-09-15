import type { FormEvent, ReactNode } from "react";
import { formatNim } from "@/money";

const PATHS = {
  shop: ["M3 10l2-4h14l2 4H3z", "M5 10v8h14V10", "M3 18h18", "M10 14h4"],
  listings: ["M8 4h11v16H8z", "M5 7h11v16H5z"],
  bounties: ["M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z", "M9 12h6", "M12 9v6"],
  saved: ["M7 3h10v18l-5-4-5 4V3z"],
  library: ["M12 5v14", "M12 5C9 4 6 4 4 6v12c2-1 5-1 8 0", "M12 5c3-1 6-1 8 1v12c-2-1-5-1-8 0"],
  create: ["M5 5h14v14H5z", "M12 8v8", "M8 12h8"],
  me: ["M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", "M4 20c1.2-4 4-6 8-6s6.8 2 8 6"],
  wallet: ["M4 8h16v12H4z", "M4 8l2-4h12l2 4", "M14 14h5v3h-5z"],
  out: ["M5 4h8v16H5z", "M13 12h7", "M17 9l3 3-3 3"],
  lock: ["M8 11V8a4 4 0 1 1 8 0v3", "M6 11h12v10H6z"],
  check: ["M5 12l5 5 9-9"],
  down: ["M12 4v12", "M7 12l5 5 5-5", "M5 20h14"],
  back: ["M15 5l-8 7 8 7"],
  paper: ["M7 3h8l4 4v14H7z", "M15 3v4h4", "M10 12h6", "M10 16h4"],
  coin: ["M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z", "M9 12h6"],
  flag: ["M6 3v18", "M6 4h12l-3 4 3 4H6"],
  person: ["M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", "M4 20c1.2-4 4-6 8-6s6.8 2 8 6"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  send: ["M4 12h16", "M14 6l6 6-6 6"],
  pay: ["M8 16a4 4 0 1 0 8 0 4 4 0 0 0-8 0", "M8 12a4 4 0 0 1 8 0", "M8 8a4 4 0 0 1 8 0"],
  data: ["M5 20V10", "M11 20V4", "M17 20v-7", "M3 20h18"],
  code: ["M8 6L3 12l5 6", "M16 6l5 6-5 6"],
  design: ["M4 20l6-2 10-10-4-4L6 14z", "M14 6l4 4"],
  writing: ["M5 5h14v14H5z", "M8 9h8", "M8 13h8", "M8 17h5"],
  video: ["M4 7h16v10H4z", "M10 10l5 2-5 2z"],
  music: ["M9 6v11a3 3 0 1 1-2-2.8V10h8V6H9z"],
  business: ["M4 9h16v11H4z", "M9 9V6h6v3", "M4 14h16"],
  education: ["M12 4L3 8l9 4 9-4-9-4z", "M5 10v5c3 2 11 2 14 0v-5"],
  other: ["M7 7h10v10H7z"],
  search: ["M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z", "M16 16l5 5"],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, filled, size = 20 }: { name: IconName; filled?: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function Money({ luna }: { luna: number }) {
  return <span className="price">{formatNim(luna)}</span>;
}

export function Banner({
  kind = "info",
  children,
}: {
  kind?: "info" | "ok" | "err" | "fund";
  children: ReactNode;
}) {
  return (
    <div className={`banner ${kind === "info" ? "" : kind}`} role="status">
      {children}
    </div>
  );
}

export function Empty({
  title,
  body,
  action,
  page,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  page?: boolean;
}) {
  const Title = page ? "h1" : "p";
  return (
    <div className="empty stack">
      <Title className={page ? undefined : "empty-title"}>{title}</Title>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Skeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div className="skel" aria-busy="true" aria-live="polite">
      <span className="sr">{label}</span>
      <div className="skel-line short" />
      <div className="skel-line mid" />
      <div className="skel-card" />
      <div className="skel-card" />
    </div>
  );
}

export function Meter({ value, label }: { value: number; label: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="meter">
      <span className="meta">{label}</span>
      <div className="meter-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function SearchField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="search">
      <Icon name="search" />
      <span className="sr">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        autoComplete="off"
      />
    </label>
  );
}

export function Field(props: {
  label: string;
  name: string;
  type?: string;
  textarea?: boolean;
  required?: boolean;
  defaultValue?: string | number;
  min?: number;
  max?: number;
  maxLength?: number;
  step?: number;
}) {
  return (
    <label className="field">
      <span>{props.label}</span>
      {props.textarea ? (
        <textarea
          name={props.name}
          required={props.required}
          defaultValue={props.defaultValue}
          maxLength={props.maxLength}
        />
      ) : (
        <input
          name={props.name}
          type={props.type ?? "text"}
          required={props.required}
          defaultValue={props.defaultValue}
          min={props.min}
          max={props.max}
          maxLength={props.maxLength}
          step={props.step}
        />
      )}
    </label>
  );
}

export function formData(e: FormEvent<HTMLFormElement>) {
  const fd = new FormData(e.currentTarget);
  const out: Record<string, string> = {};
  fd.forEach((v, k) => {
    out[k] = String(v);
  });
  return out;
}
