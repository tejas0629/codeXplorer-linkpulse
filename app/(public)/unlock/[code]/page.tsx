// Owner: Megha | Task: MEG-P1-7 | Priority: P1
import React from "react";

export const instant = false;

// TODO (MEG): Password prompt page for password-protected short links
export default async function UnlockPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border p-6 shadow-sm text-center">
        <h1 className="text-2xl font-bold">Password Protected Link</h1>
        <p className="text-sm text-muted-foreground">
          Enter the password to access the destination for link:{" "}
          <span className="font-semibold">{code}</span>
        </p>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Placeholder: Password input form</p>
        </div>
      </div>
    </div>
  );
}
