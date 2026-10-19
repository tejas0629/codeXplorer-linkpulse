// Owner: Milan | Task: MIL-P1-3 | Priority: P1
import { NextRequest } from "next/server";
import { fail } from "@/lib/api-response";

// TODO (MIL): Register new user account with bcrypt password hashing and duplicate check
export async function POST(_request: NextRequest) {
  return fail("NOT_IMPLEMENTED", "Task MIL-P1-3: User registration not implemented");
}
