// Owner: Milan | Task: MIL-P2-1 | Priority: P2
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";

// TODO (MIL): List campaigns for the current authenticated user
export async function GET(_request: NextRequest) {
  return fail("NOT_IMPLEMENTED", "Task MIL-P2-1: Campaigns listing not implemented");
}

// TODO (MIL): Create new campaign
export async function POST(_request: NextRequest) {
  return fail("NOT_IMPLEMENTED", "Task MIL-P2-1: Campaign creation not implemented");
}
