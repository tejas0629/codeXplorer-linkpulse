// Owner: Megha | Task: MEG-P1-1 | Priority: P1
import React from "react";
import Link from "next/link";

// TODO (MEG): Sidebar navigation with links to dashboard, links, campaigns, import, and admin
export function Sidebar() {
  return (
    <aside className="w-64 border-r p-4 space-y-4">
      <div className="font-bold">LinkPulse</div>
      <nav className="flex flex-col space-y-2 text-sm">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <Link href="/links" className="hover:underline">Links</Link>
        <Link href="/campaigns" className="hover:underline">Campaigns</Link>
        <Link href="/import" className="hover:underline">Import</Link>
      </nav>
    </aside>
  );
}
