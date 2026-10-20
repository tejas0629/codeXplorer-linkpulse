// Owner: Chirag | Task: CHI-P1-1 | Priority: P1
import "server-only";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { ApiError, type ErrorCode } from "@/lib/api-response";

// Case-sensitivity policy:
// Aliases are compared case-insensitively during availability checks and lookup
// (e.g. 'MyLink' and 'mylink' are treated as the same identifier to prevent spoofing
// and look-alike collisions), but stored as typed so user casing preferences are preserved.

export const ALIAS_RULES = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 30,
  ALLOWED_CHARS_REGEX: /^[A-Za-z0-9_-]+$/,
} as const;

export const RESERVED_WORDS = [
  "api",
  "login",
  "register",
  "dashboard",
  "links",
  "campaigns",
  "import",
  "trace",
  "admin",
  "status",
  "unlock",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "static",
  "public",
] as const;

export const RESERVED_WORDS_SET = new Set<string>(
  RESERVED_WORDS.map((word) => word.toLowerCase())
);

// 32 characters: lowercase only, excluding look-alike characters (0, 1, l, o)
export const SHORTCODE_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";

/**
 * Normalizes a code by trimming surrounding whitespace and converting to lowercase.
 */
export function normalizeCode(code: string): string {
  return code.trim().toLowerCase();
}

export type AliasValidationCode =
  | "TOO_SHORT"
  | "TOO_LONG"
  | "INVALID_CHARS"
  | "RESERVED";

export type AliasValidationResult =
  | { ok: true }
  | { ok: false; code: AliasValidationCode; message: string };

export function validateAlias(alias: string): AliasValidationResult {
  if (RESERVED_WORDS_SET.has(alias.toLowerCase())) {
    return {
      ok: false,
      code: "RESERVED",
      message: `The alias '${alias}' is a reserved system path and cannot be used`,
    };
  }

  if (alias.length < ALIAS_RULES.MIN_LENGTH) {
    return {
      ok: false,
      code: "TOO_SHORT",
      message: `Alias must be at least ${ALIAS_RULES.MIN_LENGTH} characters long`,
    };
  }

  if (alias.length > ALIAS_RULES.MAX_LENGTH) {
    return {
      ok: false,
      code: "TOO_LONG",
      message: `Alias cannot exceed ${ALIAS_RULES.MAX_LENGTH} characters`,
    };
  }

  if (!ALIAS_RULES.ALLOWED_CHARS_REGEX.test(alias)) {
    return {
      ok: false,
      code: "INVALID_CHARS",
      message: "Alias can use only letters, numbers, hyphen and underscore",
    };
  }

  return { ok: true };
}

export function isValidAlias(alias: string): { valid: boolean; error?: string } {
  const result = validateAlias(alias);
  return result.ok ? { valid: true } : { valid: false, error: result.message };
}

export function generateShortCode(length: number = 7): string {
  const nanoid = customAlphabet(SHORTCODE_ALPHABET, length);
  return nanoid();
}

export async function createUniqueCode(
  isTaken: (code: string) => Promise<boolean>,
  maxAttempts: number = 5
): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const code = generateShortCode();
    const taken = await isTaken(code);
    if (!taken) {
      return code;
    }
  }

  throw new ApiError(
    "CODE_GENERATION_FAILED" as ErrorCode,
    `Failed to generate a unique short code after ${maxAttempts} attempts`,
    500
  );
}

export async function isAliasAvailable(alias: string): Promise<boolean> {
  const validation = validateAlias(alias);
  if (!validation.ok) {
    return false;
  }

  const normalized = normalizeCode(alias);

  const existing = await db.link.findFirst({
    where: {
      code: {
        equals: normalized,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  return existing === null;
}
