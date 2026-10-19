// Owner: Milan | Task: MIL-P1-5 | Priority: P1
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";

// TODO (MIL): Re-enable disabled link (admin only)
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return fail("NOT_IMPLEMENTED", `Task MIL-P1-5: Admin enable link '${id}' not implemented`);
}
