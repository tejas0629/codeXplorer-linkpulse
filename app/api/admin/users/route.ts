// Owner: Milan | Task: MIL-P1-6 | Priority: P1
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { listAdminUsers } from "@/lib/admin";
import { ok, toErrorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { users, meta } = await listAdminUsers(request.nextUrl.searchParams);
    return ok(users, { meta });
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
