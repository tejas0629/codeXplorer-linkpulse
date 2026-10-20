// Owner: Chirag | Task: CHI-P1-8, CHI-P2-1, CHI-P2-2, CHI-P2-4 | Priority: P1
import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parsePeriod, fillMissingDays } from "@/lib/analytics-period";
import type {
  AnalyticsSummaryResponse, AnalyticsTimeseriesResponse,
  AnalyticsBreakdownResponse, TopLinksResponse, CampaignAnalyticsResponse,
  LinkAlertsResponse, InsightsResponse,
} from "@/types/api";

export const ALERT_THRESHOLDS = {
  EXPIRING_HOURS: 48,
  CLICK_LIMIT_PERCENT: 80,
  SPIKE_MULTIPLIER: 3,
  SPIKE_MIN_CLICKS_TODAY: 20,
} as const;

export interface AnalyticsScope {
  userId: string;
  isAdmin: boolean;
}

export interface AnalyticsQueryOptions {
  scope: AnalyticsScope;
  period?: "7d" | "30d" | "90d";
  from?: string;
  to?: string;
  includeBots?: boolean;
  campaignId?: string;
  linkId?: string;
  limit?: number;
}

function normalizeOptions(
  optionsOrUserId: AnalyticsQueryOptions | string,
  isAdminOrOptions?: boolean | Partial<AnalyticsQueryOptions>,
  linkIdParam?: string
): AnalyticsQueryOptions {
  if (typeof optionsOrUserId === "string") {
    const isAdmin =
      typeof isAdminOrOptions === "boolean" ? isAdminOrOptions : false;
    const extra =
      typeof isAdminOrOptions === "object" && isAdminOrOptions !== null
        ? isAdminOrOptions
        : {};
    return {
      scope: { userId: optionsOrUserId, isAdmin },
      linkId: linkIdParam ?? extra.linkId,
      ...extra,
    };
  }
  return optionsOrUserId;
}

export async function getAnalyticsSummary(
  optionsOrUserId: AnalyticsQueryOptions | string,
  isAdminOrOptions?: boolean | Partial<AnalyticsQueryOptions>,
  linkIdParam?: string
): Promise<AnalyticsSummaryResponse> {
  const opts = normalizeOptions(optionsOrUserId, isAdminOrOptions, linkIdParam);
  const { from, to } = parsePeriod(opts.period, opts.from, opts.to);

  const linkFilter: Prisma.LinkWhereInput = {
    ...(opts.scope.isAdmin ? {} : { ownerId: opts.scope.userId }),
    ...(opts.campaignId ? { campaignId: opts.campaignId } : {}),
    ...(opts.linkId ? { id: opts.linkId } : {}),
  };

  const clickBaseWhere: Prisma.ClickEventWhereInput = {
    result: "SUCCESS",
    createdAt: {
      gte: from,
      lte: to,
    },
    link: linkFilter,
  };

  const conditions: Prisma.Sql[] = [
    Prisma.sql`ce."result" = 'SUCCESS'::"ClickResult"`,
    Prisma.sql`ce."createdAt" >= ${from}`,
    Prisma.sql`ce."createdAt" <= ${to}`,
  ];

  if (!opts.includeBots) {
    conditions.push(Prisma.sql`ce."isBot" = false`);
  }

  if (!opts.scope.isAdmin) {
    conditions.push(Prisma.sql`l."ownerId" = ${opts.scope.userId}`);
  }

  if (opts.linkId) {
    conditions.push(Prisma.sql`ce."linkId" = ${opts.linkId}`);
  }

  if (opts.campaignId) {
    conditions.push(Prisma.sql`l."campaignId" = ${opts.campaignId}`);
  }

  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

  const uniqueVisitorsQuery = Prisma.sql`
    SELECT COUNT(DISTINCT ce."visitorId")::bigint AS "count"
    FROM "ClickEvent" ce
    JOIN "Link" l ON ce."linkId" = l."id"
    ${whereClause}
  `;

  const [totalLinks, totalClicks, botClicks, qrScans, uniqueVisitorsRows] =
    await Promise.all([
      db.link.count({
        where: {
          deletedAt: null,
          ...linkFilter,
        },
      }),
      db.clickEvent.count({
        where: {
          ...clickBaseWhere,
          ...(opts.includeBots ? {} : { isBot: false }),
        },
      }),
      db.clickEvent.count({
        where: {
          ...clickBaseWhere,
          isBot: true,
        },
      }),
      db.clickEvent.count({
        where: {
          ...clickBaseWhere,
          source: "QR",
          ...(opts.includeBots ? {} : { isBot: false }),
        },
      }),
      db.$queryRaw<Array<{ count: number | bigint }>>(uniqueVisitorsQuery),
    ]);

  const uniqueVisitorsRaw = uniqueVisitorsRows?.[0]?.count ?? 0;
  const uniqueVisitors =
    typeof uniqueVisitorsRaw === "bigint"
      ? Number(uniqueVisitorsRaw)
      : Number(uniqueVisitorsRaw || 0);

  return {
    totalLinks,
    totalClicks,
    uniqueVisitors,
    botClicks,
    qrScans,
  };
}

export async function getAnalyticsTimeseries(
  optionsOrUserId: AnalyticsQueryOptions | string,
  options?: Partial<AnalyticsQueryOptions>
): Promise<AnalyticsTimeseriesResponse> {
  const opts = normalizeOptions(optionsOrUserId, options);
  const { from, to } = parsePeriod(opts.period, opts.from, opts.to);

  const conditions: Prisma.Sql[] = [
    Prisma.sql`ce."result" = 'SUCCESS'::"ClickResult"`,
    Prisma.sql`ce."createdAt" >= ${from}`,
    Prisma.sql`ce."createdAt" <= ${to}`,
  ];

  if (!opts.includeBots) {
    conditions.push(Prisma.sql`ce."isBot" = false`);
  }

  if (!opts.scope.isAdmin) {
    conditions.push(Prisma.sql`l."ownerId" = ${opts.scope.userId}`);
  }

  if (opts.linkId) {
    conditions.push(Prisma.sql`ce."linkId" = ${opts.linkId}`);
  }

  if (opts.campaignId) {
    conditions.push(Prisma.sql`l."campaignId" = ${opts.campaignId}`);
  }

  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

  const query = Prisma.sql`
    SELECT
      to_char(date_trunc('day', ce."createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS "date",
      COUNT(*)::int AS "clicks",
      COUNT(DISTINCT ce."visitorId")::int AS "uniqueVisitors"
    FROM "ClickEvent" ce
    JOIN "Link" l ON ce."linkId" = l."id"
    ${whereClause}
    GROUP BY date_trunc('day', ce."createdAt" AT TIME ZONE 'UTC')
    ORDER BY "date" ASC
  `;

  const rows = await db.$queryRaw<
    Array<{ date: string; clicks: number | bigint; uniqueVisitors: number | bigint }>
  >(query);

  const formattedRows = (rows || []).map((r) => ({
    date: r.date,
    clicks: Number(r.clicks),
    uniqueVisitors: Number(r.uniqueVisitors),
  }));

  return fillMissingDays(formattedRows, from, to);
}

export async function getAnalyticsBreakdown(
  optionsOrUserId: AnalyticsQueryOptions | string,
  options?: Partial<AnalyticsQueryOptions>
): Promise<AnalyticsBreakdownResponse> {
  const opts = normalizeOptions(optionsOrUserId, options);
  const { from, to } = parsePeriod(opts.period, opts.from, opts.to);

  const clickWhere: Prisma.ClickEventWhereInput = {
    result: "SUCCESS",
    createdAt: {
      gte: from,
      lte: to,
    },
    ...(opts.includeBots ? {} : { isBot: false }),
    link: {
      ...(opts.scope.isAdmin ? {} : { ownerId: opts.scope.userId }),
      ...(opts.campaignId ? { campaignId: opts.campaignId } : {}),
      ...(opts.linkId ? { id: opts.linkId } : {}),
    },
  };

  const [deviceGroups, browserGroups, referrerGroups] = await Promise.all([
    db.clickEvent.groupBy({
      by: ["deviceType"],
      where: clickWhere,
      _count: { _all: true },
      orderBy: { _count: { deviceType: "desc" } },
    }),
    db.clickEvent.groupBy({
      by: ["browser"],
      where: clickWhere,
      _count: { _all: true },
      orderBy: { _count: { browser: "desc" } },
    }),
    db.clickEvent.groupBy({
      by: ["referrer"],
      where: clickWhere,
      _count: { _all: true },
      orderBy: { _count: { referrer: "desc" } },
    }),
  ]);

  function mapBreakdown(
    groups: Array<{ [key: string]: unknown; _count: { _all: number } }>,
    key: string,
    defaultName: string
  ) {
    const total = groups.reduce((acc, g) => acc + g._count._all, 0);
    return groups.map((g) => {
      const rawName = g[key];
      const name =
        rawName && String(rawName).trim().length > 0
          ? String(rawName)
          : defaultName;
      const count = g._count._all;
      const percentage =
        total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
      return { name, count, percentage };
    });
  }

  return {
    devices: mapBreakdown(deviceGroups as Array<{ [key: string]: unknown; _count: { _all: number } }>, "deviceType", "other"),
    browsers: mapBreakdown(browserGroups as Array<{ [key: string]: unknown; _count: { _all: number } }>, "browser", "other"),
    referrers: mapBreakdown(referrerGroups as Array<{ [key: string]: unknown; _count: { _all: number } }>, "referrer", "direct"),
  };
}

export async function getTopLinks(
  optionsOrUserId: AnalyticsQueryOptions | string,
  limitParam: number = 10
): Promise<TopLinksResponse> {
  const opts = normalizeOptions(optionsOrUserId, undefined, undefined);
  const limit = Math.min(Math.max(opts.limit ?? limitParam, 1), 50);
  const { from, to } = parsePeriod(opts.period, opts.from, opts.to);

  const links = await db.link.findMany({
    where: {
      deletedAt: null,
      ...(opts.scope.isAdmin ? {} : { ownerId: opts.scope.userId }),
      ...(opts.campaignId ? { campaignId: opts.campaignId } : {}),
      ...(opts.linkId ? { id: opts.linkId } : {}),
    },
    select: {
      id: true,
      code: true,
      destinationUrl: true,
      status: true,
      clickCount: true,
      _count: {
        select: {
          clickEvents: {
            where: {
              result: "SUCCESS",
              ...(opts.includeBots ? {} : { isBot: false }),
              createdAt: {
                gte: from,
                lte: to,
              },
            },
          },
        },
      },
    },
  });

  const items = links.map((link) => ({
    id: link.id,
    code: link.code,
    destinationUrl: link.destinationUrl,
    clicks: link._count?.clickEvents ?? 0,
    status: link.status,
  }));

  items.sort((a, b) => b.clicks - a.clicks);
  return items.slice(0, limit);
}

export async function getCampaignAnalytics(
  optionsOrUserId: AnalyticsQueryOptions | string
): Promise<CampaignAnalyticsResponse> {
  const opts = normalizeOptions(optionsOrUserId);

  const campaigns = await db.campaign.findMany({
    where: opts.scope.isAdmin ? {} : { ownerId: opts.scope.userId },
    include: {
      links: {
        where: { deletedAt: null },
        select: {
          id: true,
          code: true,
          _count: {
            select: {
              clickEvents: {
                where: {
                  result: "SUCCESS",
                  ...(opts.includeBots ? {} : { isBot: false }),
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return campaigns.map((c) => {
    const totalLinks = c.links.length;
    let totalClicks = 0;
    let topLinkCode = "";
    let maxClicks = -1;

    for (const link of c.links) {
      const clicks = link._count?.clickEvents ?? 0;
      totalClicks += clicks;
      if (clicks > maxClicks) {
        maxClicks = clicks;
        topLinkCode = link.code;
      }
    }

    return {
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      totalLinks,
      totalClicks,
      topLinkCode,
      createdAt: c.createdAt.toISOString(),
    };
  });
}

export async function getLinkAlerts(
  optionsOrUserId: AnalyticsQueryOptions | string
): Promise<LinkAlertsResponse> {
  const opts = normalizeOptions(optionsOrUserId);
  const now = new Date();

  const links = await db.link.findMany({
    where: {
      deletedAt: null,
      ...(opts.scope.isAdmin ? {} : { ownerId: opts.scope.userId }),
    },
    select: {
      id: true,
      code: true,
      expiresAt: true,
      maxClicks: true,
      clickCount: true,
    },
  });

  const alerts: LinkAlertsResponse = [];

  for (const link of links) {
    if (link.maxClicks && link.maxClicks > 0) {
      const percentUsed = (link.clickCount / link.maxClicks) * 100;
      if (percentUsed >= ALERT_THRESHOLDS.CLICK_LIMIT_PERCENT) {
        const severity = percentUsed >= 98 ? "CRITICAL" : "WARNING";
        alerts.push({
          id: link.id,
          code: link.code,
          type: "LIMIT_NEARLY_REACHED",
          message: `Link has reached ${link.clickCount} of ${link.maxClicks} max clicks (${Math.round(percentUsed)}%).`,
          severity,
        });
      }
    }

    if (link.expiresAt) {
      const diffMs = link.expiresAt.getTime() - now.getTime();
      const hoursRemaining = diffMs / (1000 * 60 * 60);
      if (hoursRemaining > 0 && hoursRemaining <= ALERT_THRESHOLDS.EXPIRING_HOURS) {
        const severity = hoursRemaining <= 24 ? "WARNING" : "INFO";
        alerts.push({
          id: link.id,
          code: link.code,
          type: "EXPIRING_SOON",
          message:
            hoursRemaining <= 24
              ? "Link expires in less than 24 hours."
              : "Link expires in less than 48 hours.",
          severity,
        });
      }
    }
  }

  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const prev7DaysStart = new Date(
    todayStart.getTime() - 7 * 24 * 60 * 60 * 1000
  );

  const [todayClicksByLink, prev7ClicksByLink] = await Promise.all([
    db.clickEvent.groupBy({
      by: ["linkId"],
      where: {
        result: "SUCCESS",
        createdAt: { gte: todayStart },
        link: {
          deletedAt: null,
          ...(opts.scope.isAdmin ? {} : { ownerId: opts.scope.userId }),
        },
      },
      _count: { _all: true },
    }),
    db.clickEvent.groupBy({
      by: ["linkId"],
      where: {
        result: "SUCCESS",
        createdAt: { gte: prev7DaysStart, lt: todayStart },
        link: {
          deletedAt: null,
          ...(opts.scope.isAdmin ? {} : { ownerId: opts.scope.userId }),
        },
      },
      _count: { _all: true },
    }),
  ]);

  const prev7Map = new Map<string, number>();
  for (const item of prev7ClicksByLink) {
    prev7Map.set(item.linkId, item._count._all);
  }

  const linkMap = new Map(links.map((l) => [l.id, l]));

  for (const item of todayClicksByLink) {
    const clicksToday = item._count._all;
    if (clicksToday >= ALERT_THRESHOLDS.SPIKE_MIN_CLICKS_TODAY) {
      const totalPrev7 = prev7Map.get(item.linkId) ?? 0;
      const avgPrev7 = totalPrev7 / 7;
      if (
        avgPrev7 === 0 ||
        clicksToday >= ALERT_THRESHOLDS.SPIKE_MULTIPLIER * avgPrev7
      ) {
        const link = linkMap.get(item.linkId);
        if (link) {
          const ratio =
            avgPrev7 > 0 ? (clicksToday / avgPrev7).toFixed(1) : String(clicksToday);
          alerts.push({
            id: link.id,
            code: link.code,
            type: "SUDDEN_SPIKE",
            message: `Sudden spike detected: ${clicksToday} clicks today (${ratio}x previous 7-day average).`,
            severity: "WARNING",
          });
        }
      }
    }
  }

  return alerts;
}

export async function getAnalyticsInsights(
  optionsOrUserId: AnalyticsQueryOptions | string
): Promise<InsightsResponse> {
  const opts = normalizeOptions(optionsOrUserId);
  const { from, to, previousFrom, previousTo } = parsePeriod(
    opts.period,
    opts.from,
    opts.to
  );

  const linkFilter: Prisma.LinkWhereInput = {
    ...(opts.scope.isAdmin ? {} : { ownerId: opts.scope.userId }),
    ...(opts.campaignId ? { campaignId: opts.campaignId } : {}),
    ...(opts.linkId ? { id: opts.linkId } : {}),
  };

  const [currClicks, prevClicks, referrerGroups, botClicks, clicksByDate] =
    await Promise.all([
      db.clickEvent.count({
        where: {
          result: "SUCCESS",
          isBot: false,
          createdAt: { gte: from, lte: to },
          link: linkFilter,
        },
      }),
      db.clickEvent.count({
        where: {
          result: "SUCCESS",
          isBot: false,
          createdAt: { gte: previousFrom, lte: previousTo },
          link: linkFilter,
        },
      }),
      db.clickEvent.groupBy({
        by: ["referrer"],
        where: {
          result: "SUCCESS",
          isBot: false,
          createdAt: { gte: from, lte: to },
          link: linkFilter,
        },
        _count: { _all: true },
        orderBy: { _count: { referrer: "desc" } },
        take: 1,
      }),
      db.clickEvent.count({
        where: {
          result: "SUCCESS",
          isBot: true,
          createdAt: { gte: from, lte: to },
          link: linkFilter,
        },
      }),
      db.clickEvent.findMany({
        where: {
          result: "SUCCESS",
          isBot: false,
          createdAt: { gte: from, lte: to },
          link: linkFilter,
        },
        select: { createdAt: true },
      }),
    ]);

  if (currClicks === 0 && prevClicks === 0 && botClicks === 0) {
    return [
      "No click data available yet for this period. Share your links to generate insights.",
    ];
  }

  const insights: string[] = [];

  if (prevClicks > 0) {
    const diff = currClicks - prevClicks;
    const pct = Math.round((Math.abs(diff) / prevClicks) * 100);
    if (diff >= 0) {
      insights.push(
        `Overall click volume increased by ${pct}% compared to the previous period.`
      );
    } else {
      insights.push(
        `Overall click volume decreased by ${pct}% compared to the previous period.`
      );
    }
  } else if (currClicks > 0) {
    insights.push(
      `Overall click volume reached ${currClicks} clicks during this period.`
    );
  }

  if (clicksByDate.length > 0) {
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    for (const c of clicksByDate) {
      dayCounts[c.createdAt.getUTCDay()]++;
    }
    let bestDayIndex = 0;
    let maxDayClicks = -1;
    for (let i = 0; i < dayCounts.length; i++) {
      if (dayCounts[i] > maxDayClicks) {
        maxDayClicks = dayCounts[i];
        bestDayIndex = i;
      }
    }
    if (maxDayClicks > 0) {
      insights.push(
        `${dayNames[bestDayIndex]} is your most active day with ${maxDayClicks} clicks.`
      );
    }
  }

  if (referrerGroups.length > 0 && currClicks > 0) {
    const topRef = referrerGroups[0];
    const refCount = topRef._count._all;
    const pct = Number(((refCount / currClicks) * 100).toFixed(1));
    const refName = topRef.referrer ? String(topRef.referrer) : "Direct visits";
    if (refName === "Direct visits" || refName.toLowerCase() === "direct") {
      insights.push(`Direct visits remain the primary traffic source at ${pct}%.`);
    } else {
      insights.push(`${refName} is your primary external traffic source at ${pct}%.`);
    }
  }

  const totalWithBots = currClicks + botClicks;
  if (totalWithBots > 0 && botClicks > 0) {
    const botShare = Number(((botClicks / totalWithBots) * 100).toFixed(1));
    insights.push(
      `Automated bot traffic accounts for ${botShare}% of total incoming requests.`
    );
  }

  return insights.length > 0
    ? insights
    : [
      "No click data available yet for this period. Share your links to generate insights.",
    ];
}
