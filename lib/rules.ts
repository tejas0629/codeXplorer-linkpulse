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
}

export interface RuleContext {
  now: Date;
  passwordProvided?: string;
}

export type RuleOutcome =
  | "OK"
  | "DISABLED"
  | "EXPIRED"
  | "LIMIT_REACHED"
  | "PASSWORD_REQUIRED"
  | "PASSWORD_INVALID";

export type RuleResult =
  | { outcome: "OK"; destinationUrl?: string }
  | { outcome: "DISABLED"; reason: string }
  | { outcome: "EXPIRED"; expiresAt: Date }
  | { outcome: "LIMIT_REACHED"; clickCount: number; maxClicks: number }
  | { outcome: "PASSWORD_REQUIRED" }
  | { outcome: "PASSWORD_INVALID"; message: string };

// TODO (CHI-P1-3): Implement link evaluation logic following the fixed order:
// 1. Status is ACTIVE
// 2. Not expired (expiresAt > now)
// 3. Under click limit (clickCount < maxClicks)
// 4. Password validation via bcrypt
export async function evaluateLink(
  link: RuleLinkInput,
  ctx: RuleContext
): Promise<RuleResult> {
  void link;
  void ctx;
  throw new Error("NOT_IMPLEMENTED: CHI-P1-3");
}
