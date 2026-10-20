// Owner: Milan | Task: MIL-P1-5 | Priority: P1
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { enableLinkAsAdmin } from "@/lib/admin";
import { ok, toErrorResponse } from "@/lib/api-response";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    return ok(await enableLinkAsAdmin(id));
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
