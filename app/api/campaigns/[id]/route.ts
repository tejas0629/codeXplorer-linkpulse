// Owner: Milan | Task: MIL-P2-1 | Priority: P2
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/rbac";
import { deleteCampaign, updateCampaign } from "@/lib/campaigns";
import { ok, toErrorResponse } from "@/lib/api-response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    return ok(await updateCampaign(user, id, body));
  } catch (err: unknown) {
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
    return ok(await deleteCampaign(user, id));
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
