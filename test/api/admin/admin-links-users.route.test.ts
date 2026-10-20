import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  invalidateCachedLink: vi.fn(),
  db: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    link: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/cache", () => ({ invalidateCachedLink: mocks.invalidateCachedLink }));

import { GET as listUsers } from "@/app/api/admin/users/route";
import { GET as listLinks } from "@/app/api/admin/links/route";
import { PATCH as disableLink } from "@/app/api/admin/links/[id]/disable/route";
import { PATCH as enableLink } from "@/app/api/admin/links/[id]/enable/route";

const user = { id: "user-1", name: "Alex", email: "alex@example.com", image: null, role: "USER" };
const admin = { id: "admin-1", name: "Admin", email: "admin@example.com", image: null, role: "ADMIN" };
const createdAt = new Date("2026-10-18T10:00:00.000Z");

function signInAs(who: typeof user | null) {
  if (!who) {
    mocks.auth.mockResolvedValue(null);
    return;
  }
  mocks.auth.mockResolvedValue({ user: { id: who.id }, expires: "2026-11-18T10:00:00.000Z" });
  mocks.db.user.findUnique.mockResolvedValue(who);
}

const get = (path: string) => new NextRequest(`http://localhost:3000${path}`);
const patch = (path: string) => new NextRequest(`http://localhost:3000${path}`, { method: "PATCH" });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("Admin routes (MIL-P1-5, MIL-P1-6)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  describe.each([
    ["GET /api/admin/users", () => listUsers(get("/api/admin/users"))],
    ["GET /api/admin/links", () => listLinks(get("/api/admin/links"))],
    ["PATCH disable", () => disableLink(patch("/api/admin/links/l1/disable"), params("l1"))],
    ["PATCH enable", () => enableLink(patch("/api/admin/links/l1/enable"), params("l1"))],
  ])("%s access control", (_name, call) => {
    it("returns 401 UNAUTHORIZED when signed out", async () => {
      signInAs(null);
      const res = await call();
      expect(res.status).toBe(401);
      expect((await res.json()).error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 ADMIN_REQUIRED for a normal user", async () => {
      signInAs(user);
      const res = await call();
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe("ADMIN_REQUIRED");
      expect(mocks.db.link.update).not.toHaveBeenCalled();
      expect(mocks.db.user.findMany).not.toHaveBeenCalled();
      expect(mocks.db.link.findMany).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/admin/users", () => {
    it("returns users with link counts and pagination meta", async () => {
      signInAs(admin);
      mocks.db.user.findMany.mockResolvedValue([
        { id: "user-1", name: "Alex", email: "alex@example.com", role: "USER", createdAt, _count: { links: 8 } },
      ]);
      mocks.db.user.count.mockResolvedValue(41);

      const res = await listUsers(get("/api/admin/users?page=3&pageSize=20&search=alex"));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: [
          { id: "user-1", name: "Alex", email: "alex@example.com", role: "USER", linksCount: 8, createdAt: createdAt.toISOString() },
        ],
        meta: { page: 3, pageSize: 20, total: 41 },
      });

      const query = mocks.db.user.findMany.mock.calls[0][0];
      expect(query.skip).toBe(40);
      expect(query.take).toBe(20);
      expect(query.where.OR).toHaveLength(2);
      expect(query.select).not.toHaveProperty("passwordHash");
      expect(query.select._count.select.links.where).toEqual({ deletedAt: null });
    });

    it("uses defaults and no filter without query parameters", async () => {
      signInAs(admin);
      mocks.db.user.findMany.mockResolvedValue([]);
      mocks.db.user.count.mockResolvedValue(0);
      const res = await listUsers(get("/api/admin/users?search="));
      expect((await res.json()).meta).toEqual({ page: 1, pageSize: 20, total: 0 });
      expect(mocks.db.user.findMany.mock.calls[0][0].where).toEqual({});
    });

    it.each(["page=0", "page=abc", "pageSize=101", "pageSize=0"])(
      "returns 400 VALIDATION_ERROR for %s",
      async (qs) => {
        signInAs(admin);
        const res = await listUsers(get(`/api/admin/users?${qs}`));
        expect(res.status).toBe(400);
        expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
      }
    );
  });

  describe("GET /api/admin/links", () => {
    it("returns all owners' links with owner email and meta", async () => {
      signInAs(admin);
      mocks.db.link.findMany.mockResolvedValue([
        {
          id: "link-1",
          code: "report2026",
          destinationUrl: "https://company.org/report",
          status: "ACTIVE",
          clickCount: 42,
          createdAt,
          owner: { email: "alex@example.com" },
        },
      ]);
      mocks.db.link.count.mockResolvedValue(1);

      const res = await listLinks(get("/api/admin/links?status=ACTIVE&search=report"));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: [
          {
            id: "link-1",
            code: "report2026",
            destinationUrl: "https://company.org/report",
            ownerEmail: "alex@example.com",
            status: "ACTIVE",
            clickCount: 42,
            createdAt: createdAt.toISOString(),
          },
        ],
        meta: { page: 1, pageSize: 20, total: 1 },
      });

      const where = mocks.db.link.findMany.mock.calls[0][0].where;
      expect(where.deletedAt).toBeNull();
      expect(where.status).toBe("ACTIVE");
      expect(where).not.toHaveProperty("ownerId");
      expect(where.OR).toHaveLength(3);
    });

    it("treats an empty status as no filter", async () => {
      signInAs(admin);
      mocks.db.link.findMany.mockResolvedValue([]);
      mocks.db.link.count.mockResolvedValue(0);
      await listLinks(get("/api/admin/links?status="));
      expect(mocks.db.link.findMany.mock.calls[0][0].where).toEqual({ deletedAt: null });
    });

    it("returns 400 VALIDATION_ERROR for an unknown status", async () => {
      signInAs(admin);
      const res = await listLinks(get("/api/admin/links?status=DELETED"));
      expect(res.status).toBe(400);
      expect(mocks.db.link.findMany).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /api/admin/links/[id]/disable", () => {
    it("sets ADMIN_DISABLED and invalidates the cache", async () => {
      signInAs(admin);
      mocks.db.link.findFirst.mockResolvedValue({ id: "link-1" });
      mocks.db.link.update.mockResolvedValue({ id: "link-1", code: "promo1", status: "ADMIN_DISABLED" });
      mocks.invalidateCachedLink.mockResolvedValue(undefined);

      const res = await disableLink(patch("/api/admin/links/link-1/disable"), params("link-1"));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: { id: "link-1", status: "ADMIN_DISABLED", cacheInvalidated: true },
      });
      expect(mocks.db.link.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "link-1" }, data: { status: "ADMIN_DISABLED" } })
      );
      expect(mocks.invalidateCachedLink).toHaveBeenCalledWith("promo1");
    });

    it("reports cacheInvalidated false, without failing, when the cache is unavailable", async () => {
      signInAs(admin);
      mocks.db.link.findFirst.mockResolvedValue({ id: "link-1" });
      mocks.db.link.update.mockResolvedValue({ id: "link-1", code: "promo1", status: "ADMIN_DISABLED" });
      mocks.invalidateCachedLink.mockRejectedValue(new Error("NOT_IMPLEMENTED: TEJ-P2-1"));

      const res = await disableLink(patch("/api/admin/links/link-1/disable"), params("link-1"));
      expect(res.status).toBe(200);
      expect((await res.json()).data).toEqual({
        id: "link-1",
        status: "ADMIN_DISABLED",
        cacheInvalidated: false,
      });
    });

    it("returns 404 LINK_NOT_FOUND for a missing or soft-deleted link", async () => {
      signInAs(admin);
      mocks.db.link.findFirst.mockResolvedValue(null);
      const res = await disableLink(patch("/api/admin/links/gone/disable"), params("gone"));
      expect(res.status).toBe(404);
      expect((await res.json()).error.code).toBe("LINK_NOT_FOUND");
      expect(mocks.db.link.findFirst.mock.calls[0][0].where).toEqual({ id: "gone", deletedAt: null });
      expect(mocks.db.link.update).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /api/admin/links/[id]/enable", () => {
    it("sets ACTIVE and invalidates the cache", async () => {
      signInAs(admin);
      mocks.db.link.findFirst.mockResolvedValue({ id: "link-1" });
      mocks.db.link.update.mockResolvedValue({ id: "link-1", code: "promo1", status: "ACTIVE" });
      mocks.invalidateCachedLink.mockResolvedValue(undefined);

      const res = await enableLink(patch("/api/admin/links/link-1/enable"), params("link-1"));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { id: "link-1", status: "ACTIVE" } });
      expect(mocks.db.link.update.mock.calls[0][0].data).toEqual({ status: "ACTIVE" });
      expect(mocks.invalidateCachedLink).toHaveBeenCalledWith("promo1");
    });

    it("returns 404 LINK_NOT_FOUND for a missing link", async () => {
      signInAs(admin);
      mocks.db.link.findFirst.mockResolvedValue(null);
      const res = await enableLink(patch("/api/admin/links/gone/enable"), params("gone"));
      expect(res.status).toBe(404);
      expect((await res.json()).error.code).toBe("LINK_NOT_FOUND");
    });
  });
});
