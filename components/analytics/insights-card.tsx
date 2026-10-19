// Owner: Samriddhi | Task: SAM-P2-5 | Priority: P2
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// TODO (SAM): Automated plain-English insights card derived from click trends
export function InsightsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Automated Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Placeholder: Plain-English traffic trends and highlights.</p>
      </CardContent>
    </Card>
  );
}
