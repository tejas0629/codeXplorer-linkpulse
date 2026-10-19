// Owner: Chirag | Task: CHI-P2-1 | Priority: P2
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/links-auth";
import { parseQuery } from "@/lib/validation";
import { analyticsQuerySchema } from "@/lib/analytics-schema";
import { getCampaignAnalytics } from "@/lib/analytics";
import { ok, toErrorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const query = parseQuery(analyticsQuerySchema, request.nextUrl.searchParams);
    const scope = { userId: user.id, isAdmin: user.role === "ADMIN" };
    const data = await getCampaignAnalytics({ scope, ...query });
    return ok(data);
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
