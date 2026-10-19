// Owner: Tejas | Task: TEJ-P1-4 | Priority: P1
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";

// TODO (TEJ): Verify password for protected link and return destinationUrl
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  return fail("NOT_IMPLEMENTED", `Task TEJ-P1-4: Unlock link '${code}' not implemented`);
}
