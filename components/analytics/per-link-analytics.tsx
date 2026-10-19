// Owner: Samriddhi | Task: SAM-P1-5 | Priority: P1
import React from "react";

// TODO (SAM): Per-link analytics panel embeddable into the link details page
export function PerLinkAnalytics({ linkId }: { linkId: string }) {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <h3 className="font-semibold text-base">Analytics for Link: {linkId}</h3>
      <p className="text-sm text-muted-foreground">Placeholder: Per-link charts, click totals, and device breakdown.</p>
    </div>
  );
}
