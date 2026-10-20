// Owner: Samriddhi | Task: SAM-P2-1 | Priority: P2
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import mockCampaigns from "@/mock/campaigns.json";
import mockLinks from "@/mock/links-list.json";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CampaignRecord } from "@/components/campaigns/campaign-form";

interface CampaignLink {
  id: string;
  code: string;
  destinationUrl: string;
  status: string;
  clickCount: number;
  campaignId?: string | null;
}

interface CampaignAnalytics {
  id: string;
  name: string;
  totalLinks: number;
  totalClicks: number;
  topLinkCode?: string | null;
}

const fallbackCampaigns = mockCampaigns.data as CampaignRecord[];
const fallbackLinks = mockLinks.data as CampaignLink[];

export function CampaignPerformance({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<CampaignRecord>();
  const [links, setLinks] = useState<CampaignLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient<CampaignRecord[]>("/api/campaigns").catch(() => null),
      apiClient<CampaignAnalytics[]>("/api/analytics/campaigns").catch(() => null),
      apiClient<CampaignLink[]>("/api/links", { params: { campaignId } }).catch(() => null),
    ]).then(([campaignData, analyticsData, linkData]) => {
      if (!active) return;
      const localCampaign = fallbackCampaigns.find((item) => item.id === campaignId);
      const foundCampaign = campaignData?.find((item) => item.id === campaignId) ?? localCampaign;
      const metrics = analyticsData?.find((item) => item.id === campaignId);
      const mockCampaign = localCampaign;
      const associatedMockLinks = mockCampaign
        ? fallbackLinks.filter((link) => link.campaignId === campaignId)
        : [];
      setCampaign(foundCampaign
        ? { ...foundCampaign, ...metrics }
        : metrics ? { ...metrics, description: "" } : undefined);
      setLinks(linkData ?? associatedMockLinks);
      if (!foundCampaign && !metrics) setError("Campaign not found or unavailable for this account.");
      setUsingFallback(campaignData === null || analyticsData === null || linkData === null);
      setLoading(false);
    });
    return () => { active = false; };
  }, [campaignId]);

  if (loading) return <div className="space-y-4" aria-label="Loading campaign performance"><div className="h-12 animate-pulse rounded bg-muted" /><div className="h-40 animate-pulse rounded bg-muted" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><Button asChild variant="outline" size="sm"><Link href="/campaigns">Back to campaigns</Link></Button><div><h1 className="text-2xl font-semibold tracking-tight">{campaign?.name ?? "Campaign performance"}</h1><p className="text-sm text-muted-foreground">{campaign?.description || "Performance and links assigned to this campaign."}</p></div></div>
      {usingFallback && <p role="status" className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-muted-foreground">Some campaign data is using sample values because an API endpoint is unavailable.</p>}
      {error && <p role="alert" className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p>}
      {campaign && <div className="grid gap-4 sm:grid-cols-2"><Card className="rounded-lg py-5 shadow-none"><CardHeader className="px-5 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total links</CardTitle></CardHeader><CardContent className="px-5 text-2xl font-semibold tabular-nums">{(campaign.totalLinks ?? links.length).toLocaleString()}</CardContent></Card><Card className="rounded-lg py-5 shadow-none"><CardHeader className="px-5 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total clicks</CardTitle></CardHeader><CardContent className="px-5 text-2xl font-semibold tabular-nums">{(campaign.totalClicks ?? links.reduce((sum, link) => sum + link.clickCount, 0)).toLocaleString()}</CardContent></Card></div>}
      <section className="overflow-hidden rounded-lg border bg-card"><div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">Campaign links</h2></div>{links.length === 0 ? <p className="px-4 py-10 text-center text-sm text-muted-foreground">No links are assigned to this campaign yet.</p> : <Table><TableHeader><TableRow><TableHead>Short link</TableHead><TableHead className="hidden md:table-cell">Destination</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Clicks</TableHead></TableRow></TableHeader><TableBody>{links.map((link) => <TableRow key={link.id}><TableCell><Link href={`/links/${encodeURIComponent(link.id)}`} className="font-medium text-primary hover:underline">/{link.code}</Link></TableCell><TableCell className="hidden max-w-md truncate text-muted-foreground md:table-cell">{link.destinationUrl}</TableCell><TableCell>{link.status}</TableCell><TableCell className="text-right tabular-nums">{link.clickCount.toLocaleString()}</TableCell></TableRow>)}</TableBody></Table>}</section>
    </div>
  );
}
