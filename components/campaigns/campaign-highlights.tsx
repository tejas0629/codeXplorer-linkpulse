// Owner: Samriddhi | Task: SAM-P2-5 | Priority: P2
import { AlertsPanel } from "@/components/analytics/alerts-panel";
import { InsightsCard } from "@/components/analytics/insights-card";

export function CampaignHighlights() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AlertsPanel />
      <InsightsCard />
    </div>
  );
}
