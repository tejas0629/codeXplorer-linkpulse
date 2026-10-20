export const instant = false;
// Owner: Megha | Task: MEG-P1-1 | Priority: P1

import React from "react";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user
    ? {
        id: session.user.id ?? null,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        role: session.user.role ?? "USER",
      }
    : null;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <div className="hidden md:flex">
        <Sidebar user={user} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar user={user} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
