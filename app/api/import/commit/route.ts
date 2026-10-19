// Owner: Milan | Task: MIL-P2-3 | Priority: P2
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";

// TODO (MIL): Commit pre-validated CSV link rows in batch into the database
export async function POST(_request: NextRequest) {
  return fail("NOT_IMPLEMENTED", "Task MIL-P2-3: CSV import commit not implemented");
}
