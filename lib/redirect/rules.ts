export type LinkSnapshot = {
  deletedAt: Date | null;
  status: "ACTIVE" | "DISABLED" | "ADMIN_DISABLED";
  expiresAt: Date | null;
  maxClicks: number | null;
  clickCount: number;
  passwordHash: string | null;
};

export type RedirectDecision =
  | { kind: "NOT_FOUND" }
  | { kind: "DELETED" }
  | { kind: "DISABLED"; clickResult: "DISABLED" }
  | { kind: "EXPIRED"; clickResult: "EXPIRED" }
  | { kind: "LIMIT_REACHED"; clickResult: "LIMIT_REACHED" }
  | { kind: "PASSWORD_REQUIRED" }
  | { kind: "OK"; clickResult: "SUCCESS" };

export type RedirectRuleContext = {
  now: Date;
  passwordUnlocked: boolean;
};

export function checkRedirectRules(
  link: LinkSnapshot | null,
  context: RedirectRuleContext,
): RedirectDecision {
  if (link === null) {
    return { kind: "NOT_FOUND" };
  }

  if (link.deletedAt !== null) {
    return { kind: "DELETED" };
  }

  if (link.status === "DISABLED" || link.status === "ADMIN_DISABLED") {
    return { kind: "DISABLED", clickResult: "DISABLED" };
  }

  if (link.expiresAt !== null && link.expiresAt.getTime() < context.now.getTime()) {
    return { kind: "EXPIRED", clickResult: "EXPIRED" };
  }

  if (link.maxClicks !== null && link.clickCount >= link.maxClicks) {
    return { kind: "LIMIT_REACHED", clickResult: "LIMIT_REACHED" };
  }

  if (link.passwordHash !== null && !context.passwordUnlocked) {
    return { kind: "PASSWORD_REQUIRED" };
  }

  return { kind: "OK", clickResult: "SUCCESS" };
}