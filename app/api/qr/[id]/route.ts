// Owner: Milan | Task: MIL-P2-4 | Priority: P2
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/rbac";
import {
  buildQrTargetUrl,
  generateQrCodePng,
  getQrLinkCode,
  parseQrSize,
  resolvePublicBaseUrl,
} from "@/lib/qr";
import { toErrorResponse } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const size = parseQrSize(request.nextUrl.searchParams.get("size"));
    const code = await getQrLinkCode(user, id);

    const target = buildQrTargetUrl(code, resolvePublicBaseUrl(request.nextUrl.origin));
    const png = await generateQrCodePng(target, size);

    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.length),
        "Content-Disposition": `inline; filename="linkpulse-${code}-qr.png"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
