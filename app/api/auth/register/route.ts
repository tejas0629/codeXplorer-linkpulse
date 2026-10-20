// Owner: Milan | Task: MIL-P1-3 | Priority: P1
import { NextRequest } from "next/server";
import { registerUser } from "@/lib/auth";
import { created, toErrorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const user = await registerUser(body);
    return created(user);
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
