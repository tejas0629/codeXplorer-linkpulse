// Owner: Milan | Task: MIL-P2-3 | Priority: P2
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";

// TODO (MIL): Parse uploaded CSV rows and validate format, blocked domains, and duplicates without persisting
export async function POST(_request: NextRequest) {
  return fail("NOT_IMPLEMENTED", "Task MIL-P2-3: CSV import preview not implemented");
}
