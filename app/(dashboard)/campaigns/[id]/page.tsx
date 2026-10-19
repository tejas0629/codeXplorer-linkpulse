// Owner: Samriddhi | Task: SAM-P2-1 | Priority: P2
import React from "react";

export const instant = false;

// TODO (SAM): Campaign details and performance view with associated links
export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Campaign: {id}</h1>
      <p className="text-sm text-muted-foreground">Placeholder: Campaign performance and top links.</p>
    </div>
  );
}
