// Owner: Chirag | Task: CHI-P1-3 | Priority: P1
import bcrypt from "bcryptjs";
import type { LinkStatus } from "@prisma/client";

export interface RuleLinkInput {
  destinationUrl?: string;
  status: LinkStatus;
  expiresAt?: Date | string | null;
  maxClicks?: number | null;
  clickCount: number;
  hasPassword?: boolean;
  passwordHash?: string | null;
  deletedAt?: Date | null;
}

export interface RuleContext {
  now?: Date;
  passwordProvided?: string;
  isPasswordVerified?: boolean;
}

export type RuleOutcome =
  | "OK"
  | "NOT_FOUND"
  | "DISABLED"
  | "EXPIRED"
  | "LIMIT_REACHED"
  | "PASSWORD_REQUIRED";

export type RuleResult =
  | { outcome: "OK"; destinationUrl?: string }
  | { outcome: "NOT_FOUND"; reason?: string }
  | { outcome: "DISABLED"; reason: string }
  | { outcome: "EXPIRED"; expiresAt: Date }
  | { outcome: "LIMIT_REACHED"; clickCount: number; maxClicks: number }
  | {
      outcome: "PASSWORD_REQUIRED";
      invalidPassword?: boolean;
      message?: string;
    };

/**
 * Evaluates access rules for a shortened link in a strict, deterministic order.
 * First failing rule determines the outcome:
 *
 * 1. Existence / Soft-delete check:
 *    If link is null, undefined, or has deletedAt set -> returns NOT_FOUND.
 * 2. Disabled status check:
 *    If status is DISABLED or ADMIN_DISABLED -> returns DISABLED with descriptive reason.
 * 3. Expiration check:
 *    If expiresAt is set and now >= expiresAt -> returns EXPIRED.
 * 4. Click limit cap check:
 *    If maxClicks is set and clickCount >= maxClicks -> returns LIMIT_REACHED.
 *    Note: The atomic click-count increment is executed by the redirect engine in the
 *    database via conditional SQL update; this pure function acts as the pre-check.
 * 5. Password protection check:
 *    If password is required (hasPassword is true or passwordHash is set) and
 *    isPasswordVerified is not true -> returns PASSWORD_REQUIRED (with invalidPassword flag if provided password fails).
 * 6. Success:
 *    All rules satisfied -> returns OK with destinationUrl.
 *
 * Pure function: Does not query databases, Redis, or read system clocks internally.
 * All temporal context is passed via `ctx.now`.
 */
export async function evaluateLink(
  link: RuleLinkInput | null | undefined,
  ctx: RuleContext = {}
): Promise<RuleResult> {
  const now = ctx.now ?? new Date();

  // 1. Existence and soft-delete check
  if (!link || link.deletedAt != null) {
    return {
      outcome: "NOT_FOUND",
      reason: "Link not found or has been soft-deleted",
    };
  }

  // 2. Disabled status check (DISABLED or ADMIN_DISABLED)
  if (link.status === "DISABLED" || link.status === "ADMIN_DISABLED") {
    return {
      outcome: "DISABLED",
      reason:
        link.status === "ADMIN_DISABLED"
          ? "This link was disabled by an administrator and can only be re-enabled by an admin."
          : "This link has been disabled by its owner.",
    };
  }

  // 3. Expiration check (now >= expiresAt)
  if (link.expiresAt != null) {
    const expiry =
      typeof link.expiresAt === "string"
        ? new Date(link.expiresAt)
        : link.expiresAt;

    if (now.getTime() >= expiry.getTime()) {
      return {
        outcome: "EXPIRED",
        expiresAt: expiry,
      };
    }
  }

  // 4. Click limit cap check (clickCount >= maxClicks)
  if (link.maxClicks != null && link.clickCount >= link.maxClicks) {
    return {
      outcome: "LIMIT_REACHED",
      clickCount: link.clickCount,
      maxClicks: link.maxClicks,
    };
  }

  // 5. Password protection check
  const requiresPassword = Boolean(link.hasPassword || link.passwordHash);
  if (requiresPassword) {
    if (ctx.isPasswordVerified) {
      // Verified in session or cookie context
    } else if (ctx.passwordProvided && link.passwordHash) {
      const isMatch = bcrypt.compareSync(
        ctx.passwordProvided,
        link.passwordHash
      );
      if (!isMatch) {
        return {
          outcome: "PASSWORD_REQUIRED",
          invalidPassword: true,
          message: "The password provided is incorrect",
        };
      }
    } else {
      return {
        outcome: "PASSWORD_REQUIRED",
      };
    }
  }

  // 6. Otherwise: Link is valid and accessible
  return {
    outcome: "OK",
    destinationUrl: link.destinationUrl,
  };
}
