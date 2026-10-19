import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { urlSchema, aliasSchema, createLinkSchema, updateLinkSchema, listLinksQuerySchema, checkLinkQuerySchema, parseBody, parseQuery, validateUrl, assertDomainNotBlocked, } from "./validation";
import { ApiError } from "@/lib/api-response";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    blockedDomain: {
      findFirst: vi.fn(),
    },
  },
}));

describe("lib/validation.ts", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://linkpulse.dev";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  describe("urlSchema & validateUrl", () => {
    it("accepts valid http and https URLs", () => {
      expect(urlSchema.safeParse("https://google.com").success).toBe(true);
      expect(urlSchema.safeParse("http://my-subdomain.example.org:8080/path?q=1").success).toBe(true);
      expect(validateUrl("https://example.com")).toBe(true);
      expect(validateUrl("http://example.com")).toBe(true);
    });

    it("rejects non-http/https protocols such as javascript:, ftp:, data:, file:", () => {
      const badProtocols = [
        "javascript:alert('xss')",
        "ftp://ftp.example.com/files",
        "data:text/html,<html>Hello</html>",
        "file:///etc/passwd",
      ];

      for (const bad of badProtocols) {
        const res = urlSchema.safeParse(bad);
        expect(res.success).toBe(false);
        expect(validateUrl(bad)).toBe(false);
      }
    });

    it("rejects URLs without schemes", () => {
      expect(urlSchema.safeParse("google.com").success).toBe(false);
      expect(validateUrl("google.com")).toBe(false);
    });

    it("rejects URLs containing embedded credentials (user:pass@)", () => {
      const withCreds = "https://user:secret@example.com/api";
      const res = urlSchema.safeParse(withCreds);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("embedded credentials");
      }
    });

    it("rejects URLs exceeding 2048 characters (boundary: 2049 chars)", () => {
      const longUrl = "https://example.com/" + "a".repeat(2029);
      expect(longUrl.length).toBe(2049);
      const res = urlSchema.safeParse(longUrl);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("cannot exceed 2048 characters");
      }
    });

    it("rejects URLs targeting our own application domain", () => {
      const selfUrl = "https://linkpulse.dev/dashboard";
      const res = urlSchema.safeParse(selfUrl);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("our own application domain");
      }
    });
  });

  describe("createLinkSchema", () => {
    it("accepts valid link creation input", () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const valid = {
        destinationUrl: "https://partner.org/deal",
        code: "promo-2026",
        clickLimit: 500,
        password: "secretpassword",
        expiresAt: future,
        tagNames: ["deal", "promo"],
      };

      const res = createLinkSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("rejects past expiresAt dates", () => {
      const past = new Date(Date.now() - 3600000).toISOString();
      const res = createLinkSchema.safeParse({
        destinationUrl: "https://example.com",
        expiresAt: past,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("in the future");
      }
    });

    it("rejects non-positive, zero, and float clickLimit values", () => {
      expect(
        createLinkSchema.safeParse({
          destinationUrl: "https://example.com",
          clickLimit: 0,
        }).success
      ).toBe(false);

      expect(
        createLinkSchema.safeParse({
          destinationUrl: "https://example.com",
          clickLimit: -10,
        }).success
      ).toBe(false);

      expect(
        createLinkSchema.safeParse({
          destinationUrl: "https://example.com",
          clickLimit: 12.5,
        }).success
      ).toBe(false);
    });

    it("validates password length boundaries (min 4, max 72)", () => {
      expect(
        createLinkSchema.safeParse({
          destinationUrl: "https://example.com",
          password: "123", // 3 chars
        }).success
      ).toBe(false);

      expect(
        createLinkSchema.safeParse({
          destinationUrl: "https://example.com",
          password: "1234", // 4 chars
        }).success
      ).toBe(true);

      const max72 = "a".repeat(72);
      expect(
        createLinkSchema.safeParse({
          destinationUrl: "https://example.com",
          password: max72,
        }).success
      ).toBe(true);

      const tooLong73 = "a".repeat(73);
      expect(
        createLinkSchema.safeParse({
          destinationUrl: "https://example.com",
          password: tooLong73,
        }).success
      ).toBe(false);
    });
  });

  describe("updateLinkSchema", () => {
    it("accepts valid partial updates", () => {
      const res = updateLinkSchema.safeParse({
        destinationUrl: "https://new-destination.org",
        status: "DISABLED",
      });
      expect(res.success).toBe(true);
    });

    it("rejects an empty update body", () => {
      const res = updateLinkSchema.safeParse({});
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("cannot be empty");
      }
    });

    it("rejects status ADMIN_DISABLED from regular link update", () => {
      const res = updateLinkSchema.safeParse({
        status: "ADMIN_DISABLED",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toMatch(/ACTIVE.*DISABLED/);
      }
    });
  });

  describe("listLinksQuerySchema pagination & coerce", () => {
    it("applies default page 1 and pageSize 20 when omitted", () => {
      const res = listLinksQuerySchema.parse({});
      expect(res.page).toBe(1);
      expect(res.pageSize).toBe(20);
    });

    it("coerces string numbers for page and pageSize", () => {
      const res = listLinksQuerySchema.parse({
        page: "3",
        pageSize: "50",
      });
      expect(res.page).toBe(3);
      expect(res.pageSize).toBe(50);
    });

    it("enforces maximum pageSize of 100", () => {
      const res = listLinksQuerySchema.safeParse({
        pageSize: 101,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("cannot exceed 100");
      }
    });
  });

  describe("aliasSchema & checkLinkQuerySchema", () => {
    it("validates alias via aliasSchema", () => {
      expect(aliasSchema.safeParse("custom-slug").success).toBe(true);
      expect(aliasSchema.safeParse("ab").success).toBe(false);
      expect(aliasSchema.safeParse("api").success).toBe(false);
    });

    it("parses checkLinkQuerySchema query parameters", () => {
      const parsed = checkLinkQuerySchema.parse({
        alias: "my-alias",
        url: "https://example.com/target",
      });
      expect(parsed.alias).toBe("my-alias");
      expect(parsed.url).toBe("https://example.com/target");
    });
  });

  describe("parseBody and parseQuery with field-level errors", () => {
    it("throws ApiError VALIDATION_ERROR with structured fields map", () => {
      try {
        parseBody(createLinkSchema, {
          destinationUrl: "not-a-url",
          password: "abc",
        });
        expect.fail("Should have thrown ApiError");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.code).toBe("VALIDATION_ERROR");
        expect(apiErr.status).toBe(400);
        expect(apiErr.fields).toBeDefined();
        expect(apiErr.fields?.destinationUrl).toBeDefined();
        expect(apiErr.fields?.password).toBeDefined();
      }
    });

    it("parseQuery parses URLSearchParams correctly", () => {
      const params = new URLSearchParams("page=2&pageSize=15&status=ACTIVE");
      const parsed = parseQuery(listLinksQuerySchema, params);
      expect(parsed.page).toBe(2);
      expect(parsed.pageSize).toBe(15);
      expect(parsed.status).toBe("ACTIVE");
    });
  });

  describe("assertDomainNotBlocked", () => {
    it("resolves without throwing when domain is not in blocked list", async () => {
      vi.mocked(db.blockedDomain.findFirst).mockResolvedValue(null);

      await expect(
        assertDomainNotBlocked("https://safe-domain.com/path")
      ).resolves.toBeUndefined();

      expect(db.blockedDomain.findFirst).toHaveBeenCalledWith({
        where: {
          domain: {
            in: ["safe-domain.com"],
            mode: "insensitive",
          },
        },
        select: { domain: true },
      });
    });

    it("throws ApiError BLOCKED_DOMAIN when exact hostname is blocked", async () => {
      vi.mocked(db.blockedDomain.findFirst).mockResolvedValue({
        id: "block-1",
        domain: "phishing.com",
        addedById: "admin-1",
        createdAt: new Date(),
      });

      await expect(
        assertDomainNotBlocked("https://phishing.com/steal-login")
      ).rejects.toThrowError(ApiError);

      try {
        await assertDomainNotBlocked("https://phishing.com/steal-login");
      } catch (err) {
        const apiErr = err as ApiError;
        expect(apiErr.code).toBe("BLOCKED_DOMAIN");
        expect(apiErr.status).toBe(400);
      }
    });

    it("throws ApiError BLOCKED_DOMAIN when a parent domain is blocked (sub.evil.com -> evil.com)", async () => {
      vi.mocked(db.blockedDomain.findFirst).mockResolvedValue({
        id: "block-2",
        domain: "evil.com",
        addedById: "admin-1",
        createdAt: new Date(),
      });

      await expect(
        assertDomainNotBlocked("https://login.sub.evil.com/page")
      ).rejects.toThrowError(ApiError);

      expect(db.blockedDomain.findFirst).toHaveBeenCalledWith({
        where: {
          domain: {
            in: ["login.sub.evil.com", "sub.evil.com", "evil.com"],
            mode: "insensitive",
          },
        },
        select: { domain: true },
      });
    });

    it("throws ApiError INVALID_URL when given an unparseable URL string", async () => {
      await expect(assertDomainNotBlocked("not-a-valid-url")).rejects.toThrowError(ApiError);
    });
  });
});
