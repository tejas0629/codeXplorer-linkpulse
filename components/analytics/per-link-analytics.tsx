// Owner: Samriddhi | Task: SAM-P1-5 | Priority: P1
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export function PerLinkAnalytics({ linkId }: { linkId: string }) {
  return (
    <AnalyticsDashboard
      linkId={linkId}
      heading="Link analytics"
      description="Performance for this link across time, devices, and sources."
    />
  );
}
