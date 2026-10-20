import assert from "node:assert/strict";
import test from "node:test";
import { checkRedirectRules, type LinkSnapshot } from "./rules";
import { traceRedirectRules } from "./trace";

test("trace verdict matches rule evaluator for every input combination", () => {
  const now = new Date("2026-10-20T12:00:00.000Z");
  const statuses = ["ACTIVE", "DISABLED", "ADMIN_DISABLED"] as const;

  for (const exists of [false, true]) {
    for (const deleted of [false, true]) {
      for (const status of statuses) {
        for (const expired of [false, true]) {
          for (const limitReached of [false, true]) {
            for (const passwordSet of [false, true]) {
              for (const passwordUnlocked of [false, true]) {
                const link: LinkSnapshot | null = exists
                  ? {
                      deletedAt: deleted ? new Date(now.getTime() - 1) : null,
                      status,
                      expiresAt: expired ? new Date(now.getTime() - 1) : null,
                      maxClicks: limitReached ? 1 : null,
                      clickCount: limitReached ? 1 : 0,
                      passwordHash: passwordSet ? "stored-hash" : null,
                    }
                  : null;
                const trace = traceRedirectRules(link, now, passwordUnlocked);
                const decision = checkRedirectRules(link, { now, passwordUnlocked });

                assert.equal(trace.outcome, decision.kind);
                assert.equal(trace.steps.length, 6);
              }
            }
          }
        }
      }
    }
  }
});