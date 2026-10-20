// Owner: Samriddhi | Task: SAM-P2-1 | Priority: P2
"use client";

import Link from "next/link";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CampaignRecord } from "@/components/campaigns/campaign-form";

interface CampaignTableProps {
  campaigns: CampaignRecord[];
  loading?: boolean;
  onEdit: (campaign: CampaignRecord) => void;
  onDelete: (campaign: CampaignRecord) => void;
}

export function CampaignTable({ campaigns, loading = false, onEdit, onDelete }: CampaignTableProps) {
  if (loading) return <div className="space-y-3 rounded-lg border p-4" aria-label="Loading campaigns">{[0, 1, 2].map((row) => <div key={row} className="h-12 animate-pulse rounded bg-muted/50" />)}</div>;
  if (campaigns.length === 0) return <div className="rounded-lg border px-4 py-14 text-center"><p className="font-medium">No campaigns yet</p><p className="mt-1 text-sm text-muted-foreground">Create a campaign to group and measure related links.</p></div>;

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead className="hidden md:table-cell">Links</TableHead><TableHead>Clicks</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>{campaigns.map((campaign) => <TableRow key={campaign.id}>
          <TableCell className="min-w-48"><Link href={`/campaigns/${encodeURIComponent(campaign.id)}`} className="font-medium hover:text-primary hover:underline">{campaign.name}</Link>{campaign.description && <p className="mt-1 max-w-sm truncate text-xs text-muted-foreground">{campaign.description}</p>}</TableCell>
          <TableCell className="hidden tabular-nums md:table-cell">{campaign.totalLinks ?? 0}</TableCell>
          <TableCell className="tabular-nums">{(campaign.totalClicks ?? 0).toLocaleString()}</TableCell>
          <TableCell><div className="flex justify-end gap-1">
            <Button asChild variant="ghost" size="icon-sm" aria-label={`View ${campaign.name} performance`} title="View performance"><Link href={`/campaigns/${encodeURIComponent(campaign.id)}`}><ExternalLink /></Link></Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${campaign.name}`} title="Edit campaign" onClick={() => onEdit(campaign)}><Pencil /></Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${campaign.name}`} title="Delete campaign" onClick={() => onDelete(campaign)}><Trash2 /></Button>
          </div></TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </div>
  );
}
