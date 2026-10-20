// Owner: Milan | Task: MIL-P2-3 | Priority: P2
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/rbac";
import { MAX_IMPORT_BYTES, commitImport, rowsFromJsonBody } from "@/lib/csv";
import { ApiError, created, toErrorResponse } from "@/lib/api-response";
import { RateLimitError } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    const text = await request.text();
    if (text.length > MAX_IMPORT_BYTES) {
      throw new ApiError("VALIDATION_ERROR", "Import cannot exceed 1 MB", 400);
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Request body must be valid JSON", 400);
    }

    let rows;
    try {
      rows = rowsFromJsonBody(body);
    } catch (err: unknown) {
      // docs/API.md lists VALIDATION_ERROR (not INVALID_CSV) for commit.
      if (err instanceof ApiError) {
        throw new ApiError("VALIDATION_ERROR", err.message, 400);
      }
      throw err;
    }

    return created(await commitImport(user, rows));
  } catch (err: unknown) {
    if (err instanceof RateLimitError) {
      return err.toResponse();
    }
    return toErrorResponse(err);
  }
}
