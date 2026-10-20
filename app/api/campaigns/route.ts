// Owner: Milan | Task: MIL-P2-1 | Priority: P2
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/rbac";
import { createCampaign, listCampaigns } from "@/lib/campaigns";
import { created, ok, toErrorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listCampaigns(user));
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    return created(await createCampaign(user, body));
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
