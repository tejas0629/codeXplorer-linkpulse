"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BotToggle } from "@/components/analytics/bot-toggle";
import { PeriodFilter, type AnalyticsPeriod } from "@/components/analytics/period-filter";
import { StatCards, type AnalyticsSummary } from "@/components/analytics/stat-cards";
import { BreakdownChart, type BreakdownItem } from "@/components/charts/breakdown-chart";
import { ClicksChart, type TimeseriesPoint } from "@/components/charts/clicks-chart";
import { TopLinksTable, type TopLink } from "@/components/charts/top-links-table";

interface AnalyticsBreakdown {
  devices: BreakdownItem[];
  browsers: BreakdownItem[];
  referrers: BreakdownItem[];
}

interface AnalyticsDashboardProps {
  linkId?: string;
  heading?: string;
  description?: string;
}

const apiPeriods: Record<AnalyticsPeriod, string> = {
  daily: "7d",
  weekly: "30d",
  monthly: "90d",
};

function aggregateTimeseries(points: TimeseriesPoint[], period: AnalyticsPeriod) {
  const buckets = new Map<string, TimeseriesPoint>();

  for (const point of points) {
    const date = new Date(`${point.date}T00:00:00.000Z`);
    let key = point.date;
    if (period === "weekly") {
      const day = date.getUTCDay();
      date.setUTCDate(date.getUTCDate() - ((day + 6) % 7));
      key = date.toISOString().slice(0, 10);
    } else if (period === "monthly") {
      key = point.date.slice(0, 7);
    }
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.clicks += point.clicks;
      bucket.uniqueVisitors += point.uniqueVisitors;
    } else {
      buckets.set(key, { date: key, clicks: point.clicks, uniqueVisitors: point.uniqueVisitors });
    }
  }

  return [...buckets.values()];
}

export function AnalyticsDashboard({
  linkId,
  heading = "Analytics overview",
  description = "Track how your links are performing across time, devices, and sources.",
}: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("daily");
  const [includeBots, setIncludeBots] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<AnalyticsSummary>();
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [breakdown, setBreakdown] = useState<AnalyticsBreakdown>();
  const [topLinks, setTopLinks] = useState<TopLink[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const [loadError, setLoadError] = useState("");
  const requestKey = [period, includeBots, from, to, linkId ?? ""].join("|");
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    const params = {
      period: apiPeriods[period],
      from: from ? new Date(`${from}T00:00:00.000Z`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59.999Z`).toISOString() : undefined,
      includeBots,
      linkId,
    };
    Promise.allSettled([
      apiClient<AnalyticsSummary>("/api/analytics/summary", { params, signal: controller.signal }),
      apiClient<TimeseriesPoint[]>("/api/analytics/timeseries", { params, signal: controller.signal }),
      apiClient<AnalyticsBreakdown>("/api/analytics/breakdown", { params, signal: controller.signal }),
      apiClient<TopLink[]>("/api/analytics/top-links", { params, signal: controller.signal }),
    ]).then(([summaryResult, timeseriesResult, breakdownResult, topLinksResult]) => {
      if (controller.signal.aborted) return;
      setSummary(summaryResult.status === "fulfilled" ? summaryResult.value : undefined);
      const nextTimeseries = timeseriesResult.status === "fulfilled" ? timeseriesResult.value : [];
      const filteredTimeseries = nextTimeseries.filter((point) =>
        (!from || point.date >= from) && (!to || point.date <= to),
      );
      setTimeseries(aggregateTimeseries(filteredTimeseries, period));
      setBreakdown(breakdownResult.status === "fulfilled" ? breakdownResult.value : undefined);
      setTopLinks(topLinksResult.status === "fulfilled" ? topLinksResult.value : []);
      const endpointNames = ["summary", "timeseries", "breakdown", "top links"];
      const failedEndpoints = [summaryResult, timeseriesResult, breakdownResult, topLinksResult]
        .flatMap((result, index) => result.status === "rejected" ? [endpointNames[index]] : []);
      setLoadError(failedEndpoints.length
        ? `Unable to load analytics ${failedEndpoints.join(", ")}. Please try again.`
        : "");
      setLoadedKey(requestKey);
    });

    return () => controller.abort();
  }, [from, includeBots, linkId, period, requestKey, to]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between xl:justify-end">
          <PeriodFilter
            value={period}
            onChange={setPeriod}
            from={from}
            to={to}
            onDateRangeChange={({ from: nextFrom, to: nextTo }) => {
              setFrom(nextFrom);
              setTo(nextTo);
            }}
          />
          <BotToggle includeBots={includeBots} onToggle={setIncludeBots} />
        </div>
      </div>

      {loadError && !loading && <p role="alert" className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{loadError}</p>}

      <StatCards data={summary} loading={loading} />

      <Card className="gap-2 rounded-lg py-5 shadow-none">
        <CardHeader className="px-5 pb-0">
          <CardTitle className="text-sm font-semibold">Clicks over time</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pt-2 sm:px-5">
          <ClicksChart data={timeseries} loading={loading} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownChart title="Devices" data={breakdown?.devices} loading={loading} />
        <BreakdownChart title="Browsers" data={breakdown?.browsers} loading={loading} />
        <BreakdownChart title="Referrers" data={breakdown?.referrers} loading={loading} />
      </div>

      <TopLinksTable data={topLinks} loading={loading} />
    </div>
  );
}