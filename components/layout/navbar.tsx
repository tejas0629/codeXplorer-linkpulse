// Owner: Megha | Task: MEG-P1-1 | Priority: P1
import React from "react";

// TODO (MEG): Top navigation bar with user profile dropdown and breadcrumbs
export function Navbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div className="font-semibold text-sm">LinkPulse</div>
      <div className="text-xs text-muted-foreground">User Menu</div>
    </header>
  );
}
