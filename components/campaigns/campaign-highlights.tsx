// Owner: Samriddhi | Task: SAM-P2-5 | Priority: P2
"use client";

import { useEffect, useState } from "react";
import mockAlerts from "@/mock/alerts.json";
import mockInsights from "@/mock/insights.json";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AlertRecord {
  id: string;
  code: string;
  type: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
}

const fallbackAlerts = mockAlerts.data as AlertRecord[];
const fallbackInsights = mockInsights.data as string[];

function SkeletonRows() {
  return <div className="space-y-3 p-4" aria-label="Loading analytics highlights">{[0, 1, 2].map((row) => <div key={row} className="h-8 animate-pulse rounded bg-muted/50" />)}</div>;
}

export function CampaignHighlights() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient<AlertRecord[]>("/api/analytics/alerts").catch(() => null),
      apiClient<string[]>("/api/analytics/insights").catch(() => null),
    ]).then(([alertData, insightData]) => {
      if (!active) return;
      setAlerts(alertData ?? fallbackAlerts);
      setInsights(insightData ?? fallbackInsights);
      setUsingFallback(alertData === null || insightData === null);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="gap-0 rounded-lg py-0 shadow-none">
        <CardHeader className="border-b px-4 py-3"><CardTitle className="text-sm font-semibold">Link alerts</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <SkeletonRows /> : alerts.length === 0 ? <p className="px-4 py-8 text-sm text-muted-foreground">No active alerts.</p> : <ul className="divide-y">{alerts.map((alert) => <li key={`${alert.id}-${alert.type}`} className="flex gap-3 px-4 py-3"><span aria-hidden="true" className={`mt-1 size-2 shrink-0 rounded-full ${alert.severity === "CRITICAL" ? "bg-destructive" : alert.severity === "WARNING" ? "bg-amber-500" : "bg-sky-500"}`} /><div className="min-w-0"><p className="text-sm font-medium">/{alert.code} · {alert.type.replaceAll("_", " ").toLowerCase()}</p><p className="text-sm text-muted-foreground">{alert.message}</p></div></li>)}</ul>}
        </CardContent>
      </Card>
      <Card className="gap-0 rounded-lg py-0 shadow-none">
        <CardHeader className="border-b px-4 py-3"><CardTitle className="text-sm font-semibold">Insights</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <SkeletonRows /> : insights.length === 0 ? <p className="px-4 py-8 text-sm text-muted-foreground">Insights will appear as traffic data comes in.</p> : <ul className="divide-y">{insights.map((insight, index) => <li key={`${index}-${insight}`} className="px-4 py-3 text-sm leading-6">{insight}</li>)}</ul>}
        </CardContent>
      </Card>
      {usingFallback && !loading && <p role="status" className="text-xs text-muted-foreground lg:col-span-2">Showing sample analytics highlights where the API is unavailable.</p>}
    </div>
  );
}
