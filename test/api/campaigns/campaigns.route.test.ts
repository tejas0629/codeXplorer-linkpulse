import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    user: { findUnique: vi.fn() },
    campaign: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    link: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { GET, POST } from "@/app/api/campaigns/route";
import { PATCH, DELETE } from "@/app/api/campaigns/[id]/route";

const owner = { id: "user-1", name: "Alex", email: "alex@example.com", image: null, role: "USER" };
const other = { id: "user-2", name: "Sam", email: "sam@example.com", image: null, role: "USER" };
const admin = { id: "admin-1", name: "Admin", email: "admin@example.com", image: null, role: "ADMIN" };

const created = new Date("2026-10-18T10:00:00.000Z");
const updated = new Date("2026-10-18T11:00:00.000Z");

function signInAs(user: typeof owner | null) {
  if (!user) {
    mocks.auth.mockResolvedValue(null);
    return;
  }
  mocks.auth.mockResolvedValue({ user: { id: user.id }, expires: "2026-11-18T10:00:00.000Z" });
  mocks.db.user.findUnique.mockResolvedValue(user);
}

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

function existingCampaign(ownerId: string) {
  mocks.db.campaign.findUnique.mockResolvedValue({ id: "camp-1", ownerId });
}

describe("Campaign routes (MIL-P2-1)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("POST /api/campaigns", () => {
    it("returns 401 when signed out", async () => {
      signInAs(null);
      const res = await POST(jsonRequest("/api/campaigns", "POST", { name: "Launch" }));
      expect(res.status).toBe(401);
      expect((await res.json()).error.code).toBe("UNAUTHORIZED");
      expect(mocks.db.campaign.create).not.toHaveBeenCalled();
    });

    it("creates a campaign owned by the signed-in user, ignoring a client ownerId", async () => {
      signInAs(owner);
      mocks.db.campaign.create.mockImplementation(async ({ data }) => ({
        id: "camp-1",
        ...data,
        createdAt: created,
        updatedAt: created,
      }));

      const res = await POST(
        jsonRequest("/api/campaigns", "POST", {
          name: "  Black Friday 2026 ",
          description: "Holiday links",
          ownerId: "user-2",
        })
      );

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({
        data: {
          id: "camp-1",
          name: "Black Friday 2026",
          description: "Holiday links",
          ownerId: "user-1",
          createdAt: created.toISOString(),
          updatedAt: created.toISOString(),
        },
      });
      expect(mocks.db.campaign.create.mock.calls[0][0].data.ownerId).toBe("user-1");
    });

    it("stores an empty description as null", async () => {
      signInAs(owner);
      mocks.db.campaign.create.mockImplementation(async ({ data }) => ({
        id: "camp-1",
        ...data,
        createdAt: created,
        updatedAt: created,
      }));
      await POST(jsonRequest("/api/campaigns", "POST", { name: "Launch", description: "   " }));
      expect(mocks.db.campaign.create.mock.calls[0][0].data.description).toBeNull();
    });

    it.each([
      ["missing name", {}],
      ["blank name", { name: "   " }],
      ["long name", { name: "a".repeat(101) }],
      ["long description", { name: "ok", description: "a".repeat(501) }],
      ["non-string name", { name: 42 }],
    ])("returns 400 VALIDATION_ERROR for %s", async (_label, body) => {
      signInAs(owner);
      const res = await POST(jsonRequest("/api/campaigns", "POST", body));
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
      expect(mocks.db.campaign.create).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/campaigns", () => {
    it("returns 401 when signed out", async () => {
      signInAs(null);
      expect((await GET()).status).toBe(401);
    });

    it("lists only the user's campaigns with link and click totals", async () => {
      signInAs(owner);
      mocks.db.campaign.findMany.mockResolvedValue([
        { id: "camp-1", name: "A", description: null, createdAt: created },
        { id: "camp-2", name: "B", description: "desc", createdAt: created },
      ]);
      mocks.db.link.findMany.mockResolvedValue([
        { campaignId: "camp-1", _count: { clickEvents: 100 } },
        { campaignId: "camp-1", _count: { clickEvents: 240 } },
        { campaignId: "camp-1", _count: { clickEvents: 0 } },
      ]);

      const res = await GET();
      expect(res.status).toBe(200);
      expect((await res.json()).data).toEqual([
        { id: "camp-1", name: "A", description: null, totalLinks: 3, totalClicks: 340, createdAt: created.toISOString() },
        { id: "camp-2", name: "B", description: "desc", totalLinks: 0, totalClicks: 0, createdAt: created.toISOString() },
      ]);

      expect(mocks.db.campaign.findMany.mock.calls[0][0].where).toEqual({ ownerId: "user-1" });
      const linkQuery = mocks.db.link.findMany.mock.calls[0][0];
      expect(linkQuery.where).toEqual({ campaignId: { in: ["camp-1", "camp-2"] }, deletedAt: null });
      expect(linkQuery.select._count.select.clickEvents.where).toEqual({ result: "SUCCESS", isBot: false });
    });

    it("lists all campaigns for an admin", async () => {
      signInAs(admin);
      mocks.db.campaign.findMany.mockResolvedValue([]);
      const res = await GET();
      expect((await res.json()).data).toEqual([]);
      expect(mocks.db.campaign.findMany.mock.calls[0][0].where).toEqual({});
      expect(mocks.db.link.findMany).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /api/campaigns/[id]", () => {
    it("returns 401 when signed out", async () => {
      signInAs(null);
      const res = await PATCH(jsonRequest("/api/campaigns/camp-1", "PATCH", { name: "x" }), params("camp-1"));
      expect(res.status).toBe(401);
    });

    it("updates the owner's campaign", async () => {
      signInAs(owner);
      existingCampaign(owner.id);
      mocks.db.campaign.update.mockResolvedValue({
        id: "camp-1",
        name: "Holiday Season 2026",
        description: "Updated",
        updatedAt: updated,
      });

      const res = await PATCH(
        jsonRequest("/api/campaigns/camp-1", "PATCH", { name: "Holiday Season 2026", description: "Updated" }),
        params("camp-1")
      );

      expect(res.status).toBe(200);
      expect((await res.json()).data).toEqual({
        id: "camp-1",
        name: "Holiday Season 2026",
        description: "Updated",
        updatedAt: updated.toISOString(),
      });
      expect(mocks.db.campaign.update.mock.calls[0][0].data).toEqual({
        name: "Holiday Season 2026",
        description: "Updated",
      });
    });

    it("can clear the description without touching the name", async () => {
      signInAs(owner);
      existingCampaign(owner.id);
      mocks.db.campaign.update.mockResolvedValue({ id: "camp-1", name: "A", description: null, updatedAt: updated });
      await PATCH(jsonRequest("/api/campaigns/camp-1", "PATCH", { description: null }), params("camp-1"));
      expect(mocks.db.campaign.update.mock.calls[0][0].data).toEqual({ description: null });
    });

    it("returns 403 FORBIDDEN for another user's campaign", async () => {
      signInAs(other);
      existingCampaign(owner.id);
      const res = await PATCH(jsonRequest("/api/campaigns/camp-1", "PATCH", { name: "Hijack" }), params("camp-1"));
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe("FORBIDDEN");
      expect(mocks.db.campaign.update).not.toHaveBeenCalled();
    });

    it("lets an admin update any campaign", async () => {
      signInAs(admin);
      existingCampaign(owner.id);
      mocks.db.campaign.update.mockResolvedValue({ id: "camp-1", name: "X", description: null, updatedAt: updated });
      const res = await PATCH(jsonRequest("/api/campaigns/camp-1", "PATCH", { name: "X" }), params("camp-1"));
      expect(res.status).toBe(200);
    });

    it("returns 404 NOT_FOUND for a missing campaign", async () => {
      signInAs(owner);
      mocks.db.campaign.findUnique.mockResolvedValue(null);
      const res = await PATCH(jsonRequest("/api/campaigns/nope", "PATCH", { name: "X" }), params("nope"));
      expect(res.status).toBe(404);
      expect((await res.json()).error.code).toBe("NOT_FOUND");
    });

    it.each([
      ["an empty body", {}],
      ["a blank name", { name: " " }],
    ])("returns 400 VALIDATION_ERROR for %s", async (_label, body) => {
      signInAs(owner);
      existingCampaign(owner.id);
      const res = await PATCH(jsonRequest("/api/campaigns/camp-1", "PATCH", body), params("camp-1"));
      expect(res.status).toBe(400);
      expect(mocks.db.campaign.update).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /api/campaigns/[id]", () => {
    it("returns 401 when signed out", async () => {
      signInAs(null);
      expect((await DELETE(jsonRequest("/api/campaigns/camp-1", "DELETE"), params("camp-1"))).status).toBe(401);
    });

    it("deletes the owner's campaign", async () => {
      signInAs(owner);
      existingCampaign(owner.id);
      mocks.db.campaign.delete.mockResolvedValue({});
      const res = await DELETE(jsonRequest("/api/campaigns/camp-1", "DELETE"), params("camp-1"));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { id: "camp-1", deleted: true } });
      expect(mocks.db.campaign.delete).toHaveBeenCalledWith({ where: { id: "camp-1" } });
    });

    it("returns 403 FORBIDDEN for another user's campaign", async () => {
      signInAs(other);
      existingCampaign(owner.id);
      const res = await DELETE(jsonRequest("/api/campaigns/camp-1", "DELETE"), params("camp-1"));
      expect(res.status).toBe(403);
      expect(mocks.db.campaign.delete).not.toHaveBeenCalled();
    });

    it("lets an admin delete any campaign", async () => {
      signInAs(admin);
      existingCampaign(owner.id);
      mocks.db.campaign.delete.mockResolvedValue({});
      expect((await DELETE(jsonRequest("/api/campaigns/camp-1", "DELETE"), params("camp-1"))).status).toBe(200);
    });

    it("returns 404 NOT_FOUND for a missing campaign", async () => {
      signInAs(owner);
      mocks.db.campaign.findUnique.mockResolvedValue(null);
      const res = await DELETE(jsonRequest("/api/campaigns/nope", "DELETE"), params("nope"));
      expect(res.status).toBe(404);
      expect(mocks.db.campaign.delete).not.toHaveBeenCalled();
    });
  });
});
