// Owner: Tejas | Task: TEJ-P2-3 | Priority: P2
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";
import { db } from "@/lib/db";
import { ok } from "@/lib/api-response";
import { traceRedirectRules } from "@/lib/redirect/trace";
import { getTraceViewer } from "@/lib/redirect/trace-auth";

// TODO (TEJ): Simulate link rule evaluation step by step for diagnostics
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim().toLowerCase();
  if (!code) {
    return fail("MISSING_CODE", "The code query parameter is required", 400);
  }

  const viewer = await getTraceViewer();
  if (viewer === null) {
    return fail("UNAUTHORIZED", "Authentication required", 401);
  }

  const link = await db.link.findFirst({
    where: {
      code,
      ...(viewer.role === "USER" ? { ownerId: viewer.id } : {}),
    },
    select: {
      code: true,
      deletedAt: true,
      status: true,
      expiresAt: true,
      maxClicks: true,
      clickCount: true,
      passwordHash: true,
      destinationUrl: true,
    },
  });

  if (link === null) {
    return fail("LINK_NOT_FOUND", "Link not found", 404);
  }

  const trace = traceRedirectRules(
    {
      deletedAt: link.deletedAt,
      status: link.status,
      expiresAt: link.expiresAt,
      maxClicks: link.maxClicks,
      clickCount: link.clickCount,
      passwordHash: link.passwordHash,
    },
    new Date(),
    false,
  );

  return ok({
    code: link.code,
    steps: trace.steps.map((step) => ({
      rule: step.rule,
      passed: step.passed,
      detail: step.detail,
    })),
    outcome: trace.outcome,
    targetUrl: link.destinationUrl,
  });
}
