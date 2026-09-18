import type { NextConfig } from "next";

const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || "https://app.deplace.space").replace(/\/$/, "");

const STALL_PATHS = [
  "/app",
  "/open",
  "/learn",
  "/bounties",
  "/bounties/:path*",
  "/create",
  "/library",
  "/saved",
  "/me",
  "/c/:path*",
  "/u/:path*",
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client"],
  async redirects() {
    return STALL_PATHS.flatMap((source) =>
      ["deplace.space", "www.deplace.space"].map((host) => ({
        source,
        has: [{ type: "host" as const, value: host }],
        destination: source === "/app" ? `${APP_ORIGIN}/` : `${APP_ORIGIN}${source}`,
        permanent: false,
      })),
    );
  },
};

export default nextConfig;
