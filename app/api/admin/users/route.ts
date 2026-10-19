// Owner: Milan | Task: MIL-P1-6 | Priority: P1
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";

// TODO (MIL): List all platform users with pagination, search, and link counts (admin only)
export async function GET(_request: NextRequest) {
  return fail("NOT_IMPLEMENTED", "Task MIL-P1-6: Admin users list not implemented");
}
