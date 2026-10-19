// Owner: Chirag | Task: CHI-P2-2 | Priority: P2
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/links-auth";
import { getLinkAlerts } from "@/lib/analytics";
import { ok, toErrorResponse } from "@/lib/api-response";

export async function GET(_request: NextRequest) {
  try {
    const user = await requireUser();
    const scope = { userId: user.id, isAdmin: user.role === "ADMIN" };
    const data = await getLinkAlerts({ scope });
    return ok(data);
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
