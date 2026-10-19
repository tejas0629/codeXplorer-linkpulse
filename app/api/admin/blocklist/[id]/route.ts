// Owner: Milan | Task: MIL-P2-5 | Priority: P2
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";

// TODO (MIL): Remove domain from blocklist (admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return fail("NOT_IMPLEMENTED", `Task MIL-P2-5: Admin remove blocklist entry '${id}' not implemented`);
}
