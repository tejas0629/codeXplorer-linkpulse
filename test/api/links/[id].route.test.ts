import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "@/app/api/links/[id]/route";
import * as linksAuth from "@/lib/links-auth";
import * as linksService from "@/lib/links";
import { ApiError } from "@/lib/api-response";
import type { SessionUser } from "@/types/api";

vi.mock("@/lib/links-auth", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/links", () => ({
  createLink: vi.fn(),
  listLinks: vi.fn(),
  getLink: vi.fn(),
  updateLink: vi.fn(),
  softDeleteLink: vi.fn(),
  checkLink: vi.fn(),
}));

describe("Route Handlers: /api/links/[id] (CHI-P1-5)", () => {
  const mockUser: SessionUser = {
    id: "user-100",
    email: "test@example.com",
    role: "USER",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/links/[id]", () => {
    it("returns 200 OK with link details", async () => {
      vi.mocked(linksAuth.requireUser).mockResolvedValue(mockUser);
      vi.mocked(linksService.getLink).mockResolvedValue({
        id: "link-1",
        code: "promo",
        destinationUrl: "https://example.com",
        ownerId: mockUser.id,
        campaignId: null,
        status: "ACTIVE",
        expiresAt: null,
        maxClicks: null,
        clickCount: 5,
        hasPassword: false,
        mobileUrl: null,
        createdAt: "2026-10-18T10:00:00.000Z",
        updatedAt: "2026-10-18T10:00:00.000Z",
        tags: [],
      });

      const req = new NextRequest("http://localhost:3000/api/links/link-1");
      const res = await GET(req, { params: Promise.resolve({ id: "link-1" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe("link-1");
    });

    it("returns 404 LINK_NOT_FOUND when non-owner requests a link", async () => {
      vi.mocked(linksAuth.requireUser).mockResolvedValue(mockUser);
      vi.mocked(linksService.getLink).mockRejectedValue(
        new ApiError("LINK_NOT_FOUND", "Link not found", 404)
      );

      const req = new NextRequest("http://localhost:3000/api/links/foreign-link");
      const res = await GET(req, {
        params: Promise.resolve({ id: "foreign-link" }),
      });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe("LINK_NOT_FOUND");
    });
  });

  describe("PATCH /api/links/[id]", () => {
    it("returns 200 OK on successful update", async () => {
      vi.mocked(linksAuth.requireUser).mockResolvedValue(mockUser);
      vi.mocked(linksService.updateLink).mockResolvedValue({
        id: "link-1",
        code: "promo",
        destinationUrl: "https://example.com/updated",
        ownerId: mockUser.id,
        campaignId: null,
        status: "DISABLED",
        expiresAt: null,
        maxClicks: null,
        clickCount: 5,
        hasPassword: false,
        mobileUrl: null,
        createdAt: "2026-10-18T10:00:00.000Z",
        updatedAt: "2026-10-18T12:00:00.000Z",
        tags: [],
      });

      const req = new NextRequest("http://localhost:3000/api/links/link-1", {
        method: "PATCH",
        body: JSON.stringify({
          destinationUrl: "https://example.com/updated",
          status: "DISABLED",
        }),
      });

      const res = await PATCH(req, {
        params: Promise.resolve({ id: "link-1" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("DISABLED");
    });

    it("returns 403 FORBIDDEN when owner tries to enable ADMIN_DISABLED link", async () => {
      vi.mocked(linksAuth.requireUser).mockResolvedValue(mockUser);
      vi.mocked(linksService.updateLink).mockRejectedValue(
        new ApiError(
          "FORBIDDEN",
          "This link was disabled by an administrator and can only be re-enabled by an admin.",
          403
        )
      );

      const req = new NextRequest("http://localhost:3000/api/links/link-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "ACTIVE" }),
      });

      const res = await PATCH(req, {
        params: Promise.resolve({ id: "link-1" }),
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe("FORBIDDEN");
    });
  });

  describe("DELETE /api/links/[id]", () => {
    it("returns 200 OK with deleted: true on soft delete", async () => {
      vi.mocked(linksAuth.requireUser).mockResolvedValue(mockUser);
      vi.mocked(linksService.softDeleteLink).mockResolvedValue({
        id: "link-1",
        deleted: true,
      });

      const req = new NextRequest("http://localhost:3000/api/links/link-1", {
        method: "DELETE",
      });

      const res = await DELETE(req, {
        params: Promise.resolve({ id: "link-1" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.deleted).toBe(true);
    });
  });
});
