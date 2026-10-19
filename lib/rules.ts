// Owner: Chirag | Task: CHI-P1-3 | Priority: P1
import "server-only";
import type { LinkStatus } from "@prisma/client";

export interface RuleLinkInput {
  status: LinkStatus;
  expiresAt?: Date | string | null;
  maxClicks?: number | null;
  clickCount: number;
  hasPassword?: boolean;
  passwordHash?: string | null;
  deletedAt?: Date | null;
}

export interface RuleContext {
  now: Date;
  passwordProvided?: string;
}

export type RuleOutcome =
  | "OK"
  | "NOT_FOUND"
  | "DISABLED"
  | "EXPIRED"
  | "LIMIT_REACHED"
  | "PASSWORD_REQUIRED"
  | "PASSWORD_INVALID";

export type RuleResult =
  | { outcome: "OK"; destinationUrl?: string }
  | { outcome: "NOT_FOUND"; reason?: string }
  | { outcome: "DISABLED"; reason: string }
  | { outcome: "EXPIRED"; expiresAt: Date }
  | { outcome: "LIMIT_REACHED"; clickCount: number; maxClicks: number }
  | { outcome: "PASSWORD_REQUIRED" }
  | { outcome: "PASSWORD_INVALID"; message: string };

// TODO (CHI-P1-3): Implement link evaluation logic following the fixed order:
// 1. deletedAt set returns NOT_FOUND
// 2. DISABLED and ADMIN_DISABLED both return DISABLED
// 3. Not expired (expiresAt > now), otherwise returns EXPIRED
// 4. Under click limit (clickCount < maxClicks), otherwise returns LIMIT_REACHED
// 5. Password check: if password required, returns PASSWORD_REQUIRED or PASSWORD_INVALID
export async function evaluateLink(
  link: RuleLinkInput,
  ctx: RuleContext
): Promise<RuleResult> {
  void link;
  void ctx;
  throw new Error("NOT_IMPLEMENTED: CHI-P1-3");
}
