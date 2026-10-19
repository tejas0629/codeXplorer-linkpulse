// Owner: Milan | Task: MIL-P2-2 | Priority: P2
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";

// TODO (MIL): List all available tags
export async function GET(_request: NextRequest) {
  return fail("NOT_IMPLEMENTED", "Task MIL-P2-2: Tags listing not implemented");
}

// TODO (MIL): Create new tag
export async function POST(_request: NextRequest) {
  return fail("NOT_IMPLEMENTED", "Task MIL-P2-2: Tag creation not implemented");
}
