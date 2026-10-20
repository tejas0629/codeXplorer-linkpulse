// Owner: Chirag | Task: CHI-P1-2 | Priority: P1
import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-response";
import { validateAlias } from "@/lib/shortcode";

function getAppHostname(): string | null {
  try {
    const raw = process.env.NEXT_PUBLIC_APP_URL;
    if (!raw) {
      return null;
    }
    const parsed = new URL(raw);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export const urlSchema = z
  .string({ message: "Destination URL is required" })
  .trim()
  .min(1, "Destination URL is required")
  .max(2048, "Destination URL cannot exceed 2048 characters")
  .superRefine((val, ctx) => {
    let parsed: URL;
    try {
      parsed = new URL(val);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Destination URL must be a valid http or https address",
      });
      return;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Destination URL must be a valid http or https address",
      });
      return;
    }

    if (parsed.username || parsed.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "URLs with embedded credentials are not allowed",
      });
      return;
    }

    const appHost = getAppHostname();
    if (appHost && parsed.hostname.toLowerCase() === appHost) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Shortening links to our own application domain is not allowed",
      });
    }
  });

export const aliasSchema = z
  .string()
  .trim()
  .superRefine((val, ctx) => {
    const result = validateAlias(val);
    if (!result.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.message,
      });
    }
  });

const futureDateSchema = z
  .string()
  .datetime({ message: "Must be a valid ISO datetime string" })
  .superRefine((val, ctx) => {
    const time = new Date(val).getTime();
    if (isNaN(time)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid expiration date",
      });
      return;
    }
    if (time <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expiration date must be in the future",
      });
    }
  });

const positiveClickLimitSchema = z
  .number()
  .int("Click limit must be an integer")
  .positive("Click limit must be greater than zero")
  .max(1000000, "Click limit cannot exceed 1,000,000");

const passwordSchema = z
  .string()
  .min(4, "Password must be at least 4 characters")
  .max(72, "Password cannot exceed 72 characters");

export const createLinkSchema = z.object({
  destinationUrl: urlSchema,
  code: aliasSchema.optional(),
  alias: aliasSchema.optional(),
  title: z.string().trim().max(255, "Title cannot exceed 255 characters").optional(),
  campaignId: z.string().cuid("Invalid campaign ID format").nullable().optional(),
  tagNames: z.array(z.string().trim().min(1).max(30)).optional(),
  tagIds: z.array(z.string().cuid()).optional(),
  expiresAt: futureDateSchema.nullable().optional(),
  clickLimit: positiveClickLimitSchema.nullable().optional(),
  maxClicks: positiveClickLimitSchema.nullable().optional(),
  password: passwordSchema.nullable().optional(),
  mobileUrl: urlSchema.nullable().optional(),
  utmSource: z.string().trim().max(100).optional(),
  utmMedium: z.string().trim().max(100).optional(),
  utmCampaign: z.string().trim().max(100).optional(),
  utmTerm: z.string().trim().max(100).optional(),
  utmContent: z.string().trim().max(100).optional(),
});

export const updateLinkSchema = z
  .object({
    destinationUrl: urlSchema.optional(),
    title: z.string().trim().max(255).nullable().optional(),
    campaignId: z.string().cuid().nullable().optional(),
    status: z
      .enum(["ACTIVE", "DISABLED"], {
        message: "Status can only be updated to ACTIVE or DISABLED",
      })
      .optional(),
    expiresAt: futureDateSchema.nullable().optional(),
    clickLimit: positiveClickLimitSchema.nullable().optional(),
    maxClicks: positiveClickLimitSchema.nullable().optional(),
    password: passwordSchema.nullable().optional(),
    mobileUrl: urlSchema.nullable().optional(),
    tagNames: z.array(z.string().trim().min(1).max(30)).optional(),
    tagIds: z.array(z.string().cuid()).optional(),
    utmSource: z.string().trim().max(100).optional(),
    utmMedium: z.string().trim().max(100).optional(),
    utmCampaign: z.string().trim().max(100).optional(),
    utmTerm: z.string().trim().max(100).optional(),
    utmContent: z.string().trim().max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Update payload cannot be empty",
  });

export const listLinksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(100, "Page size cannot exceed 100")
    .default(20),
  search: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "DISABLED", "ADMIN_DISABLED"]).optional(),
  campaignId: z.string().trim().optional(),
  tag: z.string().trim().optional(),
});

export const checkLinkQuerySchema = z.object({
  alias: z.string().trim().optional(),
  url: z.string().trim().optional(),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type ListLinksQueryInput = z.infer<typeof listLinksQuerySchema>;
export type CheckLinkQueryInput = z.infer<typeof checkLinkQuerySchema>;

function extractFieldErrors(issues: z.ZodIssue[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const rawPath = issue.path.join(".") || "root";
    const path = rawPath === "code" ? "alias" : rawPath;
    if (!fields[path]) {
      fields[path] = issue.message;
    }
  }
  return fields;
}

export function parseBody<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields = extractFieldErrors(result.error.issues);
    throw new ApiError("VALIDATION_ERROR", "Validation failed", 400, fields);
  }
  return result.data;
}

export function parseQuery<T>(
  schema: z.ZodType<T>,
  searchParams: URLSearchParams | Record<string, unknown>
): T {
  const data =
    searchParams instanceof URLSearchParams
      ? Object.fromEntries(searchParams.entries())
      : searchParams;
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields = extractFieldErrors(result.error.issues);
    throw new ApiError("VALIDATION_ERROR", "Validation failed", 400, fields);
  }
  return result.data;
}

export function validateUrl(url: string): boolean {
  const result = urlSchema.safeParse(url);
  return result.success;
}

export function getDomainCandidates(hostname: string): string[] {
  const clean = hostname.toLowerCase().replace(/\.+$/, "");
  const parts = clean.split(".");
  const candidates: string[] = [];

  for (let i = 0; i < parts.length - 1; i++) {
    candidates.push(parts.slice(i).join("."));
  }

  if (candidates.length === 0 && clean.length > 0) {
    candidates.push(clean);
  }

  return candidates;
}

export async function assertDomainNotBlocked(url: string): Promise<void> {
  let hostname: string;
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;
  } catch {
    throw new ApiError("INVALID_URL", "Invalid destination URL", 400, {
      destinationUrl: "Destination URL must be a valid http or https address",
    });
  }

  const candidates = getDomainCandidates(hostname);
  if (candidates.length === 0) {
    return;
  }

  const blocked = await db.blockedDomain.findFirst({
    where: {
      domain: {
        in: candidates,
        mode: "insensitive",
      },
    },
    select: { domain: true },
  });

  if (blocked) {
    throw new ApiError(
      "BLOCKED_DOMAIN",
      `The domain '${blocked.domain}' is blocked by platform administrators`,
      400,
      { destinationUrl: `Destination domain '${blocked.domain}' is blocked` }
    );
  }
}
