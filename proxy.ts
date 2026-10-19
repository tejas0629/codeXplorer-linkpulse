// Owner: Milan | Task: MIL-P1-4 | Priority: P1
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// TODO (MIL-P1-4): Protect dashboard and admin routes, redirect unauthenticated users to /login
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets, visitor status pages, and auth endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/status") ||
    pathname.startsWith("/unlock") ||
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register"
  ) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
