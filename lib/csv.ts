// Owner: Milan | Task: MIL-P2-3 | Priority: P2
import "server-only";
import Papa from "papaparse";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-response";
import { aliasSchema, getDomainCandidates, urlSchema } from "@/lib/validation";
import { generateShortCode, normalizeCode } from "@/lib/shortcode";
import { assertRateLimit } from "@/lib/rate-limit";
import type { SessionUser } from "@/lib/rbac";
import type {
  ImportCommitResponse,
  ImportPreviewIssue,
  ImportPreviewResponse,
} from "@/types/api";

export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_BYTES = 1_000_000;

// Supported CSV columns, matched case-insensitively. Only what POST /api/links
// accepts and docs/API.md lists for import: destinationUrl and an optional code.
const COLUMN_MAP: Record<string, keyof RawImportRow> = {
  destinationurl: "destinationUrl",
  code: "code",
};

// A row as received, before validation. Cells may be any JSON value.
export interface RawImportRow {
  destinationUrl?: unknown;
  code?: unknown;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parses CSV text into import rows. Throws 400 INVALID_CSV for files that
 * cannot be read as a table with the supported columns. Row-level problems
 * (bad URL, bad alias) are left for validateImportRows to report per row.
 */
export function parseCsvText(text: string): RawImportRow[] {
  if (text.length > MAX_IMPORT_BYTES) {
    throw invalidCsv(`CSV file cannot exceed ${MAX_IMPORT_BYTES / 1_000_000} MB`);
  }

  const result = Papa.parse<Record<string, string>>(normalizeText(text), {
    header: true,
    newline: "\n",
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.some((e) => e.type === "Quotes")) {
    throw invalidCsv("CSV file is malformed (unbalanced quotes)");
  }

  const headers = (result.meta.fields ?? []).filter((h) => h.length > 0);
  const unsupported = headers.filter((h) => !(h.toLowerCase() in COLUMN_MAP));
  if (unsupported.length > 0) {
    throw invalidCsv(
      `Unsupported column '${unsupported[0].slice(0, 50)}'. Supported columns: destinationUrl, code`
    );
  }
  if (!headers.some((h) => COLUMN_MAP[h.toLowerCase()] === "destinationUrl")) {
    throw invalidCsv("CSV file must have a destinationUrl column");
  }

  const rows = result.data.map((record) => {
    const row: RawImportRow = {};
    for (const [header, value] of Object.entries(record)) {
      const key = COLUMN_MAP[header.trim().toLowerCase()];
      if (key) {
        row[key] = value;
      }
    }
    return row;
  });

  assertRowCount(rows.length);
  return rows;
}

/**
 * Reads { rows: [...] } from a JSON body as defined in docs/API.md.
 * Cell values are validated per row later, so one bad row does not reject
 * the whole request.
 */
export function rowsFromJsonBody(body: unknown): RawImportRow[] {
  const rows = body && typeof body === "object" ? (body as { rows?: unknown }).rows : undefined;
  if (!Array.isArray(rows)) {
    throw invalidCsv("Request body must contain a rows array");
  }
  assertRowCount(rows.length);

  return rows.map((item) => {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return { destinationUrl: record.destinationUrl, code: record.code };
  });
}

// Strips a UTF-8 byte order mark and unifies line endings, so files saved by
// different spreadsheet tools (CRLF, LF, or a mix) split into the same rows.
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

function normalizeText(text: string): string {
  const withoutBom = text.startsWith(BYTE_ORDER_MARK) ? text.slice(1) : text;
  return withoutBom.replace(/\r\n?/g, "\n");
}

function assertRowCount(count: number) {
  if (count === 0) {
    throw invalidCsv("CSV file has no rows to import");
  }
  if (count > MAX_IMPORT_ROWS) {
    throw invalidCsv(`CSV file cannot have more than ${MAX_IMPORT_ROWS} rows`);
  }
}

function invalidCsv(message: string): ApiError {
  return new ApiError("INVALID_CSV", message, 400);
}

// ---------------------------------------------------------------------------
// Validation (no writes)
// ---------------------------------------------------------------------------

interface CheckedRow {
  rowNumber: number;
  destinationUrl: string;
  code?: string;
  issue?: { kind: "error" | "duplicate"; message: string };
}

/**
 * Validates every row with the same rules as link creation, without writing:
 * URL format, alias format and reserved words, blocked domains, aliases
 * repeated in the file or already taken, and repeated rows without an alias.
 * Uses two database reads in total regardless of row count.
 */
async function checkRows(rows: RawImportRow[]): Promise<CheckedRow[]> {
  const checked: CheckedRow[] = rows.map((row, index): CheckedRow => {
    const rowNumber = index + 1;
    const rawUrl = typeof row.destinationUrl === "string" ? row.destinationUrl : "";
    const rawCode =
      typeof row.code === "string" ? row.code.trim() || undefined : row.code ?? undefined;
    const shownCode = typeof rawCode === "string" ? rawCode : undefined;

    const url = urlSchema.safeParse(row.destinationUrl);
    if (!url.success) {
      return {
        rowNumber,
        destinationUrl: rawUrl,
        code: shownCode,
        issue: { kind: "error", message: url.error.issues[0]?.message ?? "Invalid URL format" },
      };
    }

    if (rawCode === undefined) {
      return { rowNumber, destinationUrl: url.data };
    }

    if (typeof rawCode !== "string") {
      return {
        rowNumber,
        destinationUrl: url.data,
        issue: { kind: "error", message: "Alias must be text" },
      };
    }

    const alias = aliasSchema.safeParse(rawCode);
    if (!alias.success) {
      return {
        rowNumber,
        destinationUrl: url.data,
        code: rawCode,
        issue: { kind: "error", message: alias.error.issues[0]?.message ?? "Invalid alias" },
      };
    }

    return { rowNumber, destinationUrl: url.data, code: normalizeCode(alias.data) };
  });

  const pending = checked.filter((r) => !r.issue);

  // Blocked domains: one query for every parent domain of every URL.
  const candidatesByRow = new Map<CheckedRow, string[]>();
  for (const row of pending) {
    candidatesByRow.set(row, getDomainCandidates(new URL(row.destinationUrl).hostname));
  }
  const allCandidates = Array.from(new Set(Array.from(candidatesByRow.values()).flat()));
  if (allCandidates.length > 0) {
    const blocked = await db.blockedDomain.findMany({
      where: { domain: { in: allCandidates, mode: "insensitive" } },
      select: { domain: true },
    });
    const blockedSet = new Set(blocked.map((b) => b.domain.toLowerCase()));
    for (const [row, candidates] of candidatesByRow) {
      const hit = candidates.find((c) => blockedSet.has(c));
      if (hit) {
        row.issue = { kind: "error", message: `The domain '${hit}' is blocked by platform administrators` };
      }
    }
  }

  // Aliases already used by any link, including soft-deleted ones (codes stay reserved).
  const codes = Array.from(new Set(pending.filter((r) => !r.issue && r.code).map((r) => r.code!)));
  const takenSet = new Set<string>();
  if (codes.length > 0) {
    const taken = await db.link.findMany({
      where: { code: { in: codes, mode: "insensitive" } },
      select: { code: true },
    });
    taken.forEach((t) => takenSet.add(t.code.toLowerCase()));
  }

  const firstRowByCode = new Map<string, number>();
  const firstRowByUrl = new Map<string, number>();
  for (const row of pending) {
    if (row.issue) continue;
    if (row.code) {
      const first = firstRowByCode.get(row.code);
      if (first !== undefined) {
        row.issue = { kind: "duplicate", message: `Duplicate alias in file (same as row ${first})` };
      } else if (takenSet.has(row.code)) {
        row.issue = { kind: "duplicate", message: "Alias already taken" };
      } else {
        firstRowByCode.set(row.code, row.rowNumber);
      }
    } else {
      const first = firstRowByUrl.get(row.destinationUrl);
      if (first !== undefined) {
        row.issue = { kind: "duplicate", message: `Duplicate row in file (same as row ${first})` };
      } else {
        firstRowByUrl.set(row.destinationUrl, row.rowNumber);
      }
    }
  }

  return checked;
}

function toPreview(checked: CheckedRow[]): ImportPreviewResponse {
  const validRows: ImportPreviewResponse["validRows"] = [];
  const issues: ImportPreviewIssue[] = [];
  let errorCount = 0;
  let duplicateCount = 0;

  for (const row of checked) {
    if (row.issue) {
      if (row.issue.kind === "error") errorCount += 1;
      else duplicateCount += 1;
      issues.push({
        rowNumber: row.rowNumber,
        ...(row.code ? { code: row.code } : {}),
        error: row.issue.message,
      });
    } else {
      validRows.push({
        rowNumber: row.rowNumber,
        destinationUrl: row.destinationUrl,
        ...(row.code ? { code: row.code } : {}),
      });
    }
  }

  return {
    totalRows: checked.length,
    validCount: validRows.length,
    errorCount,
    duplicateCount,
    validRows,
    issues,
  };
}

export async function previewImport(rows: RawImportRow[]): Promise<ImportPreviewResponse> {
  return toPreview(await checkRows(rows));
}

/**
 * Kept for the original lib/csv.ts signature: parse CSV text and preview it.
 */
export async function parseCsvLinks(csvText: string): Promise<ImportPreviewResponse> {
  return previewImport(parseCsvText(csvText));
}

// ---------------------------------------------------------------------------
// Commit
// ---------------------------------------------------------------------------

/**
 * Re-validates every row on the server and imports all of them in a single
 * atomic insert, or none. The client normally sends only preview.validRows,
 * so a mixed CSV imports its good rows. If anything changed since the preview
 * (for example an alias was taken), the request fails with 400 and the
 * offending row numbers, and nothing is written.
 */
export async function commitImport(
  user: SessionUser,
  rows: RawImportRow[]
): Promise<ImportCommitResponse> {
  await assertRateLimit(user.id);

  const checked = await checkRows(rows);
  const failed = checked.filter((r) => r.issue);
  if (failed.length > 0) {
    const fields: Record<string, string> = {};
    for (const row of failed.slice(0, 50)) {
      fields[`rows.${row.rowNumber}`] = row.issue!.message;
    }
    throw new ApiError(
      "VALIDATION_ERROR",
      `${failed.length} row(s) cannot be imported. Run the preview again and import only valid rows.`,
      400,
      fields
    );
  }

  const usedCodes = new Set(checked.filter((r) => r.code).map((r) => r.code!));
  const generated = await generateCodes(
    checked.filter((r) => !r.code).length,
    usedCodes
  );

  let next = 0;
  const data = checked.map((row) => ({
    code: row.code ?? generated[next++],
    destinationUrl: row.destinationUrl,
    ownerId: user.id,
  }));

  try {
    const result = await db.link.createMany({ data });
    return { importedCount: result.count };
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === "P2002") {
      throw new ApiError(
        "VALIDATION_ERROR",
        "An alias was taken while importing. Run the preview again.",
        400
      );
    }
    throw err;
  }
}

/**
 * Generates unique short codes in bulk: candidates are checked against the
 * batch and the database in one query per round.
 */
async function generateCodes(count: number, reserved: Set<string>): Promise<string[]> {
  const result: string[] = [];
  for (let attempt = 0; attempt < 5 && result.length < count; attempt++) {
    const candidates = new Set<string>();
    while (candidates.size < count - result.length) {
      const code = generateShortCode();
      if (!reserved.has(code)) candidates.add(code);
    }
    const taken = await db.link.findMany({
      where: { code: { in: Array.from(candidates) } },
      select: { code: true },
    });
    const takenSet = new Set(taken.map((t) => t.code));
    for (const code of candidates) {
      if (!takenSet.has(code)) {
        result.push(code);
        reserved.add(code);
      }
    }
  }
  if (result.length < count) {
    throw new ApiError("INTERNAL_ERROR", "Could not generate unique short codes", 500);
  }
  return result;
}
