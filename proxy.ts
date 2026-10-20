// Owner: Milan | Task: MIL-P1-4 | Priority: P1
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Optimistic page-level redirects only. This reads the signed JWT cookie
// without a database call. Real authorization is enforced again on the server
// in every API route through lib/rbac.ts, so hiding a page here is never the
// only access control.

const PROTECTED_PREFIXES = ["/dashboard", "/links", "/campaigns", "/import", "/trace", "/admin"];
const ADMIN_PREFIXES = ["/admin"];
const AUTH_PAGES = ["/login", "/register"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isProtected = matchesPrefix(pathname, PROTECTED_PREFIXES);
  const isAuthPage = matchesPrefix(pathname, AUTH_PAGES);

  // Short links (/[code]), visitor status pages, and the landing page stay
  // public and skip token decoding entirely.
  if (!isProtected && !isAuthPage) {
    return NextResponse.next();
  }

  let token = null;
  try {
    token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      // Auth.js uses the __Secure- cookie prefix when served over https.
      secureCookie: request.nextUrl.protocol === "https:",
    });
  } catch {
    // Missing secret or an unreadable cookie: treat as signed out.
    token = null;
  }

  if (isAuthPage) {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (matchesPrefix(pathname, ADMIN_PREFIXES) && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
