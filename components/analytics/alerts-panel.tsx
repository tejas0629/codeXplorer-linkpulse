// Owner: Samriddhi | Task: SAM-P2-5 | Priority: P2
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// TODO (SAM): Alerts panel displaying expiring links, nearing click limits, and click spikes
export function AlertsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Active Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Placeholder: Proactive link alerts.</p>
      </CardContent>
    </Card>
  );
}
