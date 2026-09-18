import type { NextConfig } from "next";

const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || "https://app.deplace.space").replace(/\/$/, "");
const APP_HOST = "app.deplace.space";

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
    const fromApex = STALL_PATHS.flatMap((source) =>
      ["deplace.space", "www.deplace.space"].map((host) => ({
        source,
        has: [{ type: "host" as const, value: host }],
        destination: source === "/app" ? `${APP_ORIGIN}/` : `${APP_ORIGIN}${source}`,
        permanent: false,
      })),
    );
    return [
      ...fromApex,
      {
        source: "/app",
        has: [{ type: "host" as const, value: APP_HOST }],
        destination: "/",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: APP_HOST }],
          destination: "/app",
        },
      ],
    };
  },
};

export default nextConfig;
