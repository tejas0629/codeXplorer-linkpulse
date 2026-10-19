// Owner: Milan | Task: MIL-P1-2 | Priority: P1
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";

// TODO (MIL): Set up NextAuth handlers using handlers from lib/auth.ts
export async function GET(_request: NextRequest) {
  return fail("NOT_IMPLEMENTED", "Task MIL-P1-2: Auth GET handler not implemented");
}

export async function POST(_request: NextRequest) {
  return fail("NOT_IMPLEMENTED", "Task MIL-P1-2: Auth POST handler not implemented");
}
