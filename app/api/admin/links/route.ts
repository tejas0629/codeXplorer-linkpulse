// Owner: Milan | Task: MIL-P1-6 | Priority: P1
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { listAdminLinks } from "@/lib/admin";
import { ok, toErrorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { links, meta } = await listAdminLinks(request.nextUrl.searchParams);
    return ok(links, { meta });
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
