// Owner: Chirag | Task: CHI-P2-6 | Priority: P2
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkLink,
  softDeleteLink,
  getLink,
  updateLink,
  listLinks,
} from "./links";
import { db } from "./db";
import { ApiError } from "./api-response";
import type { SessionUser } from "@/types/api";

vi.mock("@/lib/db", () => ({
  db: {
    link: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    campaign: {
      findFirst: vi.fn(),
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
  },
}));

describe("lib/links.ts extra branch coverage", () => {
  const user: SessionUser = {
    id: "user-1",
    email: "user@example.com",
    role: "USER",
  };

  const admin: SessionUser = {
    id: "admin-1",
    email: "admin@example.com",
    role: "ADMIN",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkLink", () => {
    it("throws error when neither alias nor url is provided", async () => {
      await expect(checkLink({}, "anon")).rejects.toThrow(ApiError);
    });

    it("evaluates invalid alias correctly", async () => {
      const res = await checkLink({ alias: "inv@lid!" }, "anon");
      expect(res.aliasAvailable).toBe(false);
      expect(res.aliasError).toBeDefined();
    });

    it("evaluates invalid url format correctly", async () => {
      const res = await checkLink({ url: "ftp://invalid-url" }, "anon");
      expect(res.urlValid).toBe(false);
      expect(res.urlError).toBeDefined();
    });

    it("detects blocked domain when asserting URL", async () => {
      vi.mocked(db.blockedDomain.findFirst).mockResolvedValue({
        id: "block-1",
        domain: "malicious.org",
        reason: "Malware",
        createdAt: new Date(),
      } as never);

      const res = await checkLink({ url: "https://malicious.org/bad" }, "anon");
      expect(res.domainBlocked).toBe(true);
      expect(res.urlError).toBeDefined();
    });

    it("evaluates clean URL and alias successfully", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue(null);
      vi.mocked(db.blockedDomain.findFirst).mockResolvedValue(null);

      const res = await checkLink(
        { alias: "clean-alias", url: "https://example.com" },
        "anon"
      );
      expect(res.aliasAvailable).toBe(true);
      expect(res.urlValid).toBe(true);
      expect(res.domainBlocked).toBe(false);
    });
  });

  describe("softDeleteLink", () => {
    it("throws 404 when link does not exist", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue(null);

      await expect(softDeleteLink(user, "missing-id")).rejects.toThrow(ApiError);
    });

    it("throws 404 when non-owner non-admin attempts to delete", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue({
        id: "link-other",
        ownerId: "someone-else",
      } as never);

      await expect(softDeleteLink(user, "link-other")).rejects.toThrow(ApiError);
    });

    it("soft deletes link when requested by owner", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue({
        id: "link-own",
        ownerId: user.id,
      } as never);
      vi.mocked(db.link.update).mockResolvedValue({} as never);

      const res = await softDeleteLink(user, "link-own");
      expect(res.deleted).toBe(true);
      expect(res.id).toBe("link-own");
    });

    it("allows admin to soft delete any link", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue({
        id: "link-someone",
        ownerId: "other-user",
      } as never);
      vi.mocked(db.link.update).mockResolvedValue({} as never);

      const res = await softDeleteLink(admin, "link-someone");
      expect(res.deleted).toBe(true);
    });
  });

  describe("getLink", () => {
    it("throws 404 when link does not exist", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue(null);

      await expect(getLink(user, "missing-link")).rejects.toThrow(ApiError);
    });

    it("throws 404 when non-owner non-admin accesses link", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue({
        id: "link-2",
        ownerId: "someone-else",
      } as never);

      await expect(getLink(user, "link-2")).rejects.toThrow(ApiError);
    });

    it("returns formatted detail for owner", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue({
        id: "link-owner",
        code: "mycode",
        destinationUrl: "https://example.com",
        ownerId: user.id,
        campaignId: null,
        status: "ACTIVE",
        expiresAt: null,
        maxClicks: null,
        clickCount: 10,
        passwordHash: null,
        mobileUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [{ tag: { name: "launch" } }],
      } as never);

      const res = await getLink(user, "link-owner");
      expect(res.id).toBe("link-owner");
      expect(res.tags).toContain("launch");
    });
  });

  describe("updateLink and listLinks branches", () => {
    it("throws 400 when updating with a non-existent campaign", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue({
        id: "link-1",
        ownerId: user.id,
        status: "ACTIVE",
      } as never);
      vi.mocked(db.blockedDomain.findFirst).mockResolvedValue(null);
      vi.mocked(db.campaign.findFirst).mockResolvedValue(null);

      await expect(
        updateLink(user, "link-1", { campaignId: "non-existent-camp" })
      ).rejects.toThrow(ApiError);
    });

    it("throws 403 when non-admin tries to re-enable ADMIN_DISABLED link", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue({
        id: "link-1",
        ownerId: user.id,
        status: "ADMIN_DISABLED",
      } as never);

      await expect(
        updateLink(user, "link-1", { status: "ACTIVE" })
      ).rejects.toThrow(ApiError);
    });

    it("throws 403 when owner tries to set status to ADMIN_DISABLED", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue({
        id: "link-1",
        ownerId: user.id,
        status: "ACTIVE",
      } as never);

      await expect(
        updateLink(user, "link-1", { status: "ADMIN_DISABLED" })
      ).rejects.toThrow(ApiError);
    });

    it("updates link successfully with password reset and tag updates", async () => {
      vi.mocked(db.link.findFirst).mockResolvedValue({
        id: "link-1",
        ownerId: user.id,
        status: "ACTIVE",
      } as never);
      vi.mocked(db.blockedDomain.findFirst).mockResolvedValue(null);
      vi.mocked(db.tag.upsert).mockResolvedValue({ id: "tag-1" } as never);
      vi.mocked(db.linkTag.deleteMany).mockResolvedValue({} as never);
      vi.mocked(db.linkTag.createMany).mockResolvedValue({} as never);
      vi.mocked(db.link.update).mockResolvedValue({
        id: "link-1",
        code: "c1",
        destinationUrl: "https://example.com/updated",
        ownerId: user.id,
        campaignId: null,
        status: "ACTIVE",
        expiresAt: null,
        maxClicks: null,
        clickCount: 0,
        passwordHash: null,
        mobileUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [{ tag: { name: "promo" } }],
      } as never);

      const res = await updateLink(user, "link-1", {
        destinationUrl: "https://example.com/updated",
        password: null,
        tagNames: ["promo"],
      });

      expect(res.destinationUrl).toBe("https://example.com/updated");
      expect(res.hasPassword).toBe(false);
      expect(res.tags).toContain("promo");
    });

    it("lists links with pagination, status and search filters", async () => {
      vi.mocked(db.link.findMany).mockResolvedValue([
        {
          id: "link-1",
          code: "c1",
          destinationUrl: "https://example.com/1",
          ownerId: user.id,
          campaignId: null,
          status: "ACTIVE",
          expiresAt: null,
          maxClicks: null,
          clickCount: 5,
          passwordHash: null,
          mobileUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: [],
        } as never,
      ]);
      vi.mocked(db.link.count).mockResolvedValue(1);

      const res = await listLinks(user, {
        page: "1",
        pageSize: "10",
        search: "example",
        status: "ACTIVE",
        campaignId: "camp-1",
        tag: "promo",
      });

      expect(res.links).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });
  });
});
