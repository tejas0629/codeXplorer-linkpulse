// Owner: Megha | Task: MEG-P1-6 | Priority: P1
import React from "react";
import Link from "next/link";

export const instant = false;

// TODO (MEG): Link details page with rules summary, QR code preview, and analytics component slot
export default async function LinkDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Link Details: {id}</h1>
        <Link
          href={`/links/${id}/edit`}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Edit Link
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">Placeholder: Link details, QR code, and per-link analytics.</p>
    </div>
  );
}
