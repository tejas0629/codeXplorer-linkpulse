// Owner: Milan | Task: MIL-P2-5 | Priority: P2
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { addBlockedDomain, listBlockedDomains } from "@/lib/blocklist";
import { created, ok, toErrorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await listBlockedDomains());
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    return created(await addBlockedDomain(admin, body));
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
