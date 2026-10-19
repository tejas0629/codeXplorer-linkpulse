// Owner: Chirag | Task: CHI-P1-6 | Priority: P1
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/links-auth";
import { checkLink } from "@/lib/links";
import { ok, toErrorResponse } from "@/lib/api-response";
import { RateLimitError } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const result = await checkLink(searchParams, user.id);
    return ok(result);
  } catch (err: unknown) {
    if (err instanceof RateLimitError) {
      return err.toResponse();
    }
    return toErrorResponse(err);
  }
}
