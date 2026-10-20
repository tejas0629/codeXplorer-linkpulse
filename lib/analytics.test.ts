/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  getAnalyticsSummary, getAnalyticsTimeseries, getAnalyticsBreakdown, getTopLinks,
  getCampaignAnalytics, getLinkAlerts, getAnalyticsInsights,
} from "./analytics";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    link: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    clickEvent: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    campaign: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

describe("lib/analytics.ts Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Scope: User vs Admin Filtering", () => {
    it("applies ownerId filter for regular user in summary", async () => {
      vi.mocked(db.link.count).mockResolvedValue(5);
      vi.mocked(db.clickEvent.count).mockResolvedValue(100);
      vi.mocked(db.$queryRaw).mockResolvedValue([{ count: BigInt(42) }] as any);

      const summary = await getAnalyticsSummary({
        scope: { userId: "user-1", isAdmin: false },
        period: "30d",
      });

      expect(db.link.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: "user-1",
            deletedAt: null,
          }),
        })
      );

      expect(db.clickEvent.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            link: expect.objectContaining({
              ownerId: "user-1",
            }),
          }),
        })
      );

      expect(summary.uniqueVisitors).toBe(42);
      expect(db.$queryRaw).toHaveBeenCalled();
      const rawCall = vi.mocked(db.$queryRaw).mock.calls[0][0] as any;
      const sqlStrings = rawCall.strings.join(" ");
      expect(sqlStrings).toContain('COUNT(DISTINCT ce."visitorId")');
      expect(sqlStrings).toContain('l."ownerId" =');
      expect(rawCall.values).toContain("user-1");
    });

    it("does not apply ownerId filter for admin in summary", async () => {
      vi.mocked(db.link.count).mockResolvedValue(12);
      vi.mocked(db.clickEvent.count).mockResolvedValue(1420);
      vi.mocked(db.$queryRaw).mockResolvedValue([{ count: BigInt(0) }] as any);

      await getAnalyticsSummary({
        scope: { userId: "admin-1", isAdmin: true },
        period: "30d",
      });

      expect(db.link.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
          },
        })
      );

      expect(db.clickEvent.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            link: {},
          }),
        })
      );

      const rawCall = vi.mocked(db.$queryRaw).mock.calls[0][0] as any;
      const sqlStrings = rawCall.strings.join(" ");
      expect(sqlStrings).not.toContain('l."ownerId"');
      expect(rawCall.values).not.toContain("admin-1");
    });
  });

  describe("Soft Deleted Links Exclusion", () => {
    it("excludes soft-deleted links from top-links", async () => {
      vi.mocked(db.link.findMany).mockResolvedValue([
        {
          id: "link-1",
          code: "active-link",
          destinationUrl: "https://example.com",
          status: "ACTIVE",
          clickCount: 50,
          _count: { clickEvents: 50 },
        },
      ] as any);

      await getTopLinks({
        scope: { userId: "user-1", isAdmin: false },
        limit: 5,
      });

      expect(db.link.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        })
      );
    });

    it("excludes soft-deleted links from campaign analytics", async () => {
      vi.mocked(db.campaign.findMany).mockResolvedValue([
        {
          id: "camp-1",
          name: "Campaign 1",
          description: "Desc",
          createdAt: new Date("2026-10-01"),
          links: [
            {
              id: "l1",
              code: "code1",
              _count: { clickEvents: 10 },
            },
          ],
        },
      ] as any);

      const res = await getCampaignAnalytics({
        scope: { userId: "user-1", isAdmin: false },
      });

      expect(db.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            links: expect.objectContaining({
              where: { deletedAt: null },
            }),
          }),
        })
      );
      expect(res[0].totalLinks).toBe(1);
    });

    it("excludes soft-deleted links from link alerts", async () => {
      vi.mocked(db.link.findMany).mockResolvedValue([]);
      vi.mocked(db.clickEvent.groupBy).mockResolvedValue([] as any);

      await getLinkAlerts({
        scope: { userId: "user-1", isAdmin: false },
      });

      expect(db.link.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        })
      );
    });
  });

  describe("Bot Toggle Filtering", () => {
    it("filters isBot: false when includeBots is false (default)", async () => {
      vi.mocked(db.link.count).mockResolvedValue(1);
      vi.mocked(db.clickEvent.count).mockResolvedValue(10);
      vi.mocked(db.$queryRaw).mockResolvedValue([{ count: BigInt(5) }] as any);

      await getAnalyticsSummary({
        scope: { userId: "user-1", isAdmin: false },
        includeBots: false,
      });

      expect(db.clickEvent.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isBot: false,
          }),
        })
      );

      const rawCall = vi.mocked(db.$queryRaw).mock.calls[0][0] as any;
      const sqlStrings = rawCall.strings.join(" ");
      expect(sqlStrings).toContain('ce."isBot" = false');
    });

    it("does not filter isBot when includeBots is true", async () => {
      vi.mocked(db.link.count).mockResolvedValue(1);
      vi.mocked(db.clickEvent.count).mockResolvedValue(15);
      vi.mocked(db.$queryRaw).mockResolvedValue([{ count: BigInt(7) }] as any);

      await getAnalyticsSummary({
        scope: { userId: "user-1", isAdmin: false },
        includeBots: true,
      });

      const totalClicksCall = vi.mocked(db.clickEvent.count).mock.calls[0][0];
      expect(totalClicksCall?.where?.isBot).toBeUndefined();

      const rawCall = vi.mocked(db.$queryRaw).mock.calls[0][0] as any;
      const sqlStrings = rawCall.strings.join(" ");
      expect(sqlStrings).not.toContain('ce."isBot"');
    });

    it("applies period bounds in unique visitors $queryRaw query", async () => {
      vi.mocked(db.link.count).mockResolvedValue(1);
      vi.mocked(db.clickEvent.count).mockResolvedValue(10);
      vi.mocked(db.$queryRaw).mockResolvedValue([{ count: BigInt(3) }] as any);

      await getAnalyticsSummary({
        scope: { userId: "user-1", isAdmin: false },
        from: "2026-10-01T00:00:00.000Z",
        to: "2026-10-10T23:59:59.999Z",
      });

      const rawCall = vi.mocked(db.$queryRaw).mock.calls[0][0] as any;
      const sqlStrings = rawCall.strings.join(" ");
      expect(sqlStrings).toContain('ce."createdAt" >=');
      expect(sqlStrings).toContain('ce."createdAt" <=');
      expect(rawCall.values).toContainEqual(new Date("2026-10-01T00:00:00.000Z"));
      expect(rawCall.values).toContainEqual(new Date("2026-10-10T23:59:59.999Z"));
    });
  });

  describe("Alert Boundary Conditions", () => {
    it("triggers LIMIT_NEARLY_REACHED at exactly 80% and CRITICAL at 98%", async () => {
      vi.mocked(db.link.findMany).mockResolvedValue([
        {
          id: "link-exact-80",
          code: "exact-80",
          expiresAt: null,
          maxClicks: 100,
          clickCount: 80,
        },
        {
          id: "link-79",
          code: "below-80",
          expiresAt: null,
          maxClicks: 100,
          clickCount: 79,
        },
        {
          id: "link-98",
          code: "crit-98",
          expiresAt: null,
          maxClicks: 100,
          clickCount: 98,
        },
      ] as any);

      vi.mocked(db.clickEvent.groupBy).mockResolvedValue([] as any);

      const alerts = await getLinkAlerts({
        scope: { userId: "user-1", isAdmin: false },
      });

      const codes = alerts.map((a) => a.code);
      expect(codes).toContain("exact-80");
      expect(codes).not.toContain("below-80");
      expect(codes).toContain("crit-98");

      const alert80 = alerts.find((a) => a.code === "exact-80");
      expect(alert80?.severity).toBe("WARNING");

      const alert98 = alerts.find((a) => a.code === "crit-98");
      expect(alert98?.severity).toBe("CRITICAL");
    });

    it("triggers EXPIRING_SOON when expiring within exactly 48 hours", async () => {
      const now = Date.now();
      const in47h = new Date(now + 47 * 3600 * 1000);
      const in50h = new Date(now + 50 * 3600 * 1000);

      vi.mocked(db.link.findMany).mockResolvedValue([
        {
          id: "link-in47h",
          code: "expiring-soon",
          expiresAt: in47h,
          maxClicks: null,
          clickCount: 10,
        },
        {
          id: "link-in50h",
          code: "safe-link",
          expiresAt: in50h,
          maxClicks: null,
          clickCount: 10,
        },
      ] as any);

      vi.mocked(db.clickEvent.groupBy).mockResolvedValue([] as any);

      const alerts = await getLinkAlerts({
        scope: { userId: "user-1", isAdmin: false },
      });

      const codes = alerts.map((a) => a.code);
      expect(codes).toContain("expiring-soon");
      expect(codes).not.toContain("safe-link");
    });

    it("triggers SUDDEN_SPIKE at exactly 3x with >= 20 clicks today, but ignores when < 20 clicks", async () => {
      vi.mocked(db.link.findMany).mockResolvedValue([
        {
          id: "link-spike",
          code: "spike-link",
          expiresAt: null,
          maxClicks: null,
          clickCount: 50,
        },
        {
          id: "link-small",
          code: "small-link",
          expiresAt: null,
          maxClicks: null,
          clickCount: 19,
        },
      ] as any);

      vi.mocked(db.clickEvent.groupBy).mockImplementation(((args: any) => {
        if (args.where.createdAt.gte && !args.where.createdAt.lt) {
          // Today's clicks
          return Promise.resolve([
            { linkId: "link-spike", _count: { _all: 30 } },
            { linkId: "link-small", _count: { _all: 19 } },
          ]);
        }
        if (args.where.createdAt.lt) {
          // Previous 7 days clicks
          return Promise.resolve([
            { linkId: "link-spike", _count: { _all: 70 } }, // avg 10/day -> 30 clicks is exactly 3x
            { linkId: "link-small", _count: { _all: 7 } }, // avg 1/day -> 19 clicks is 19x, but < 20 clicks today
          ]);
        }
        return Promise.resolve([]);
      }) as any);

      const alerts = await getLinkAlerts({
        scope: { userId: "user-1", isAdmin: false },
      });

      const codes = alerts.map((a) => a.code);
      expect(codes).toContain("spike-link");
      expect(codes).not.toContain("small-link");
    });
  });

  describe("Analytics Insights Sentences", () => {
    it("returns friendly fallback message when no click data exists", async () => {
      vi.mocked(db.clickEvent.count).mockResolvedValue(0);
      vi.mocked(db.clickEvent.groupBy).mockResolvedValue([] as any);
      vi.mocked(db.clickEvent.findMany).mockResolvedValue([] as any);

      const insights = await getAnalyticsInsights({
        scope: { userId: "user-1", isAdmin: false },
        period: "30d",
      });

      expect(insights).toHaveLength(1);
      expect(insights[0]).toContain("No click data available yet");
    });

    it("generates sentences from real numbers for normal data", async () => {
      vi.mocked(db.clickEvent.count)
        .mockResolvedValueOnce(124) // currClicks
        .mockResolvedValueOnce(100) // prevClicks (growth = 24%)
        .mockResolvedValueOnce(10); // botClicks

      vi.mocked(db.clickEvent.groupBy).mockResolvedValueOnce([
        { referrer: "twitter.com", _count: { _all: 50 } },
      ] as any);

      vi.mocked(db.clickEvent.findMany).mockResolvedValueOnce([
        { createdAt: new Date("2026-10-18T10:00:00Z") }, // Sunday
        { createdAt: new Date("2026-10-18T12:00:00Z") },
      ] as any);

      const insights = await getAnalyticsInsights({
        scope: { userId: "user-1", isAdmin: false },
        period: "30d",
      });

      expect(insights.some((s) => s.includes("increased by 24%"))).toBe(true);
      expect(insights.some((s) => s.includes("Sunday is your most active day"))).toBe(
        true
      );
      expect(insights.some((s) => s.includes("twitter.com"))).toBe(true);
      expect(insights.some((s) => s.includes("Automated bot traffic accounts for"))).toBe(
        true
      );
    });
  });

  describe("Contract Shape Equality Against mock/*.json", () => {
    it("matches mock/analytics-summary.json shape", async () => {
      const mockRaw = JSON.parse(
        fs.readFileSync(
          path.resolve(process.cwd(), "mock/analytics-summary.json"),
          "utf-8"
        )
      );

      vi.mocked(db.link.count).mockResolvedValue(12);
      vi.mocked(db.clickEvent.count).mockResolvedValue(1420);
      vi.mocked(db.$queryRaw).mockResolvedValue([{ count: BigInt(980) }] as any);

      const real = await getAnalyticsSummary({
        scope: { userId: "u1", isAdmin: false },
      });

      expect(real.uniqueVisitors).toBe(980);
      expect(Object.keys(real).sort()).toEqual(
        Object.keys(mockRaw.data).sort()
      );
    });

    it("matches mock/analytics-timeseries.json shape", async () => {
      const mockRaw = JSON.parse(
        fs.readFileSync(
          path.resolve(process.cwd(), "mock/analytics-timeseries.json"),
          "utf-8"
        )
      );

      vi.mocked(db.$queryRaw).mockResolvedValue([
        { date: "2026-10-18", clicks: 105, uniqueVisitors: 77 },
      ] as any);

      const real = await getAnalyticsTimeseries({
        scope: { userId: "u1", isAdmin: false },
        period: "7d",
      });

      expect(real.length).toBeGreaterThan(0);
      expect(Object.keys(real[0]).sort()).toEqual(
        Object.keys(mockRaw.data[0]).sort()
      );
    });

    it("matches mock/analytics-breakdown.json shape", async () => {
      const mockRaw = JSON.parse(
        fs.readFileSync(
          path.resolve(process.cwd(), "mock/analytics-breakdown.json"),
          "utf-8"
        )
      );

      vi.mocked(db.clickEvent.groupBy)
        .mockResolvedValueOnce([
          { deviceType: "desktop", _count: { _all: 820 } },
        ] as any)
        .mockResolvedValueOnce([
          { browser: "Chrome", _count: { _all: 910 } },
        ] as any)
        .mockResolvedValueOnce([
          { referrer: "direct", _count: { _all: 650 } },
        ] as any);

      const real = await getAnalyticsBreakdown({
        scope: { userId: "u1", isAdmin: false },
      });

      expect(Object.keys(real).sort()).toEqual(
        Object.keys(mockRaw.data).sort()
      );
      expect(Object.keys(real.devices[0]).sort()).toEqual(
        Object.keys(mockRaw.data.devices[0]).sort()
      );
      expect(Object.keys(real.browsers[0]).sort()).toEqual(
        Object.keys(mockRaw.data.browsers[0]).sort()
      );
      expect(Object.keys(real.referrers[0]).sort()).toEqual(
        Object.keys(mockRaw.data.referrers[0]).sort()
      );
    });

    it("matches mock/top-links.json shape", async () => {
      const mockRaw = JSON.parse(
        fs.readFileSync(
          path.resolve(process.cwd(), "mock/top-links.json"),
          "utf-8"
        )
      );

      vi.mocked(db.link.findMany).mockResolvedValue([
        {
          id: "link-1",
          code: "launch-2026",
          destinationUrl: "https://company.org/product-launch",
          status: "ACTIVE",
          clickCount: 420,
          _count: { clickEvents: 420 },
        },
      ] as any);

      const real = await getTopLinks({
        scope: { userId: "u1", isAdmin: false },
      });

      expect(real.length).toBeGreaterThan(0);
      expect(Object.keys(real[0]).sort()).toEqual(
        Object.keys(mockRaw.data[0]).sort()
      );
    });

    it("matches mock/campaigns.json shape", async () => {
      const mockRaw = JSON.parse(
        fs.readFileSync(
          path.resolve(process.cwd(), "mock/campaigns.json"),
          "utf-8"
        )
      );

      vi.mocked(db.campaign.findMany).mockResolvedValue([
        {
          id: "camp-1",
          name: "Q4 Product Launch",
          description: "Marketing campaigns",
          createdAt: new Date("2026-09-20T10:00:00.000Z"),
          links: [
            {
              id: "l1",
              code: "launch-2026",
              _count: { clickEvents: 628 },
            },
          ],
        },
      ] as any);

      const real = await getCampaignAnalytics({
        scope: { userId: "u1", isAdmin: false },
      });

      expect(real.length).toBeGreaterThan(0);
      expect(Object.keys(real[0]).sort()).toEqual(
        Object.keys(mockRaw.data[0]).sort()
      );
    });

    it("matches mock/alerts.json shape", async () => {
      const mockRaw = JSON.parse(
        fs.readFileSync(
          path.resolve(process.cwd(), "mock/alerts.json"),
          "utf-8"
        )
      );

      vi.mocked(db.link.findMany).mockResolvedValue([
        {
          id: "l1",
          code: "summer-sale",
          expiresAt: null,
          maxClicks: 500,
          clickCount: 485,
        },
      ] as any);
      vi.mocked(db.clickEvent.groupBy).mockResolvedValue([] as any);

      const real = await getLinkAlerts({
        scope: { userId: "u1", isAdmin: false },
      });

      expect(real.length).toBeGreaterThan(0);
      expect(Object.keys(real[0]).sort()).toEqual(
        Object.keys(mockRaw.data[0]).sort()
      );
    });

    it("matches mock/insights.json shape", async () => {
      const mockRaw = JSON.parse(
        fs.readFileSync(
          path.resolve(process.cwd(), "mock/insights.json"),
          "utf-8"
        )
      );

      vi.mocked(db.clickEvent.count).mockResolvedValue(100);
      vi.mocked(db.clickEvent.groupBy).mockResolvedValue([
        { referrer: "twitter.com", _count: { _all: 50 } },
      ] as any);
      vi.mocked(db.clickEvent.findMany).mockResolvedValue([
        { createdAt: new Date() },
      ] as any);

      const real = await getAnalyticsInsights({
        scope: { userId: "u1", isAdmin: false },
      });

      expect(Array.isArray(real)).toBe(true);
      expect(typeof real[0]).toBe(typeof mockRaw.data[0]);
    });
  });
});
