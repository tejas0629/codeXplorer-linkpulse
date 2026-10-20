// Owner: Tejas | Task: TEJ-P1-4 | Priority: P1
import { NextRequest } from "next/server";
import { after } from "next/server";
import bcrypt from "bcryptjs";
import { fail, ok } from "@/lib/api-response";
import { logClickEvent } from "@/lib/click-logger";
import { db } from "@/lib/db";
import { getVisitorSalt } from "@/lib/env";
import { buildClickEventData } from "@/lib/redirect/click-event-data";
import { resolveUnlockSecret, signUnlockCookie } from "@/lib/redirect/unlock-cookie";
import { parseUserAgent } from "@/lib/redirect/user-agent";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const normalizedCode = code.toLowerCase();
  let password: unknown;

  try {
    const body: unknown = await request.json();
    password =
      typeof body === "object" && body !== null && "password" in body
        ? body.password
        : undefined;
  } catch {
    return fail("INVALID_INPUT", "A password is required", 400);
  }

  if (typeof password !== "string" || password.length === 0) {
    return fail("INVALID_INPUT", "A password is required", 400);
  }

  const link = await db.link.findUnique({
    where: { code: normalizedCode },
    select: {
      id: true,
      code: true,
      deletedAt: true,
      passwordHash: true,
    },
  });

  if (link === null || link.deletedAt !== null || link.passwordHash === null) {
    return fail("LINK_NOT_FOUND", "Link not found", 404);
  }

  const passwordMatches = await bcrypt.compare(password, link.passwordHash);
  if (!passwordMatches) {
    const userAgent = request.headers.get("user-agent") ?? "";
    const metadata = parseUserAgent(userAgent);
    const url = new URL(request.url);
    const eventData = buildClickEventData({
      linkId: link.id,
      referrer: request.headers.get("referer"),
      userAgent,
      forwardedFor: request.headers.get("x-forwarded-for"),
      vercelCountry: request.headers.get("x-vercel-ip-country"),
      cloudflareCountry: request.headers.get("cf-ipcountry"),
      sourceParam: url.searchParams.get("src"),
      visitorSalt: getVisitorSalt(),
      result: "PASSWORD_FAILED",
      userAgentMetadata: metadata,
    });

    after(async () => {
      await logClickEvent(eventData);
    });

    return fail("INVALID_PASSWORD", "Invalid password", 401);
  }

  const secret = resolveUnlockSecret(
    process.env.AUTH_SECRET,
    process.env.VISITOR_SALT,
    process.env.NODE_ENV,
  );
  if (secret === null) {
    return fail("INTERNAL_ERROR", "Unlock is temporarily unavailable", 500);
  }

  const response = ok({ destinationUrl: `/${normalizedCode}` });
  response.cookies.set(
    `unlock_${normalizedCode}`,
    signUnlockCookie(normalizedCode, link.passwordHash, secret),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
    },
  );
  return response;
}
