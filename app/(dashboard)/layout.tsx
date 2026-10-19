// Owner: Megha | Task: MEG-P1-1 | Priority: P1
import React from "react";

// TODO (MEG): App shell with responsive sidebar, navbar, and main content area
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-muted/30 p-4">
        <p className="font-semibold mb-4">LinkPulse</p>
        <nav className="space-y-2 text-sm text-muted-foreground">
          <p>Sidebar Slot</p>
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="h-14 border-b px-6 flex items-center justify-between">
          <p className="text-sm font-medium">Navbar Slot</p>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
