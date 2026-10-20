import { checkRedirectRules, type LinkSnapshot, type RedirectDecision } from "./rules";

export type TraceStep = {
  rule:
    | "EXISTS"
    | "NOT_DELETED"
    | "NOT_DISABLED"
    | "NOT_EXPIRED"
    | "CLICK_CAP"
    | "PASSWORD_CHECK";
  passed: boolean;
  detail: string;
};

export type RedirectTrace = {
  steps: TraceStep[];
  outcome: RedirectDecision["kind"];
};

export function traceRedirectRules(
  link: LinkSnapshot | null,
  now: Date,
  passwordUnlocked: boolean,
): RedirectTrace {
  const steps: TraceStep[] = [
    {
      rule: "EXISTS",
      passed: link !== null,
      detail: link ? "Link found" : "Link not found",
    },
    {
      rule: "NOT_DELETED",
      passed: link !== null && link.deletedAt === null,
      detail: link ? (link.deletedAt === null ? "Link is not deleted" : "Link is deleted") : "Link unavailable",
    },
    {
      rule: "NOT_DISABLED",
      passed: link !== null && link.status === "ACTIVE",
      detail: link ? `Status is ${link.status}` : "Link unavailable",
    },
    {
      rule: "NOT_EXPIRED",
      passed: link !== null && (link.expiresAt === null || link.expiresAt.getTime() >= now.getTime()),
      detail: link
        ? link.expiresAt === null
          ? "Link has no expiry"
          : link.expiresAt.getTime() < now.getTime()
            ? "Link has expired"
            : "Link has not expired"
        : "Link unavailable",
    },
    {
      rule: "CLICK_CAP",
      passed: link !== null && (link.maxClicks === null || link.clickCount < link.maxClicks),
      detail: link
        ? link.maxClicks === null
          ? "No click limit is configured"
          : `Clicks: ${link.clickCount}/${link.maxClicks}`
        : "Link unavailable",
    },
    {
      rule: "PASSWORD_CHECK",
      passed: link !== null && (link.passwordHash === null || passwordUnlocked),
      detail: link
        ? link.passwordHash === null
          ? "Password protection is not enabled"
          : passwordUnlocked
            ? "Password accepted"
            : "Password required"
        : "Link unavailable",
    },
  ];

  return {
    steps,
    outcome: checkRedirectRules(link, { now, passwordUnlocked }).kind,
  };
}