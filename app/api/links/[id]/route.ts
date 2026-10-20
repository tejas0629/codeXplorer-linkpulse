// Owner: Chirag | Task: CHI-P1-5 | Priority: P1
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/links-auth";
import { getLink, updateLink, softDeleteLink } from "@/lib/links";
import { ok, toErrorResponse } from "@/lib/api-response";
import { RateLimitError } from "@/lib/rate-limit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const link = await getLink(user, id);
    return ok(link);
  } catch (err: unknown) {
    if (err instanceof RateLimitError) {
      return err.toResponse();
    }
    return toErrorResponse(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const updated = await updateLink(user, id, body);
    return ok(updated);
  } catch (err: unknown) {
    if (err instanceof RateLimitError) {
      return err.toResponse();
    }
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const result = await softDeleteLink(user, id);
    return ok(result);
  } catch (err: unknown) {
    if (err instanceof RateLimitError) {
      return err.toResponse();
    }
    return toErrorResponse(err);
  }
}
