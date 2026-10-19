/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLink, listLinks, getLink, updateLink, softDeleteLink, checkLink } from "./links";
import { db } from "@/lib/db";
import type { SessionUser } from "@/types/api";

// Mock the database client
vi.mock("@/lib/db", () => ({
  db: {
    link: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tag: {
      upsert: vi.fn(),
    },
    linkTag: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    blockedDomain: {
      findFirst: vi.fn(),
    },
    campaign: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock rate limiting to always allow during service tests
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<any>("@/lib/rate-limit");
  return {
    ...actual,
    assertRateLimit: vi.fn().mockResolvedValue({ success: true }),
  };
});

describe("Link Service Layer (lib/links.ts)", () => {
  const mockUser: SessionUser = {
    id: "user-123",
    email: "user@example.com",
    role: "USER",
  };

  const mockAdmin: SessionUser = {
    id: "admin-999",
    email: "admin@example.com",
    role: "ADMIN",
  };

  const otherUser: SessionUser = {
    id: "user-456",
    email: "other@example.com",
    role: "USER",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createLink", () => {
    it("creates a link successfully, hashes password, connects tags, and never returns passwordHash", async () => {
      vi.mocked(db.blockedDomain.findFirst).mockResolvedValue(null);
      vi.mocked(db.link.findFirst).mockResolvedValue(null); // alias check returns null (available)
      vi.mocked(db.tag.upsert).mockResolvedValue({ id: "tag-1" } as any);

      const fakeCreatedLink = {
        id: "link-abc",
        code: "my-promo",
        destinationUrl: "https://example.com/target",
        ownerId: mockUser.id,
        campaignId: null,
        status: "ACTIVE",
        expiresAt: null,
        maxClicks: 100,
        clickCount: 0,
        passwordHash: "$2a$10$hashedsecretvalue",
        mobileUrl: null,
        createdAt: new Date("2026-10-18T10:00:00Z"),
        updatedAt: new Date("2026-10-18T10:00:00Z"),
        tags: [{ tag: { name: "promo" } }],
      };

      vi.mocked(db.link.create).mockResolvedValue(fakeCreatedLink as any);

      const result = await createLink(mockUser, {
        destinationUrl: "https://example.com/target",
        code: "my-promo",
        password: "secretpassword",
        maxClicks: 100,
        tagNames: ["promo"],
      });

      expect(result.id).toBe("link-abc");
      expect(result.code).toBe("my-promo");
      expect(result.hasPassword).toBe(true);
      // passwordHash must NEVER be exposed in the return shape
      expect((result as any).passwordHash).toBeUndefined();
      expect(result.tags).toEqual(["promo"]);

      // Verify tag was upserted for owner
      expect(db.tag.upsert).toHaveBeenCalledWith({
        where: {
          ownerId_name: {
            ownerId: mockUser.id,
            name: "promo",
          },
        },
        create: {
          ownerId: mockUser.id,
          name: "promo",
        },
        update: {},
        select: { id: true },
      });
    });

    it("throws 409 ALIAS_TAKEN when custom alias already exists", async () => {
      vi.mocked(db.blockedDomain.findFirst).mockResolvedValue(null);
      // Alias check finds an existing link
      vi.mocked(db.link.findFirst).mockResolvedValue({ id: "existing-link" } as any);

      await expect(
        createLink(mockUser, {
          destinationUrl: "https://example.com/target",
          code: "taken-alias",
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          status: 409,
          code: "ALIAS_TAKEN",
        })
      );
    });

    it("handles Prisma P2002 race condition by mapping to 409 ALIAS_TAKEN", async () => {
      vi.mocked(db.blockedDomain.findFirst).mockResolvedValue(null);
      vi.mocked(db.link.findFirst).mockResolvedValue(null); // passed pre-check

      // Simulate concurrent insert race condition
      const p2002Error = new Error("Unique constraint failed");
      (p2002Error as any).code = "P2002";
      vi.mocked(db.link.create).mockRejectedValue(p2002Error);

      await expect(
        createLink(mockUser, {
          destinationUrl: "https://example.com/target",
          code: "race-alias",
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          status: 409,
          code: "ALIAS_TAKEN",
        })
      );
    });

    it("throws 400 BLOCKED_DOMAIN with field map when domain is on blocklist", async () => {
      vi.mocked(db.blockedDomain.findFirst).mockResolvedValue({
        id: "block-1",
        domain: "malicious.com",
      } as any);

      await expect(
        createLink(mockUser, {
          destinationUrl: "https://malicious.com/phishing",
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          status: 400,
          code: "BLOCKED_DOMAIN",
          fields: expect.objectContaining({
            destinationUrl: expect.stringContaining("blocked"),
          }),
        })
      );
    });

    it("throws 400 VALIDATION_ERROR with field map for invalid inputs", async () => {
      await expect(
        createLink(mockUser, {
          destinationUrl: "not-a-valid-url",
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          status: 400,
          code: "VALIDATION_ERROR",
          fields: expect.objectContaining({
            destinationUrl: "Destination URL must be a valid http or https address",
          }),
        })
      );
    });
  });

  describe("listLinks", () => {
    it("regular user queries only own links with deletedAt: null", async () => {
      vi.mocked(db.link.findMany).mockResolvedValue([]);
      vi.mocked(db.link.count).mockResolvedValue(0);

      const result = await listLinks(mockUser, { page: 1, pageSize: 10 });

      expect(db.link.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: mockUser.id,
            deletedAt: null,
          }),
          skip: 0,
          take: 10,
        })
      );
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      });
    });

    it("admin sees all links regardless of owner", async () => {
      vi.mocked(db.link.findMany).mockResolvedValue([]);
      vi.mocked(db.link.count).mockResolvedValue(0);

      await listLinks(mockAdmin, { page: 1, pageSize: 20 });

      const findManyCall = vi.mocked(db.link.findMany).mock.calls[0][0];
      expect(findManyCall?.where?.ownerId).toBeUndefined();
      expect(findManyCall?.where?.deletedAt).toBeNull();
    });

    it("builds search query on destinationUrl and code, case-insensitive", async () => {
      vi.mocked(db.link.findMany).mockResolvedValue([]);
      vi.mocked(db.link.count).mockResolvedValue(0);

      await listLinks(mockUser, { search: "promo" });

      const findManyCall = vi.mocked(db.link.findMany).mock.calls[0][0];
      expect(findManyCall?.where?.OR).toEqual([
        { destinationUrl: { contains: "promo", mode: "insensitive" } },
        { code: { contains: "promo", mode: "insensitive" } },
      ]);
    });

    it("filters by status and tag correctly", async () => {
      vi.mocked(db.link.findMany).mockResolvedValue([]);
      vi.mocked(db.link.count).mockResolvedValue(0);

      await listLinks(mockUser, { status: "ACTIVE", tag: "marketing" });

      const findManyCall = vi.mocked(db.link.findMany).mock.calls[0][0];
      expect(findManyCall?.where?.status).toBe("ACTIVE");
      expect(findManyCall?.where?.tags).toEqual({
        some: {
          tag: {
            name: {
              equals: "marketing",
              mode: "insensitive",
            },
          },
        },
      });
    });
  });

  describe("getLink", () => {
    it("returns 404 LINK_NOT_FOUND when non-owner requests a link to avoid leaking ID existence", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue({
        id: "link-private",
        ownerId: "other-user",
        deletedAt: null,
      } as any);

      await expect(getLink(mockUser, "link-private")).rejects.toThrowError(
        expect.objectContaining({
          status: 404,
          code: "LINK_NOT_FOUND",
        })
      );
    });

    it("returns 404 LINK_NOT_FOUND if link is soft-deleted", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue(null);

      await expect(getLink(mockUser, "link-deleted")).rejects.toThrowError(
        expect.objectContaining({
          status: 404,
          code: "LINK_NOT_FOUND",
        })
      );
    });

    it("admin can get any user link", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue({
        id: "link-user",
        code: "test-code",
        destinationUrl: "https://example.com",
        ownerId: otherUser.id,
        status: "ACTIVE",
        clickCount: 5,
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
      } as any);

      const link = await getLink(mockAdmin, "link-user");
      expect(link.id).toBe("link-user");
      expect(link.ownerId).toBe(otherUser.id);
    });
  });

  describe("updateLink", () => {
    it("owner cannot re-enable ADMIN_DISABLED link (returns 403 FORBIDDEN)", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue({
        id: "link-admin-disabled",
        ownerId: mockUser.id,
        status: "ADMIN_DISABLED",
        deletedAt: null,
      } as any);

      await expect(
        updateLink(mockUser, "link-admin-disabled", {
          status: "ACTIVE",
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          status: 403,
          code: "FORBIDDEN",
          message:
            "This link was disabled by an administrator and can only be re-enabled by an admin.",
        })
      );
    });

    it("re-validates destinationUrl against blocked domains on update", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue({
        id: "link-valid",
        ownerId: mockUser.id,
        status: "ACTIVE",
        deletedAt: null,
      } as any);

      vi.mocked(db.blockedDomain.findFirst).mockResolvedValue({
        id: "blocked-1",
        domain: "spam.org",
      } as any);

      await expect(
        updateLink(mockUser, "link-valid", {
          destinationUrl: "https://spam.org/bad-target",
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          status: 400,
          code: "BLOCKED_DOMAIN",
        })
      );
    });

    it("non-owner gets 404 on update to prevent ID enumeration", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue({
        id: "link-other",
        ownerId: "someone-else",
        deletedAt: null,
      } as any);

      await expect(
        updateLink(mockUser, "link-other", {
          destinationUrl: "https://example.com/new",
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          status: 404,
          code: "LINK_NOT_FOUND",
        })
      );
    });
  });

  describe("softDeleteLink", () => {
    it("sets deletedAt to current date and preserves the record", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue({
        id: "link-del",
        ownerId: mockUser.id,
        deletedAt: null,
      } as any);

      vi.mocked(db.link.update).mockResolvedValue({} as any);

      const result = await softDeleteLink(mockUser, "link-del");
      expect(result).toEqual({ id: "link-del", deleted: true });

      expect(db.link.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "link-del" },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        })
      );
    });

    it("non-owner gets 404 on delete", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue({
        id: "link-other-del",
        ownerId: "someone-else",
        deletedAt: null,
      } as any);

      await expect(
        softDeleteLink(mockUser, "link-other-del")
      ).rejects.toThrowError(
        expect.objectContaining({
          status: 404,
          code: "LINK_NOT_FOUND",
        })
      );
    });
  });

  describe("checkLink", () => {
    it("returns alias available and URL valid", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue(null);
      vi.mocked(db.blockedDomain.findFirst).mockResolvedValue(null);

      const check = await checkLink({
        alias: "new-brand",
        url: "https://example.com/homepage",
      });

      expect(check.aliasAvailable).toBe(true);
      expect(check.urlValid).toBe(true);
      expect(check.domainBlocked).toBe(false);
      expect(check.aliasError).toBeUndefined();
      expect(check.urlError).toBeUndefined();
    });

    it("returns domainBlocked true and urlError if domain is blocked", async () => {
      vi.mocked(db.blockedDomain.findFirst).mockResolvedValue({
        id: "b-1",
        domain: "phishing.com",
      } as any);

      const check = await checkLink({
        url: "https://phishing.com/account-verify",
      });

      expect(check.domainBlocked).toBe(true);
      expect(check.urlError).toContain("blocked");
    });

    it("throws 400 VALIDATION_ERROR with fields map if neither alias nor url is provided", async () => {
      await expect(checkLink({})).rejects.toThrowError(
        expect.objectContaining({
          status: 400,
          code: "VALIDATION_ERROR",
          fields: expect.objectContaining({
            query: expect.stringContaining("At least one"),
          }),
        })
      );
    });
  });
});
