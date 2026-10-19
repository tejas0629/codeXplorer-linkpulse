// Owner: Megha | Task: MEG-P1-5 | Priority: P1
import React from "react";
import Link from "next/link";

// TODO (MEG): Links list table with search, status filters, and pagination
export default function LinksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Links</h1>
        <Link
          href="/links/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Create Link
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">Placeholder: Links table.</p>
    </div>
  );
}
