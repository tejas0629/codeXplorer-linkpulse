import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/links/check/route";
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

describe("Route Handlers: /api/links/check (CHI-P1-6)", () => {
  const mockUser: SessionUser = {
    id: "user-100",
    email: "test@example.com",
    role: "USER",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 OK with live check results", async () => {
    vi.mocked(linksAuth.requireUser).mockResolvedValue(mockUser);
    vi.mocked(linksService.checkLink).mockResolvedValue({
      aliasAvailable: true,
      urlValid: true,
      domainBlocked: false,
      warnings: [],
    });

    const req = new NextRequest(
      "http://localhost:3000/api/links/check?alias=brand&url=https://example.com"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.aliasAvailable).toBe(true);
    expect(json.data.urlValid).toBe(true);
    expect(json.data.domainBlocked).toBe(false);
  });

  it("returns 400 VALIDATION_ERROR with fields map if parameters are missing", async () => {
    vi.mocked(linksAuth.requireUser).mockResolvedValue(mockUser);
    vi.mocked(linksService.checkLink).mockRejectedValue(
      new ApiError(
        "VALIDATION_ERROR",
        "At least one of 'alias' or 'url' query parameter must be provided",
        400,
        { query: "At least one of 'alias' or 'url' query parameter must be provided" }
      )
    );

    const req = new NextRequest("http://localhost:3000/api/links/check");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.fields).toBeDefined();
    expect(json.error.fields?.query).toBeDefined();
  });

  it("returns 401 UNAUTHORIZED if user is not signed in", async () => {
    vi.mocked(linksAuth.requireUser).mockRejectedValue(
      new ApiError("UNAUTHORIZED", "Authentication required", 401)
    );

    const req = new NextRequest(
      "http://localhost:3000/api/links/check?alias=promo"
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });
});
