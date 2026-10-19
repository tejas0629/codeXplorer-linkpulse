import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/links/route";
import * as linksAuth from "@/lib/links-auth";
import * as linksService from "@/lib/links";
import { RateLimitError } from "@/lib/rate-limit";
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

describe("Route Handlers: /api/links (CHI-P1-4)", () => {
  const mockUser: SessionUser = {
    id: "user-100",
    email: "test@example.com",
    role: "USER",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/links", () => {
    it("returns 201 Created on successful link creation", async () => {
      vi.mocked(linksAuth.requireUser).mockResolvedValue(mockUser);
      vi.mocked(linksService.createLink).mockResolvedValue({
        id: "link-created",
        code: "promo10",
        destinationUrl: "https://example.com/target",
        ownerId: mockUser.id,
        campaignId: null,
        status: "ACTIVE",
        expiresAt: null,
        maxClicks: null,
        clickCount: 0,
        hasPassword: false,
        mobileUrl: null,
        createdAt: "2026-10-18T10:00:00.000Z",
        updatedAt: "2026-10-18T10:00:00.000Z",
        tags: [],
      });

      const req = new NextRequest("http://localhost:3000/api/links", {
        method: "POST",
        body: JSON.stringify({
          destinationUrl: "https://example.com/target",
          code: "promo10",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe("link-created");
      expect(json.data.code).toBe("promo10");
    });

    it("returns 429 RATE_LIMITED with headers when rate limit exceeded", async () => {
      vi.mocked(linksAuth.requireUser).mockResolvedValue(mockUser);
      const rateError = new RateLimitError("Rate limit exceeded", {
        success: false,
        limit: 20,
        remaining: 0,
        reset: Date.now() + 30000,
      });
      vi.mocked(linksService.createLink).mockRejectedValue(rateError);

      const req = new NextRequest("http://localhost:3000/api/links", {
        method: "POST",
        body: JSON.stringify({ destinationUrl: "https://example.com" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBeDefined();
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
      const json = await res.json();
      expect(json.error.code).toBe("RATE_LIMITED");
    });

    it("returns 401 UNAUTHORIZED when session is missing", async () => {
      vi.mocked(linksAuth.requireUser).mockRejectedValue(
        new ApiError("UNAUTHORIZED", "Authentication required", 401)
      );

      const req = new NextRequest("http://localhost:3000/api/links", {
        method: "POST",
        body: JSON.stringify({ destinationUrl: "https://example.com" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 409 ALIAS_TAKEN when alias is taken", async () => {
      vi.mocked(linksAuth.requireUser).mockResolvedValue(mockUser);
      vi.mocked(linksService.createLink).mockRejectedValue(
        new ApiError("ALIAS_TAKEN", "The requested alias is already taken", 409)
      );

      const req = new NextRequest("http://localhost:3000/api/links", {
        method: "POST",
        body: JSON.stringify({
          destinationUrl: "https://example.com",
          code: "taken",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe("ALIAS_TAKEN");
    });
  });

  describe("GET /api/links", () => {
    it("returns 200 OK with list of links and pagination meta", async () => {
      vi.mocked(linksAuth.requireUser).mockResolvedValue(mockUser);
      vi.mocked(linksService.listLinks).mockResolvedValue({
        links: [
          {
            id: "link-1",
            code: "c1",
            destinationUrl: "https://example.com",
            ownerId: mockUser.id,
            campaignId: null,
            status: "ACTIVE",
            expiresAt: null,
            maxClicks: null,
            clickCount: 15,
            hasPassword: false,
            mobileUrl: null,
            createdAt: "2026-10-18T10:00:00.000Z",
            updatedAt: "2026-10-18T10:00:00.000Z",
            tags: ["test"],
          },
        ],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      });

      const req = new NextRequest("http://localhost:3000/api/links?page=1&pageSize=20");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBe(1);
      expect(json.meta).toEqual({
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });
    });
  });
});
