// Owner: Milan | Task: MIL-P1-2 | Priority: P1
import { getCurrentSession } from "@/lib/rbac";
import { ok, toErrorResponse } from "@/lib/api-response";
import type { SessionResponse } from "@/types/api";

export async function GET() {
  try {
    const current = await getCurrentSession();
    if (!current) {
      return ok<SessionResponse | null>(null, { headers: { "Cache-Control": "no-store" } });
    }

    const { id, name, email, role } = current.user;
    return ok<SessionResponse>(
      { user: { id, name, email, role }, expires: current.expires },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
