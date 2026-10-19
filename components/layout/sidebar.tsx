"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Links", href: "/links" },
  { label: "Create Link", href: "/links/new" },
  { label: "Campaigns", href: "/campaigns" },
  { label: "QR Codes", href: "/qr-codes" },
  { label: "CSV Import", href: "/import" },
];

export function Sidebar() {
  const pathname = usePathname();

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
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              item.href !== "/links" &&
              pathname.startsWith(`${item.href}/`)) ||
            (item.href === "/links" &&
              pathname.startsWith("/links/") &&
              pathname !== "/links/new");

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border pt-4 text-xs text-muted-foreground">
        URL management made simple.
      </div>
    </aside>
  );
}
