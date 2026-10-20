// Owner: Samriddhi | Task: SAM-P2-4 | Priority: P2
"use client";

import { useEffect, useState, type FormEvent } from "react";
import mockLinks from "@/mock/links-list.json";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AdminLink {
  id: string;
  code: string;
  destinationUrl: string;
  ownerEmail?: string;
  ownerId?: string;
  status: string;
  clickCount: number;
  createdAt?: string;
}

interface ListMeta { page: number; pageSize: number; total: number }
const fallbackLinks = mockLinks.data as AdminLink[];

export function AdminLinksTable() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminLink[]>([]);
  const [meta, setMeta] = useState<ListMeta>({ page: 1, pageSize: 20, total: 0 });
  const [loadedKey, setLoadedKey] = useState("");
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [reload, setReload] = useState(0);
  const requestKey = [page, search, status, reload].join("|");
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    fetch(`/api/admin/links?${query}`, { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message || "Could not load admin links.");
      if (active) { setRows(body.data as AdminLink[]); setMeta(body.meta ?? { page, pageSize: 20, total: (body.data as AdminLink[]).length }); setFallback(false); setError(""); setLoadedKey(requestKey); }
    }).catch((cause: unknown) => {
      if (!active) return;
      const filtered = fallbackLinks.filter((link) => (!search || link.code.includes(search.toLowerCase()) || link.destinationUrl.toLowerCase().includes(search.toLowerCase())) && (!status || link.status === status));
      setRows(filtered.slice((page - 1) * 20, page * 20));
      setMeta({ page, pageSize: 20, total: filtered.length });
      setFallback(true);
      setError(cause instanceof Error ? cause.message : "Could not load the admin link list.");
      setLoadedKey(requestKey);
    });
    return () => { active = false; };
  }, [page, reload, requestKey, search, status]);

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function toggleLink(link: AdminLink) {
    setBusyId(link.id);
    setError("");
    const enable = link.status !== "ACTIVE";
    try {
      await apiClient(`/api/admin/links/${encodeURIComponent(link.id)}/${enable ? "enable" : "disable"}`, { method: "PATCH" });
      setReload((value) => value + 1);
    } catch (cause) {
      if (fallback) {
        setRows((items) => items.map((item) => item.id === link.id ? { ...item, status: enable ? "ACTIVE" : "ADMIN_DISABLED" } : item));
        setError("Admin API unavailable. Status changed in this preview only.");
      } else {
        setError(cause instanceof Error ? cause.message : "Could not update this link.");
      }
    } finally {
      setBusyId("");
    }
  }

  const pageCount = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  return (
    <div className="space-y-4">
      <form onSubmit={applySearch} className="flex flex-wrap gap-2">
        <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search code or destination" aria-label="Search links" className="max-w-sm" />
        <Button type="submit" variant="secondary">Search</Button>
        <label className="sr-only" htmlFor="admin-link-status">Filter by status</label>
        <select id="admin-link-status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option><option value="ADMIN_DISABLED">Admin disabled</option></select>
      </form>
      {fallback && !loading && <p role="status" className="text-sm text-muted-foreground">Showing sample link rows because the admin API is unavailable.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="overflow-hidden rounded-lg border bg-card">
        {loading ? <div className="space-y-3 p-4" aria-label="Loading links">{[0, 1, 2, 3].map((item) => <div key={item} className="h-10 animate-pulse rounded bg-muted/50" />)}</div> : rows.length === 0 ? <p className="px-4 py-12 text-center text-sm text-muted-foreground">No links match this filter.</p> : <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead className="hidden lg:table-cell">Destination</TableHead><TableHead className="hidden md:table-cell">Owner</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Clicks</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{rows.map((link) => <TableRow key={link.id}><TableCell className="font-medium">/{link.code}</TableCell><TableCell className="hidden max-w-xs truncate text-muted-foreground lg:table-cell">{link.destinationUrl}</TableCell><TableCell className="hidden text-muted-foreground md:table-cell">{link.ownerEmail ?? link.ownerId ?? "-"}</TableCell><TableCell>{link.status.replaceAll("_", " ")}</TableCell><TableCell className="text-right tabular-nums">{link.clickCount.toLocaleString()}</TableCell><TableCell className="text-right"><Button size="sm" variant={link.status === "ACTIVE" ? "outline" : "secondary"} disabled={busyId === link.id} onClick={() => void toggleLink(link)}>{busyId === link.id ? "Saving..." : link.status === "ACTIVE" ? "Disable" : "Enable"}</Button></TableCell></TableRow>)}</TableBody></Table>}
      </div>
      <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{meta.total.toLocaleString()} links</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="px-2 py-1 text-muted-foreground">Page {page} of {pageCount}</span><Button variant="outline" size="sm" disabled={page >= pageCount || loading} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
    </div>
  );
}
