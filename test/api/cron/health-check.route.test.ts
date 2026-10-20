// Owner: Chirag | Task: CHI-P2-5, CHI-P2-6 | Priority: P2
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/health-check/route";
import { db } from "@/lib/db";
import * as healthCheckLib from "@/lib/health-check";

vi.mock("@/lib/db", () => ({
  db: {
    link: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/health-check", () => ({
  checkDestination: vi.fn(),
}));

describe("Route: GET /api/cron/health-check", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  describe("Authentication and Secret Configuration", () => {
    it("returns 503 in production when CRON_SECRET is not configured", async () => {
      delete process.env.CRON_SECRET;
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";

      const req = new NextRequest("http://localhost:3000/api/cron/health-check", {
        headers: { authorization: "Bearer some-token" },
      });
      const res = await GET(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error.message).toContain("Cron secret is not configured");
    });

    it("returns 401 in development/test when CRON_SECRET is not configured", async () => {
      delete process.env.CRON_SECRET;
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";

      const req = new NextRequest("http://localhost:3000/api/cron/health-check");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.message).toContain("Cron secret is not configured");
    });

    it("returns 401 when Authorization header is missing", async () => {
      process.env.CRON_SECRET = "super-secret-cron-key";

      const req = new NextRequest("http://localhost:3000/api/cron/health-check");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.message).toContain("Missing or invalid authorization header");
    });

    it("returns 401 when Authorization header has wrong scheme", async () => {
      process.env.CRON_SECRET = "super-secret-cron-key";

      const req = new NextRequest("http://localhost:3000/api/cron/health-check", {
        headers: { authorization: "Basic dXNlcjpwYXNz" },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.message).toContain("Missing or invalid authorization header");
    });

    it("returns 401 when Authorization Bearer token is incorrect", async () => {
      process.env.CRON_SECRET = "super-secret-cron-key";

      const req = new NextRequest("http://localhost:3000/api/cron/health-check", {
        headers: { authorization: "Bearer wrong-secret" },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.message).toContain("Invalid cron secret");
    });
  });

  describe("Execution with Valid Authorization", () => {
    it("checks active links and returns results without schema mutation", async () => {
      process.env.CRON_SECRET = "super-secret-cron-key";

      const mockLinks = [
        {
          id: "link-1",
          code: "test1",
          destinationUrl: "https://example.com/one",
        },
        {
          id: "link-2",
          code: "test2",
          destinationUrl: "https://example.com/two",
        },
      ];

      vi.mocked(db.link.findMany).mockResolvedValue(mockLinks as never);
      vi.mocked(healthCheckLib.checkDestination)
        .mockResolvedValueOnce({
          ok: true,
          statusCode: 200,
          checkedAt: "2026-10-20T00:00:00.000Z",
        })
        .mockResolvedValueOnce({
          ok: false,
          statusCode: 404,
          error: "HTTP status 404",
          checkedAt: "2026-10-20T00:00:01.000Z",
        });

      const req = new NextRequest("http://localhost:3000/api/cron/health-check", {
        headers: { authorization: "Bearer super-secret-cron-key" },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.checked).toBe(2);
      expect(json.data.persisted).toBe(false);
      expect(json.data.missingSchemaFields).toBeDefined();
      expect(json.data.results).toHaveLength(2);
      expect(json.data.results[0].code).toBe("test1");
      expect(json.data.results[0].ok).toBe(true);
      expect(json.data.results[1].code).toBe("test2");
      expect(json.data.results[1].ok).toBe(false);

      expect(db.link.findMany).toHaveBeenCalledWith({
        where: {
          status: "ACTIVE",
          deletedAt: null,
        },
        orderBy: {
          updatedAt: "asc",
        },
        take: 50,
        select: {
          id: true,
          code: true,
          destinationUrl: true,
        },
      });
    });
  });
});
