// Owner: Tejas | Task: TEJ-P1-3 | Priority: P1
import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "RATE_LIMIT_EXCEEDED"
  | "NOT_IMPLEMENTED"
  | "INTERNAL_ERROR"
  | "INVALID_INPUT"
  | "INVALID_PASSWORD"
  | "LINK_NOT_FOUND"
  | "EMAIL_EXISTS"
  | "INVALID_URL"
  | "BLOCKED_DOMAIN"
  | "INVALID_ALIAS"
  | "ALIAS_TAKEN"
  | "MISSING_QUERY_PARAMS"
  | "TAG_EXISTS"
  | "INVALID_CSV"
  | "ADMIN_REQUIRED"
  | "INVALID_DOMAIN"
  | "DOMAIN_EXISTS"
  | "MISSING_CODE";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiSuccessBody<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  error: {
    code: ErrorCode | string;
    message: string;
    fields?: Record<string, string>;
  };
}

export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly fields?: Record<string, string>;

  constructor(
    code: ErrorCode,
    message: string,
    status: number = defaultStatusForCode(code),
    fields?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export function defaultStatusForCode(code: ErrorCode | string): number {
  switch (code) {
    case "VALIDATION_ERROR":
    case "INVALID_INPUT":
    case "INVALID_URL":
    case "INVALID_ALIAS":
    case "BLOCKED_DOMAIN":
    case "INVALID_CSV":
    case "INVALID_DOMAIN":
    case "MISSING_QUERY_PARAMS":
    case "MISSING_CODE":
      return 400;
    case "UNAUTHORIZED":
    case "INVALID_PASSWORD":
      return 401;
    case "FORBIDDEN":
    case "ADMIN_REQUIRED":
      return 403;
    case "NOT_FOUND":
    case "LINK_NOT_FOUND":
      return 404;
    case "CONFLICT":
    case "ALIAS_TAKEN":
    case "EMAIL_EXISTS":
    case "TAG_EXISTS":
    case "DOMAIN_EXISTS":
      return 409;
    case "RATE_LIMITED":
    case "RATE_LIMIT_EXCEEDED":
      return 429;
    case "NOT_IMPLEMENTED":
      return 501;
    case "INTERNAL_ERROR":
    default:
      return 500;
  }
}

export function ok<T>(
  data: T,
  options?: { meta?: PaginationMeta; status?: number; headers?: HeadersInit }
): NextResponse<ApiSuccessBody<T>> {
  const body: ApiSuccessBody<T> = { data };
  if (options?.meta) {
    body.meta = options.meta;
  }
  return NextResponse.json(body, {
    status: options?.status ?? 200,
    headers: options?.headers,
  });
}

export function created<T>(
  data: T,
  options?: { headers?: HeadersInit }
): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json(
    { data },
    { status: 201, headers: options?.headers }
  );
}

export function fail(
  code: ErrorCode,
  message: string,
  status?: number,
  fields?: Record<string, string>
): NextResponse<ApiErrorBody> {
  const resolvedStatus = status ?? defaultStatusForCode(code);
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
    },
  };
  return NextResponse.json(body, { status: resolvedStatus });
}

export function toErrorResponse(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const path = issue.path.join(".");
      if (path) {
        fields[path] = issue.message;
      }
    }
    return fail("VALIDATION_ERROR", "Validation failed", 400, fields);
  }

  if (err instanceof ApiError) {
    return fail(err.code, err.message, err.status, err.fields);
  }

  console.error("Unhandled internal server error:", err);
  return fail("INTERNAL_ERROR", "An unexpected error occurred", 500);
}
