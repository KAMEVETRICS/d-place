import { NextRequest, NextResponse } from "next/server";

function hostOf(req: NextRequest) {
  return (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
}

function isAppHost(host: string) {
  return host === "app.deplace.space" || host.startsWith("app.");
}

export function middleware(req: NextRequest) {
  const host = hostOf(req);
  const { pathname } = req.nextUrl;
  if (!isAppHost(host)) return NextResponse.next();

  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.rewrite(url);
  }

  if (pathname === "/app") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app"],
};
