import assert from "node:assert/strict";
import test from "node:test";
import {
  checkRedirectRules,
  type LinkSnapshot,
  type RedirectRuleContext,
} from "./rules";

const now = new Date("2026-10-19T12:00:00.000Z");
const context: RedirectRuleContext = { now, passwordUnlocked: false };

function activeLink(overrides: Partial<LinkSnapshot> = {}): LinkSnapshot {
  return {
    deletedAt: null,
    status: "ACTIVE",
    expiresAt: null,
    maxClicks: null,
    clickCount: 0,
    passwordHash: null,
    ...overrides,
  };
}

test("returns NOT_FOUND when the link does not exist", () => {
  assert.deepEqual(checkRedirectRules(null, context), { kind: "NOT_FOUND" });
});

test("returns DELETED for a soft-deleted link", () => {
  assert.deepEqual(
    checkRedirectRules(activeLink({ deletedAt: now }), context),
    { kind: "DELETED" },
  );
});

test("returns DISABLED for an owner-disabled link", () => {
  assert.deepEqual(
    checkRedirectRules(activeLink({ status: "DISABLED" }), context),
    { kind: "DISABLED", clickResult: "DISABLED" },
  );
});

test("returns DISABLED for an admin-disabled link", () => {
  assert.deepEqual(
    checkRedirectRules(activeLink({ status: "ADMIN_DISABLED" }), context),
    { kind: "DISABLED", clickResult: "DISABLED" },
  );
});

test("returns EXPIRED when expiration is before now", () => {
  assert.deepEqual(
    checkRedirectRules(
      activeLink({ expiresAt: new Date("2026-10-19T11:59:59.999Z") }),
      context,
    ),
    { kind: "EXPIRED", clickResult: "EXPIRED" },
  );
});

test("returns LIMIT_REACHED when clickCount meets maxClicks", () => {
  assert.deepEqual(
    checkRedirectRules(activeLink({ maxClicks: 1, clickCount: 1 }), context),
    { kind: "LIMIT_REACHED", clickResult: "LIMIT_REACHED" },
  );
});

test("returns PASSWORD_REQUIRED when a protected link is locked", () => {
  assert.deepEqual(
    checkRedirectRules(activeLink({ passwordHash: "hash" }), context),
    { kind: "PASSWORD_REQUIRED" },
  );
});

test("returns OK when all rules pass", () => {
  assert.deepEqual(
    checkRedirectRules(
      activeLink({ passwordHash: "hash" }),
      { ...context, passwordUnlocked: true },
    ),
    { kind: "OK", clickResult: "SUCCESS" },
  );
});