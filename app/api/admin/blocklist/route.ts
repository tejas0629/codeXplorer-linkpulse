// Owner: Milan | Task: MIL-P2-5 | Priority: P2
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";

// TODO (MIL): List all blocked domains (admin only)
export async function GET(_request: NextRequest) {
  return fail("NOT_IMPLEMENTED", "Task MIL-P2-5: Admin blocklist list not implemented");
}

// TODO (MIL): Add a domain to the blocklist (admin only)
export async function POST(_request: NextRequest) {
  return fail("NOT_IMPLEMENTED", "Task MIL-P2-5: Admin blocklist add not implemented");
}
