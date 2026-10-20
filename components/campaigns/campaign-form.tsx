// Owner: Samriddhi | Task: SAM-P2-1 | Priority: P2
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface CampaignRecord {
  id: string;
  name: string;
  description: string;
  totalLinks?: number;
  totalClicks?: number;
  topLinkCode?: string | null;
  createdAt?: string;
}

interface CampaignFormProps {
  initialCampaign?: CampaignRecord;
  saving?: boolean;
  onSubmit: (values: { name: string; description: string }) => Promise<void>;
  onCancel: () => void;
}

export function CampaignForm({ initialCampaign, saving = false, onSubmit, onCancel }: CampaignFormProps) {
  const [name, setName] = useState(initialCampaign?.name ?? "");
  const [description, setDescription] = useState(initialCampaign?.description ?? "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ name: name.trim(), description: description.trim() });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="campaign-name" className="text-sm font-medium">Name</label>
        <Input id="campaign-name" autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Autumn launch" />
      </div>
      <div className="space-y-2">
        <label htmlFor="campaign-description" className="text-sm font-medium">Description</label>
        <textarea id="campaign-description" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="What is this campaign for?" className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving || !name.trim()}>{saving ? "Saving..." : initialCampaign ? "Save changes" : "Create campaign"}</Button>
      </div>
    </form>
  );
}