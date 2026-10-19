// Owner: Samriddhi | Task: SAM-P1-3 | Priority: P1
import React from "react";

// TODO (SAM): Breakdown charts for devices, browsers, and referrers
export function BreakdownChart({ title = "Breakdown" }: { title?: string }) {
  return (
    <div className="h-64 flex flex-col items-center justify-center border rounded-lg p-4 space-y-2">
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">Placeholder: Category breakdown visualization</p>
    </div>
  );
}
