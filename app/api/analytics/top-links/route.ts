// Owner: Chirag | Task: CHI-P1-8 | Priority: P1
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/links-auth";
import { parseQuery } from "@/lib/validation";
import { analyticsQuerySchema } from "@/lib/analytics-schema";
import { getTopLinks } from "@/lib/analytics";
import { ok, toErrorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const query = parseQuery(analyticsQuerySchema, request.nextUrl.searchParams);
    const scope = { userId: user.id, isAdmin: user.role === "ADMIN" };
    const data = await getTopLinks({ scope, ...query });
    return ok(data);
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
