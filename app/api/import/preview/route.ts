// Owner: Milan | Task: MIL-P2-3 | Priority: P2
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/rbac";
import { MAX_IMPORT_BYTES, parseCsvText, previewImport, rowsFromJsonBody } from "@/lib/csv";
import { ApiError, ok, toErrorResponse } from "@/lib/api-response";

/**
 * Accepts either the JSON body from docs/API.md ({ rows: [...] }) or a raw
 * CSV upload with Content-Type text/csv. Never writes to the database.
 */
export async function POST(request: NextRequest) {
  try {
    await requireUser();

    const text = await request.text();
    if (text.length > MAX_IMPORT_BYTES) {
      throw new ApiError("INVALID_CSV", "CSV file cannot exceed 1 MB", 400);
    }

    const contentType = request.headers.get("content-type") ?? "";
    let rows;
    if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
      rows = parseCsvText(text);
    } else {
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        throw new ApiError("INVALID_CSV", "Request body must be JSON or text/csv", 400);
      }
      rows = rowsFromJsonBody(body);
    }

    return ok(await previewImport(rows));
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
