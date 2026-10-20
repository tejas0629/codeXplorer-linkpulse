// Owner: Chirag | Task: CHI-P2-5 | Priority: P2
import "server-only";
import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { checkDestination } from "@/lib/health-check";
import { getEnv } from "@/lib/env";
import { ok, fail, toErrorResponse } from "@/lib/api-response";

/**
 * Validates the Authorization: Bearer <CRON_SECRET> header using timingSafeEqual.
 */
function verifyCronAuth(
  req: NextRequest
): { authorized: boolean; failureResponse?: ReturnType<typeof fail> } {
  let secret: string | undefined = process.env.CRON_SECRET;
  if (!secret) {
    try {
      secret = getEnv().CRON_SECRET;
    } catch {
      secret = undefined;
    }
  }

  if (!secret) {
    const isProd = process.env.NODE_ENV === "production";
    return {
      authorized: false,
      failureResponse: fail(
        "UNAUTHORIZED",
        "Cron secret is not configured",
        isProd ? 503 : 401
      ),
    };
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      authorized: false,
      failureResponse: fail(
        "UNAUTHORIZED",
        "Missing or invalid authorization header",
        401
      ),
    };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const secretBuf = Buffer.from(secret);
  const tokenBuf = Buffer.from(token);

  if (
    secretBuf.length !== tokenBuf.length ||
    !crypto.timingSafeEqual(secretBuf, tokenBuf)
  ) {
    return {
      authorized: false,
      failureResponse: fail("UNAUTHORIZED", "Invalid cron secret", 401),
    };
  }

  return { authorized: true };
}

export async function GET(req: NextRequest) {
  try {
    const authCheck = verifyCronAuth(req);
    if (!authCheck.authorized && authCheck.failureResponse) {
      return authCheck.failureResponse;
    }

    const links = await db.link.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
      },
      orderBy: {
        updatedAt: "asc",
      },
      take: 50,
      select: {
        id: true,
        code: true,
        destinationUrl: true,
      },
    });

    const results = [];
    for (const link of links) {
      const checkResult = await checkDestination(link.destinationUrl);
      results.push({
        linkId: link.id,
        code: link.code,
        destinationUrl: link.destinationUrl,
        ...checkResult,
      });
    }

    return ok({
      checked: results.length,
      persisted: false,
      missingSchemaFields: [
        "Link.lastCheckedAt (DateTime?)",
        "Link.healthStatus (String? or enum)",
      ],
      results,
    });
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
