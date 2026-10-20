// Owner: Milan | Task: MIL-P2-5 | Priority: P2
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { removeBlockedDomain } from "@/lib/blocklist";
import { ok, toErrorResponse } from "@/lib/api-response";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    return ok(await removeBlockedDomain(id));
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
