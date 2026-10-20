// Owner: Samriddhi | Task: SAM-P2-1 | Priority: P2
"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CampaignForm, type CampaignRecord } from "@/components/campaigns/campaign-form";
import { CampaignTable } from "@/components/campaigns/campaign-table";
import { CampaignHighlights } from "@/components/campaigns/campaign-highlights";

export function CampaignsManager() {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignRecord>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient<CampaignRecord[]>("/api/campaigns").then((data) => {
      if (active) setCampaigns(data);
    }).catch((cause: unknown) => {
      if (active) setLoadError(cause instanceof Error ? cause.message : "Campaigns could not be loaded.");
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
      setLoadError("");
      setDialogOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Campaign could not be saved.");
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
      setLoadError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Campaign could not be deleted.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1><p className="mt-1 text-sm text-muted-foreground">Group links and compare campaign performance.</p></div>
        <Button onClick={() => openForm()}><Plus aria-hidden="true" />New campaign</Button>
      </div>
      {error && <p role="alert" className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p>}
      <CampaignTable campaigns={campaigns} loading={loading} error={loadError} onEdit={openForm} onDelete={remove} />
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
