// Owner: Samriddhi | Task: SAM-P2-4 | Priority: P2
import React from "react";
import Link from "next/link";

// TODO (SAM): Admin dashboard overview with platform totals and quick links to admin modules
export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Portal</h1>
      <p className="text-sm text-muted-foreground">Manage platform users, links, and domain blocklist.</p>
      <div className="grid grid-cols-3 gap-4">
        <Link href="/admin/users" className="rounded-lg border p-4 hover:bg-accent">
          <p className="font-semibold">Users</p>
          <p className="text-xs text-muted-foreground">Manage user accounts</p>
        </Link>
        <Link href="/admin/links" className="rounded-lg border p-4 hover:bg-accent">
          <p className="font-semibold">Links</p>
          <p className="text-xs text-muted-foreground">View and disable links</p>
        </Link>
        <Link href="/admin/blocklist" className="rounded-lg border p-4 hover:bg-accent">
          <p className="font-semibold">Blocklist</p>
          <p className="text-xs text-muted-foreground">Manage blocked domains</p>
        </Link>
      </div>
    </div>
  );
}
