
 // Owner: Megha | Task: MEG-P1-1 | Priority: P1

"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/links": "My Links",
  "/links/new": "Create Link",
  "/campaigns": "Campaigns",
  "/qr": "QR Codes",
  "/import": "CSV Import",
};

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const pageTitle =
    pageTitles[pathname] ??
    (pathname.startsWith("/links/") ? "Link Details" : "LinkPulse");

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
          >
            <span aria-hidden="true" className="text-xl">
              {menuOpen ? "×" : "☰"}
            </span>
          </button>

          <h1 className="text-lg font-semibold tracking-tight">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div
            aria-label="User profile placeholder"
            role="img"
            className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground"
          >
            U
          </div>

          <span className="hidden text-sm text-muted-foreground sm:inline">
            User
          </span>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop: click outside the menu to close it */}
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMenu}
            className="absolute inset-0 h-full w-full bg-black/50"
          />

          {/* Mobile navigation drawer */}
          <aside
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="absolute inset-y-0 left-0 z-10 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-border bg-background shadow-xl"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="font-semibold">LinkPulse</span>

              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={closeMenu}
                className="inline-flex min-h-11 items-center justify-center rounded-md px-3 py-2 text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Close
              </button>
            </div>

            <div onClick={closeMenu}>
              <Sidebar />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
