// Owner: Chirag | Task: CHI-P1-5 | Priority: P1
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";

// TODO (CHI): Read single link details (owner or admin only)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return fail("NOT_IMPLEMENTED", `Task CHI-P1-5: Read link '${id}' not implemented`);
}

// TODO (CHI): Update link properties and rules (owner or admin only)
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return fail("NOT_IMPLEMENTED", `Task CHI-P1-5: Update link '${id}' not implemented`);
}

// TODO (CHI): Soft/hard delete link (owner or admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return fail("NOT_IMPLEMENTED", `Task CHI-P1-5: Delete link '${id}' not implemented`);
}
