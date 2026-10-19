// Owner: Milan | Task: MIL-P2-4 | Priority: P2
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";

// TODO (MIL): Generate PNG QR code with ?src=qr appended to link destination
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return fail("NOT_IMPLEMENTED", `Task MIL-P2-4: QR code for link '${id}' not implemented`);
}
