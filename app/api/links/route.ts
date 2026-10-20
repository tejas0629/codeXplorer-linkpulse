// Owner: Chirag | Task: CHI-P1-4 | Priority: P1
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/links-auth";
import { createLink, listLinks } from "@/lib/links";
import { created, ok, toErrorResponse, type PaginationMeta } from "@/lib/api-response";
import { RateLimitError } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    const link = await createLink(user, body);
    return created(link);
  } catch (err: unknown) {
    if (err instanceof RateLimitError) {
      return err.toResponse();
    }
    return toErrorResponse(err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;
    const result = await listLinks(user, searchParams);
    return ok(result.links, { meta: result.meta as unknown as PaginationMeta });
  } catch (err: unknown) {
    if (err instanceof RateLimitError) {
      return err.toResponse();
    }
    return toErrorResponse(err);
  }
}
