// Owner: Samriddhi | Task: SAM-P2-5 | Priority: P2
"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InsightsCard() {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    apiClient<string[]>("/api/analytics/insights", { signal: controller.signal })
      .then(setInsights)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Insights could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <Card className="gap-0 rounded-lg py-0 shadow-none">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-sm font-semibold">Insights</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-3 p-4" aria-label="Loading insights">
            <div className="h-8 animate-pulse rounded bg-muted/50" />
            <div className="h-8 animate-pulse rounded bg-muted/50" />
            <div className="h-8 animate-pulse rounded bg-muted/50" />
          </div>
        ) : error ? (
          <p role="alert" className="px-4 py-8 text-sm text-destructive">{error}</p>
        ) : insights.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">Insights will appear as traffic data comes in.</p>
        ) : (
          <ul className="divide-y">
            {insights.map((insight, index) => (
              <li key={`${index}-${insight}`} className="px-4 py-3 text-sm leading-6">{insight}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
