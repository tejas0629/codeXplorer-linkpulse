// Owner: Samriddhi | Task: SAM-P2-1 | Priority: P2
"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import mockCampaigns from "@/mock/campaigns.json";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CampaignForm, type CampaignRecord } from "@/components/campaigns/campaign-form";
import { CampaignTable } from "@/components/campaigns/campaign-table";
import { CampaignHighlights } from "@/components/campaigns/campaign-highlights";

const fallbackCampaigns = mockCampaigns.data as CampaignRecord[];

export function CampaignsManager() {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignRecord>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient<CampaignRecord[]>("/api/campaigns").then((data) => {
      if (active) { setCampaigns(data); setUsingFallback(false); }
    }).catch(() => {
      if (active) { setCampaigns(fallbackCampaigns); setUsingFallback(true); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function openForm(campaign?: CampaignRecord) {
    setEditing(campaign);
    setError("");
    setDialogOpen(true);
  }

  async function save(values: { name: string; description: string }) {
    setSaving(true);
    setError("");
    try {
      const saved = await apiClient<CampaignRecord>(editing ? `/api/campaigns/${encodeURIComponent(editing.id)}` : "/api/campaigns", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(values),
      });
      setCampaigns((current) => editing
        ? current.map((item) => item.id === editing.id ? { ...item, ...saved, ...values } : item)
        : [{ ...saved, ...values, totalLinks: 0, totalClicks: 0 }, ...current]);
      setUsingFallback(false);
      setDialogOpen(false);
    } catch (cause) {
      if (!usingFallback) {
        setError(cause instanceof Error ? cause.message : "Campaign could not be saved.");
        return;
      }
      setCampaigns((current) => editing
        ? current.map((item) => item.id === editing.id ? { ...item, ...values } : item)
        : [{ id: `local-${Date.now()}`, ...values, totalLinks: 0, totalClicks: 0 }, ...current]);
      setError("API unavailable. Changes are local to this page and have not been saved to the server.");
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function remove(campaign: CampaignRecord) {
    if (!window.confirm(`Delete campaign \"${campaign.name}\"?`)) return;
    setError("");
    try {
      await apiClient(`/api/campaigns/${encodeURIComponent(campaign.id)}`, { method: "DELETE" });
      setCampaigns((current) => current.filter((item) => item.id !== campaign.id));
    } catch (cause) {
      if (usingFallback || campaign.id.startsWith("local-")) {
        setCampaigns((current) => current.filter((item) => item.id !== campaign.id));
        setError("API unavailable. Campaign was removed from this page only.");
      } else {
        setError(cause instanceof Error ? cause.message : "Campaign could not be deleted.");
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1><p className="mt-1 text-sm text-muted-foreground">Group links and compare campaign performance.</p></div>
        <Button onClick={() => openForm()}><Plus aria-hidden="true" />New campaign</Button>
      </div>
      {usingFallback && !loading && <p role="status" className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-muted-foreground">Campaign API unavailable. Sample campaigns are shown.</p>}
      {error && <p role="alert" className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p>}
      <CampaignTable campaigns={campaigns} loading={loading} onEdit={openForm} onDelete={remove} />
      <CampaignHighlights />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit campaign" : "Create campaign"}</DialogTitle><DialogDescription>Campaign names and descriptions can be updated at any time.</DialogDescription></DialogHeader>
          <CampaignForm key={editing?.id ?? "new-campaign"} initialCampaign={editing} saving={saving} onSubmit={save} onCancel={() => setDialogOpen(false)} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
