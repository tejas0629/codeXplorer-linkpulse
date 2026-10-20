// Owner: Samriddhi | Task: SAM-P2-4 | Priority: P2
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BlockedDomain {
  id: string;
  domain: string;
  createdAt: string;
}

export function BlocklistManager() {
  const [domains, setDomains] = useState<BlockedDomain[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiClient<BlockedDomain[]>("/api/admin/blocklist").then((data) => {
      if (active) { setDomains(data); setFallback(false); setError(""); }
    }).catch((cause: unknown) => {
      if (active) { setDomains([]); setFallback(true); setError(cause instanceof Error ? cause.message : "Could not load the blocklist."); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function addDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const domain = domainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!domain || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)) {
      setError("Enter a valid hostname, such as example.com.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const created = await apiClient<BlockedDomain>("/api/admin/blocklist", { method: "POST", body: JSON.stringify({ domain }) });
      setDomains((current) => [created, ...current]);
      setDomainInput("");
      setFallback(false);
    } catch (cause) {
      if (fallback) setError("Blocklist API unavailable. The domain was not saved.");
      else setError(cause instanceof Error ? cause.message : "Could not add this domain.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeDomain(item: BlockedDomain) {
    setBusyId(item.id);
    setError("");
    try {
      await apiClient(`/api/admin/blocklist/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      setDomains((current) => current.filter((domain) => domain.id !== item.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove this domain.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addDomain} className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-4">
        <div className="min-w-56 flex-1 space-y-2"><label htmlFor="blocked-domain" className="text-sm font-medium">Domain</label><Input id="blocked-domain" required maxLength={253} value={domainInput} onChange={(event) => setDomainInput(event.target.value)} placeholder="example.com" /></div>
        <Button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Block domain"}</Button>
      </form>
      {fallback && <p role="status" className="text-sm text-muted-foreground">Blocklist API unavailable. The list could not be loaded; additions are disabled from fallback mode.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="overflow-hidden rounded-lg border bg-card">
        {loading ? <div className="space-y-3 p-4" aria-label="Loading blocked domains">{[0, 1, 2].map((item) => <div key={item} className="h-9 animate-pulse rounded bg-muted/50" />)}</div> : domains.length === 0 ? <p className="px-4 py-12 text-center text-sm text-muted-foreground">No blocked domains.</p> : <Table><TableHeader><TableRow><TableHead>Domain</TableHead><TableHead>Added</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{domains.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.domain}</TableCell><TableCell className="text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</TableCell><TableCell className="text-right"><Button type="button" variant="ghost" size="icon-sm" disabled={busyId === item.id} onClick={() => void removeDomain(item)} aria-label={`Remove ${item.domain}`} title="Remove domain"><Trash2 /></Button></TableCell></TableRow>)}</TableBody></Table>}
      </div>
    </div>
  );
}
