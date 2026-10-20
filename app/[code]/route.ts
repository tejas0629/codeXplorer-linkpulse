// Owner: Tejas | Task: TEJ-P1-4 | Priority: P1
import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api-response";
import { getRedirectLink } from "@/lib/redirect/get-link";
import { checkRedirectRules } from "@/lib/redirect/rules";
import { parseUserAgent } from "@/lib/redirect/user-agent";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const userAgent = request.headers.get("user-agent") ?? "";
  const link = await getRedirectLink(code);
  const decision = checkRedirectRules(link?.snapshot ?? null, {
    now: new Date(),
    passwordUnlocked: false,
  });

  switch (decision.kind) {
    case "NOT_FOUND":
    case "DELETED":
      return fail("NOT_FOUND", "Link not found", 404);
    case "DISABLED":
      return fail("FORBIDDEN", "Link disabled", 410);
    case "EXPIRED":
      return fail("NOT_FOUND", "Link expired", 410);
    case "LIMIT_REACHED":
      return fail("NOT_FOUND", "Click limit reached", 410);
    case "PASSWORD_REQUIRED":
      return NextResponse.redirect(
        new URL(`/unlock/${encodeURIComponent(code.toLowerCase())}`, request.url),
      );
    case "OK": {
      const metadata = parseUserAgent(userAgent);
      const destinationUrl =
        metadata.deviceType === "mobile" && link?.mobileUrl
          ? link.mobileUrl
          : link?.destinationUrl;

      if (destinationUrl === undefined) {
        return fail("INTERNAL_ERROR", "Redirect destination unavailable", 500);
      }

      return NextResponse.redirect(destinationUrl, { status: 302 });
    }
  }
}
