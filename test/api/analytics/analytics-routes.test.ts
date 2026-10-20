import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSummary } from "@/app/api/analytics/summary/route";
import { GET as getTimeseries } from "@/app/api/analytics/timeseries/route";
import { GET as getBreakdown } from "@/app/api/analytics/breakdown/route";
import { GET as getTopLinks } from "@/app/api/analytics/top-links/route";
import { GET as getCampaigns } from "@/app/api/analytics/campaigns/route";
import { GET as getAlerts } from "@/app/api/analytics/alerts/route";
import { GET as getInsights } from "@/app/api/analytics/insights/route";
import * as linksAuth from "@/lib/links-auth";
import * as analyticsService from "@/lib/analytics";
import { ApiError } from "@/lib/api-response";
import type { SessionUser } from "@/types/api";

vi.mock("@/lib/links-auth", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  getAnalyticsSummary: vi.fn(),
  getAnalyticsTimeseries: vi.fn(),
  getAnalyticsBreakdown: vi.fn(),
  getTopLinks: vi.fn(),
  getCampaignAnalytics: vi.fn(),
  getLinkAlerts: vi.fn(),
  getAnalyticsInsights: vi.fn(),
}));

describe("Route Handlers: /api/analytics/*", () => {
  const mockUser: SessionUser = {
    id: "user-100",
    email: "test@example.com",
    role: "USER",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("401 Unauthorized across all endpoints without session", () => {
    beforeEach(() => {
      vi.mocked(linksAuth.requireUser).mockRejectedValue(
        new ApiError("UNAUTHORIZED", "Authentication required", 401)
      );
    });

    it("GET /api/analytics/summary returns 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/analytics/summary");
      const res = await getSummary(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("GET /api/analytics/timeseries returns 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/analytics/timeseries");
      const res = await getTimeseries(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("GET /api/analytics/breakdown returns 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/analytics/breakdown");
      const res = await getBreakdown(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("GET /api/analytics/top-links returns 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/analytics/top-links");
      const res = await getTopLinks(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("GET /api/analytics/campaigns returns 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/analytics/campaigns");
      const res = await getCampaigns(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("GET /api/analytics/alerts returns 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/analytics/alerts");
      const res = await getAlerts(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("GET /api/analytics/insights returns 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/analytics/insights");
      const res = await getInsights(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("400 Bad Request on invalid query parameters", () => {
    beforeEach(() => {
      vi.mocked(linksAuth.requireUser).mockResolvedValue(mockUser);
    });

    it("GET /api/analytics/summary returns 400 on invalid period", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/analytics/summary?period=invalid"
      );
      const res = await getSummary(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("GET /api/analytics/top-links returns 400 when limit exceeds 50", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/analytics/top-links?limit=55"
      );
      const res = await getTopLinks(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("GET /api/analytics/timeseries returns 400 on invalid ISO date format", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/analytics/timeseries?from=not-a-date"
      );
      const res = await getTimeseries(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("200 OK on valid requests", () => {
    beforeEach(() => {
      vi.mocked(linksAuth.requireUser).mockResolvedValue(mockUser);
    });

    it("GET /api/analytics/summary returns 200 OK", async () => {
      vi.mocked(analyticsService.getAnalyticsSummary).mockResolvedValue({
        totalLinks: 10,
        totalClicks: 500,
        uniqueVisitors: 300,
        botClicks: 20,
        qrScans: 50,
      });

      const req = new NextRequest(
        "http://localhost:3000/api/analytics/summary?period=30d"
      );
      const res = await getSummary(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.totalLinks).toBe(10);
    });

    it("GET /api/analytics/timeseries returns 200 OK", async () => {
      vi.mocked(analyticsService.getAnalyticsTimeseries).mockResolvedValue([
        { date: "2026-10-18", clicks: 10, uniqueVisitors: 8 },
      ]);

      const req = new NextRequest("http://localhost:3000/api/analytics/timeseries");
      const res = await getTimeseries(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
    });

    it("GET /api/analytics/breakdown returns 200 OK", async () => {
      vi.mocked(analyticsService.getAnalyticsBreakdown).mockResolvedValue({
        devices: [{ name: "desktop", count: 10, percentage: 100 }],
        browsers: [{ name: "Chrome", count: 10, percentage: 100 }],
        referrers: [{ name: "direct", count: 10, percentage: 100 }],
      });

      const req = new NextRequest("http://localhost:3000/api/analytics/breakdown");
      const res = await getBreakdown(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.devices[0].name).toBe("desktop");
    });

    it("GET /api/analytics/top-links returns 200 OK", async () => {
      vi.mocked(analyticsService.getTopLinks).mockResolvedValue([
        {
          id: "l1",
          code: "promo",
          destinationUrl: "https://example.com",
          clicks: 200,
          status: "ACTIVE",
        },
      ]);

      const req = new NextRequest("http://localhost:3000/api/analytics/top-links");
      const res = await getTopLinks(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data[0].code).toBe("promo");
    });

    it("GET /api/analytics/campaigns returns 200 OK", async () => {
      vi.mocked(analyticsService.getCampaignAnalytics).mockResolvedValue([
        {
          id: "c1",
          name: "Q4",
          totalLinks: 2,
          totalClicks: 150,
          topLinkCode: "promo",
        },
      ]);

      const req = new NextRequest("http://localhost:3000/api/analytics/campaigns");
      const res = await getCampaigns(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data[0].topLinkCode).toBe("promo");
    });

    it("GET /api/analytics/alerts returns 200 OK", async () => {
      vi.mocked(analyticsService.getLinkAlerts).mockResolvedValue([
        {
          id: "l1",
          code: "summer-sale",
          type: "LIMIT_NEARLY_REACHED",
          message: "Near limit",
          severity: "WARNING",
        },
      ]);

      const req = new NextRequest("http://localhost:3000/api/analytics/alerts");
      const res = await getAlerts(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data[0].type).toBe("LIMIT_NEARLY_REACHED");
    });

    it("GET /api/analytics/insights returns 200 OK", async () => {
      vi.mocked(analyticsService.getAnalyticsInsights).mockResolvedValue([
        "Direct visits remain the primary traffic source at 45.8%.",
      ]);

      const req = new NextRequest("http://localhost:3000/api/analytics/insights");
      const res = await getInsights(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data[0]).toContain("Direct visits");
    });
  });
});
