// Owner: Tejas | Task: TEJ-P1-4 | Priority: P1
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { fail } from "@/lib/api-response";
import { logClickEvent } from "@/lib/click-logger";
import { db } from "@/lib/db";
import type { ClickResult } from "@prisma/client";
import { getRedirectLink } from "@/lib/redirect/get-link";
import { checkRedirectRules } from "@/lib/redirect/rules";
import { buildClickEventData } from "@/lib/redirect/click-event-data";
import { parseUserAgent } from "@/lib/redirect/user-agent";
import { getVisitorSalt } from "@/lib/env";
import { resolveUnlockSecret, verifyUnlockCookie } from "@/lib/redirect/unlock-cookie";

function scheduleClickLog(
  request: NextRequest,
  linkId: string,
  result: ClickResult,
  userAgent: string,
): void {
  const url = new URL(request.url);
  const metadata = parseUserAgent(userAgent);
  const data = buildClickEventData({
    linkId,
    referrer: request.headers.get("referer"),
    userAgent,
    forwardedFor: request.headers.get("x-forwarded-for"),
    vercelCountry: request.headers.get("x-vercel-ip-country"),
    cloudflareCountry: request.headers.get("cf-ipcountry"),
    sourceParam: url.searchParams.get("src"),
    visitorSalt: getVisitorSalt(),
    result,
    userAgentMetadata: metadata,
  });

  after(async () => {
    await logClickEvent(data);
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const normalizedCode = code.toLowerCase();
  const userAgent = request.headers.get("user-agent") ?? "";
  const link = await getRedirectLink(normalizedCode);
  const cookieValue = request.cookies.get(`unlock_${normalizedCode}`)?.value;
  const secret = resolveUnlockSecret(
    process.env.AUTH_SECRET,
    process.env.VISITOR_SALT,
    process.env.NODE_ENV,
  );
  const passwordUnlocked =
    link?.snapshot.passwordHash !== null && link?.snapshot.passwordHash !== undefined
      ? verifyUnlockCookie(
          normalizedCode,
          link.snapshot.passwordHash,
          cookieValue,
          secret,
        )
      : false;
  const decision = checkRedirectRules(link?.snapshot ?? null, {
    now: new Date(),
    passwordUnlocked,
  });

  switch (decision.kind) {
    case "NOT_FOUND":
    case "DELETED":
      return fail("NOT_FOUND", "Link not found", 404);
    case "DISABLED":
      if (link) scheduleClickLog(request, link.id, "DISABLED", userAgent);
      return fail("FORBIDDEN", "Link disabled", 410);
    case "EXPIRED":
      if (link) scheduleClickLog(request, link.id, "EXPIRED", userAgent);
      return fail("NOT_FOUND", "Link expired", 410);
    case "LIMIT_REACHED":
      if (link) scheduleClickLog(request, link.id, "LIMIT_REACHED", userAgent);
      return fail("NOT_FOUND", "Click limit reached", 410);
    case "PASSWORD_REQUIRED":
      return NextResponse.redirect(
        new URL(`/unlock/${encodeURIComponent(code.toLowerCase())}`, request.url),
      );
    case "OK": {
      const metadata = parseUserAgent(userAgent);
      if (link === null) {
        return fail("INTERNAL_ERROR", "Redirect destination unavailable", 500);
      }

      if (!metadata.isBot) {
        const countResult = await db.$executeRaw`
          UPDATE "Link"
          SET "clickCount" = "clickCount" + 1
          WHERE id = ${link.id}
            AND ("maxClicks" IS NULL OR "clickCount" < "maxClicks")
        `;

        if (countResult === 0) {
          scheduleClickLog(request, link.id, "LIMIT_REACHED", userAgent);
          return fail("NOT_FOUND", "Click limit reached", 410);
        }
      }

      scheduleClickLog(request, link.id, "SUCCESS", userAgent);
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
