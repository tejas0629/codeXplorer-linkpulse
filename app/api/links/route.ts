// Owner: Chirag | Task: CHI-P1-4 | Priority: P1
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";

// TODO (CHI): Create new shortened link with optional rules, tags, and campaign
export async function POST(_request: NextRequest) {
  return fail("NOT_IMPLEMENTED", "Task CHI-P1-4: Link creation not implemented");
}

// TODO (CHI): List links with pagination, search, status filter, and ownership check
export async function GET(_request: NextRequest) {
  return fail("NOT_IMPLEMENTED", "Task CHI-P1-4: Links listing not implemented");
}
