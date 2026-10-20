// Owner: Megha | Task: MEG-P1-1 | Priority: P1

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SidebarUser {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

const standardNavigation = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Links", href: "/links" },
  { label: "Create Link", href: "/links/new" },
  { label: "Campaigns", href: "/campaigns" },
  { label: "CSV Import", href: "/import" },
  { label: "Redirect Trace", href: "/trace" },
];

const adminNavigation = [
  { label: "Platform Overview", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "All Links", href: "/admin/links" },
  { label: "Domain Blocklist", href: "/admin/blocklist" },
];

export function Sidebar({ user }: { user?: SidebarUser | null }) {
  const pathname = usePathname();

  function isItemActive(href: string): boolean {
    if (pathname === href) return true;
    if (href === "/links") {
      return pathname.startsWith("/links/") && pathname !== "/links/new";
    }
    if (href !== "/dashboard" && href !== "/admin") {
      return pathname.startsWith(`${href}/`);
    }
    return false;
  }

  const isAdminUser = user?.role === "ADMIN";

  return (
    <aside className="flex min-h-full w-64 shrink-0 flex-col border-r border-border bg-card p-5">
      <Link
        href="/dashboard"
        className="mb-8 rounded-md text-xl font-bold tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        Link<span className="text-blue-600">Pulse</span>
      </Link>

      <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Workspace
      </p>

      <nav aria-label="Main navigation" className="flex flex-col gap-1">
        {standardNavigation.map((item) => {
          const active = isItemActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                active
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {isAdminUser && (
        <>
          <div className="my-4 border-t border-border" />
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Administration
          </p>

          <nav aria-label="Admin navigation" className="flex flex-col gap-1">
            {adminNavigation.map((item) => {
              const active = isItemActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    active
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </>
      )}

      <div className="mt-auto border-t border-border pt-4 text-xs text-muted-foreground">
        URL management made simple.
      </div>
    </aside>
  );
}
