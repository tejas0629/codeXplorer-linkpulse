// Owner: Milan | Task: MIL-P2-2 | Priority: P2
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/rbac";
import { createTag, listTags } from "@/lib/tags";
import { created, ok, toErrorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listTags(user));
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    return created(await createTag(user, body));
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
