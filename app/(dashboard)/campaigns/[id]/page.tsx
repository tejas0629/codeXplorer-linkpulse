// Owner: Samriddhi | Task: SAM-P2-1 | Priority: P2
import { CampaignPerformance } from "@/components/campaigns/campaign-performance";

export const instant = false;

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CampaignPerformance campaignId={id} />;
}
