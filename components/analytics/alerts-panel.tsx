// Owner: Samriddhi | Task: SAM-P2-5 | Priority: P2
"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AlertRecord {
  id: string;
  code: string;
  type: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
}

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    apiClient<AlertRecord[]>("/api/analytics/alerts", { signal: controller.signal })
      .then(setAlerts)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Alerts could not be loaded.");
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
        <CardTitle className="text-sm font-semibold">Link alerts</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-3 p-4" aria-label="Loading link alerts">
            <div className="h-8 animate-pulse rounded bg-muted/50" />
            <div className="h-8 animate-pulse rounded bg-muted/50" />
            <div className="h-8 animate-pulse rounded bg-muted/50" />
          </div>
        ) : error ? (
          <p role="alert" className="px-4 py-8 text-sm text-destructive">{error}</p>
        ) : alerts.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">No active alerts.</p>
        ) : (
          <ul className="divide-y">
            {alerts.map((alert) => (
              <li key={`${alert.id}-${alert.type}`} className="flex gap-3 px-4 py-3">
                <span
                  aria-hidden="true"
                  className={`mt-1 size-2 shrink-0 rounded-full ${alert.severity === "CRITICAL" ? "bg-destructive" : alert.severity === "WARNING" ? "bg-amber-500" : "bg-sky-500"}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">/{alert.code} · {alert.type.replaceAll("_", " ").toLowerCase()}</p>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
