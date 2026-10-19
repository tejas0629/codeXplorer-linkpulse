// Owner: Megha | Task: MEG-P1-1 | Priority: P1
import React from "react";

// TODO (MEG): Reusable loading spinner / skeleton placeholder
export function Loading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
      <span>{message}</span>
    </div>
  );
}
