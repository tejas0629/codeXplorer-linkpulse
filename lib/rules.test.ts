import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { evaluateLink, type RuleLinkInput } from "./rules";

describe("lib/rules.ts (CHI-P1-3)", () => {
  const baseNow = new Date("2026-10-19T12:00:00.000Z");
  const hashedSecret = bcrypt.hashSync("supersecret", 10);

  function createActiveLink(overrides: Partial<RuleLinkInput> = {}): RuleLinkInput {
    return {
      destinationUrl: "https://example.com/target",
      status: "ACTIVE",
      clickCount: 10,
      maxClicks: 1000,
      expiresAt: new Date("2026-12-31T23:59:59.000Z"),
      hasPassword: false,
      passwordHash: null,
      deletedAt: null,
      ...overrides,
    };
  }

  describe("independent evaluations", () => {
    it("returns NOT_FOUND when link is null or undefined", async () => {
      const resNull = await evaluateLink(null, { now: baseNow });
      expect(resNull.outcome).toBe("NOT_FOUND");

      const resUndef = await evaluateLink(undefined, { now: baseNow });
      expect(resUndef.outcome).toBe("NOT_FOUND");
    });

    it("returns NOT_FOUND when deletedAt is set (soft-deleted)", async () => {
      const link = createActiveLink({
        deletedAt: new Date("2026-10-18T12:00:00.000Z"),
      });
      const res = await evaluateLink(link, { now: baseNow });
      expect(res.outcome).toBe("NOT_FOUND");
    });

    it("returns DISABLED with reason when status is DISABLED", async () => {
      const link = createActiveLink({ status: "DISABLED" });
      const res = await evaluateLink(link, { now: baseNow });
      expect(res.outcome).toBe("DISABLED");
      if (res.outcome === "DISABLED") {
        expect(res.reason).toContain("owner");
      }
    });

    it("returns DISABLED with special admin message when status is ADMIN_DISABLED", async () => {
      const link = createActiveLink({ status: "ADMIN_DISABLED" });
      const res = await evaluateLink(link, { now: baseNow });
      expect(res.outcome).toBe("DISABLED");
      if (res.outcome === "DISABLED") {
        expect(res.reason).toContain("administrator");
      }
    });

    it("returns EXPIRED when now >= expiresAt", async () => {
      const link = createActiveLink({
        expiresAt: new Date("2026-10-10T00:00:00.000Z"),
      });
      const res = await evaluateLink(link, { now: baseNow });
      expect(res.outcome).toBe("EXPIRED");
      if (res.outcome === "EXPIRED") {
        expect(res.expiresAt).toBeInstanceOf(Date);
      }
    });

    it("returns LIMIT_REACHED when clickCount exceeds limit", async () => {
      const link = createActiveLink({ clickCount: 550, maxClicks: 500 });
      const res = await evaluateLink(link, { now: baseNow });
      expect(res.outcome).toBe("LIMIT_REACHED");
      if (res.outcome === "LIMIT_REACHED") {
        expect(res.clickCount).toBe(550);
        expect(res.maxClicks).toBe(500);
      }
    });

    it("returns PASSWORD_REQUIRED when password protected and no password provided", async () => {
      const link = createActiveLink({
        hasPassword: true,
        passwordHash: hashedSecret,
      });
      const res = await evaluateLink(link, { now: baseNow });
      expect(res.outcome).toBe("PASSWORD_REQUIRED");
    });

    it("returns PASSWORD_REQUIRED with invalidPassword true when incorrect password is provided", async () => {
      const link = createActiveLink({
        hasPassword: true,
        passwordHash: hashedSecret,
      });
      const res = await evaluateLink(link, {
        now: baseNow,
        passwordProvided: "wrongpassword",
      });
      expect(res.outcome).toBe("PASSWORD_REQUIRED");
      if (res.outcome === "PASSWORD_REQUIRED") {
        expect(res.invalidPassword).toBe(true);
        expect(res.message).toContain("incorrect");
      }
    });

    it("returns OK with destinationUrl when all rules pass", async () => {
      const link = createActiveLink({ destinationUrl: "https://success.org" });
      const res = await evaluateLink(link, { now: baseNow });
      expect(res.outcome).toBe("OK");
      if (res.outcome === "OK") {
        expect(res.destinationUrl).toBe("https://success.org");
      }
    });
  });

  describe("ordering conflicts (first failure wins)", () => {
    it("deleted AND disabled -> returns NOT_FOUND (rule 1 beats rule 2)", async () => {
      const link = createActiveLink({
        deletedAt: new Date("2026-10-18T12:00:00.000Z"),
        status: "DISABLED",
      });
      const res = await evaluateLink(link, { now: baseNow });
      expect(res.outcome).toBe("NOT_FOUND");
    });

    it("disabled AND expired -> returns DISABLED (rule 2 beats rule 3)", async () => {
      const link = createActiveLink({
        status: "DISABLED",
        expiresAt: new Date("2026-10-01T00:00:00.000Z"),
      });
      const res = await evaluateLink(link, { now: baseNow });
      expect(res.outcome).toBe("DISABLED");
    });

    it("expired AND limit reached -> returns EXPIRED (rule 3 beats rule 4)", async () => {
      const link = createActiveLink({
        expiresAt: new Date("2026-10-01T00:00:00.000Z"),
        clickCount: 1500,
        maxClicks: 1000,
      });
      const res = await evaluateLink(link, { now: baseNow });
      expect(res.outcome).toBe("EXPIRED");
    });

    it("limit reached AND password required -> returns LIMIT_REACHED (rule 4 beats rule 5)", async () => {
      const link = createActiveLink({
        clickCount: 1000,
        maxClicks: 1000,
        hasPassword: true,
        passwordHash: hashedSecret,
      });
      const res = await evaluateLink(link, { now: baseNow });
      expect(res.outcome).toBe("LIMIT_REACHED");
    });
  });

  describe("exact boundary conditions", () => {
    it("returns EXPIRED when now is exactly equal to expiresAt", async () => {
      const exactExpiry = new Date("2026-10-19T12:00:00.000Z");
      const link = createActiveLink({ expiresAt: exactExpiry });
      const res = await evaluateLink(link, { now: exactExpiry });
      expect(res.outcome).toBe("EXPIRED");
    });

    it("returns OK when now is 1 millisecond before expiresAt", async () => {
      const futureExpiry = new Date("2026-10-19T12:00:00.001Z");
      const link = createActiveLink({ expiresAt: futureExpiry });
      const res = await evaluateLink(link, { now: new Date("2026-10-19T12:00:00.000Z") });
      expect(res.outcome).toBe("OK");
    });

    it("returns LIMIT_REACHED when clickCount is exactly equal to maxClicks", async () => {
      const link = createActiveLink({ clickCount: 100, maxClicks: 100 });
      const res = await evaluateLink(link, { now: baseNow });
      expect(res.outcome).toBe("LIMIT_REACHED");
    });

    it("returns OK when clickCount is one below maxClicks (99 of 100)", async () => {
      const link = createActiveLink({ clickCount: 99, maxClicks: 100 });
      const res = await evaluateLink(link, { now: baseNow });
      expect(res.outcome).toBe("OK");
    });
  });

  describe("password verified paths", () => {
    it("returns OK when isPasswordVerified is true in context", async () => {
      const link = createActiveLink({
        hasPassword: true,
        passwordHash: hashedSecret,
      });
      const res = await evaluateLink(link, {
        now: baseNow,
        isPasswordVerified: true,
      });
      expect(res.outcome).toBe("OK");
    });

    it("returns OK when correct passwordProvided matches passwordHash", async () => {
      const link = createActiveLink({
        hasPassword: true,
        passwordHash: hashedSecret,
      });
      const res = await evaluateLink(link, {
        now: baseNow,
        passwordProvided: "supersecret",
      });
      expect(res.outcome).toBe("OK");
    });
  });
});
