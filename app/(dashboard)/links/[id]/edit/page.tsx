// Owner: Megha | Task: MEG-P2-1 | Priority: P2
import React from "react";

export const instant = false;

// TODO (MEG): Edit link destination URL, expiration date, max clicks, password, and tags
export default async function EditLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Edit Link: {id}</h1>
      <p className="text-sm text-muted-foreground">Placeholder: Edit link form.</p>
    </div>
  );
}
