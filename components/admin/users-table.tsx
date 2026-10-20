// Owner: Samriddhi | Task: SAM-P2-4 | Priority: P2
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  linksCount: number;
  createdAt: string;
}

interface UserMeta { page: number; pageSize: number; total: number }

const demoUsers: AdminUser[] = [
  { id: "demo-user-1", name: "Alex Taylor", email: "alex@example.com", role: "USER", linksCount: 8, createdAt: "2026-10-18T10:00:00.000Z" },
  { id: "demo-user-2", name: "Jordan Lee", email: "jordan@example.com", role: "USER", linksCount: 5, createdAt: "2026-10-17T10:00:00.000Z" },
  { id: "demo-admin-1", name: "Platform Admin", email: "admin@example.com", role: "ADMIN", linksCount: 12, createdAt: "2026-10-12T10:00:00.000Z" },
];

export function UsersTable() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<UserMeta>({ page: 1, pageSize: 20, total: 0 });
  const [loadedKey, setLoadedKey] = useState("");
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState("");
  const requestKey = [page, search].join("|");
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (search) query.set("search", search);
    fetch(`/api/admin/users?${query}`, { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message || "Could not load users.");
      if (active) { setUsers(body.data as AdminUser[]); setMeta(body.meta ?? { page, pageSize: 20, total: (body.data as AdminUser[]).length }); setFallback(false); setError(""); setLoadedKey(requestKey); }
    }).catch((cause: unknown) => {
      if (!active) return;
      const filtered = demoUsers.filter((user) => !search || `${user.name ?? ""} ${user.email}`.toLowerCase().includes(search.toLowerCase()));
      setUsers(filtered.slice((page - 1) * 20, page * 20));
      setMeta({ page, pageSize: 20, total: filtered.length });
      setFallback(true);
      setError(cause instanceof Error ? cause.message : "Could not load users.");
      setLoadedKey(requestKey);
    });
    return () => { active = false; };
  }, [page, requestKey, search]);

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const pageCount = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  return (
    <div className="space-y-4">
      <form onSubmit={applySearch} className="flex gap-2"><Input className="max-w-sm" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name or email" aria-label="Search users" /><Button type="submit" variant="secondary">Search</Button></form>
      {fallback && !loading && <p role="status" className="text-sm text-muted-foreground">Showing demonstration user records because the admin API is unavailable.</p>}
      {error && !fallback && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="overflow-hidden rounded-lg border bg-card">
        {loading ? <div className="space-y-3 p-4" aria-label="Loading users">{[0, 1, 2].map((item) => <div key={item} className="h-10 animate-pulse rounded bg-muted/50" />)}</div> : users.length === 0 ? <p className="px-4 py-12 text-center text-sm text-muted-foreground">No users found.</p> : <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Links</TableHead><TableHead className="hidden md:table-cell">Joined</TableHead></TableRow></TableHeader><TableBody>{users.map((user) => <TableRow key={user.id}><TableCell className="font-medium">{user.name || "Unnamed user"}</TableCell><TableCell>{user.email}</TableCell><TableCell>{user.role}</TableCell><TableCell className="text-right tabular-nums">{user.linksCount.toLocaleString()}</TableCell><TableCell className="hidden text-muted-foreground md:table-cell">{new Date(user.createdAt).toLocaleDateString()}</TableCell></TableRow>)}</TableBody></Table>}
      </div>
      <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{meta.total.toLocaleString()} users</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-muted-foreground">Page {page} of {pageCount}</span><Button size="sm" variant="outline" disabled={page >= pageCount || loading} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
    </div>
  );
}
