// Owner: Milan | Task: MIL-P2-1 | Priority: P2
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";

// TODO (MIL): Update campaign details (owner or admin only)
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return fail("NOT_IMPLEMENTED", `Task MIL-P2-1: Update campaign '${id}' not implemented`);
}

// TODO (MIL): Delete campaign (owner or admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return fail("NOT_IMPLEMENTED", `Task MIL-P2-1: Delete campaign '${id}' not implemented`);
}
