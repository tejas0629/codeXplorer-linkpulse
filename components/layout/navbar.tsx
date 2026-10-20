// Owner: Megha | Task: MEG-P1-1 | Priority: P1

"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/links": "My Links",
  "/links/new": "Create Link",
  "/campaigns": "Campaigns",
  "/import": "CSV Import",
  "/trace": "Redirect Trace",
  "/admin": "Admin Overview",
  "/admin/users": "User Management",
  "/admin/links": "All Platform Links",
  "/admin/blocklist": "Domain Blocklist",
};

export interface NavbarUser {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export function Navbar({ user }: { user?: NavbarUser | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const pageTitle =
    pageTitles[pathname] ??
    (pathname.startsWith("/links/") ? "Link Details" : "LinkPulse");

  function closeMenu() {
    setMenuOpen(false);
  }

  const initial = (
    user?.name?.[0] ||
    user?.email?.[0] ||
    "U"
  ).toUpperCase();

  const role = user?.role || "USER";

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
            {menuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>

          <h1 className="text-lg font-semibold tracking-tight">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div
            aria-label="User avatar"
            role="img"
            className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
          >
            {initial}
          </div>

          <div className="hidden flex-col sm:flex">
            <span className="text-sm font-medium leading-none text-foreground">
              {user?.name || user?.email || "User"}
            </span>
            {user?.email && user?.name && (
              <span className="text-xs text-muted-foreground">{user.email}</span>
            )}
          </div>

          <Badge variant={role === "ADMIN" ? "default" : "secondary"} className="text-xs">
            {role}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="gap-1.5 text-xs font-medium"
          >
            <LogOut className="size-3.5" />
            Sign out
          </Button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMenu}
            className="absolute inset-0 h-full w-full bg-black/50"
          />

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
              <Sidebar user={user} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
