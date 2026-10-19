// Owner: Milan | Task: MIL-P1-6 | Priority: P1
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";

// TODO (MIL): List all links platform-wide with status and search (admin only)
export async function GET(_request: NextRequest) {
  return fail("NOT_IMPLEMENTED", "Task MIL-P1-6: Admin links list not implemented");
}
