// Owner: Megha | Task: MEG-P1-1 | Priority: P1

"use client";

import { useState } from "react";
import Image from "next/image";
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

          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="LinkPulse Logo"
              width={24}
              height={24}
              className="size-6 rounded object-contain md:hidden"
            />
            <h1 className="text-lg font-semibold tracking-tight">
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant={role === "ADMIN" ? "default" : "secondary"}
            className="hidden text-[11px] font-semibold sm:inline-flex"
          >
            {role}
          </Badge>

          <div className="flex items-center gap-2">
            <div
              className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
              aria-label={`User avatar for ${user?.name || user?.email || "User"}`}
            >
              {initial}
            </div>
            <div className="hidden flex-col text-left text-xs sm:flex">
              <span className="font-medium text-foreground leading-tight">
                {user?.name || "User"}
              </span>
              <span className="text-muted-foreground leading-tight">
                {user?.email || ""}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-50 flex md:hidden"
        >
          <div
            className="fixed inset-0 bg-black/50"
            aria-hidden="true"
            onClick={closeMenu}
          />
          <div className="relative flex h-full w-64 max-w-[80vw] flex-col bg-card shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="text-lg font-bold">
                Link<span className="text-blue-600">Pulse</span>
              </span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={closeMenu}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" onClick={closeMenu}>
              <Sidebar user={user} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
