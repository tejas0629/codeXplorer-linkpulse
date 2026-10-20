// Owner: Samriddhi | Task: SAM-P1-6 | Priority: P1
import Link from "next/link";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <AnalyticsDashboard
        heading="Platform analytics"
        description="Platform-wide link performance across all accounts."
      />
      <nav aria-label="Admin sections" className="flex flex-wrap gap-3 border-t pt-5">
        <Link href="/admin/users" className="rounded-md border px-3 py-2 text-sm hover:bg-accent">
          <p className="font-semibold">Users</p>
        </Link>
        <Link href="/admin/links" className="rounded-md border px-3 py-2 text-sm hover:bg-accent">
          <p className="font-semibold">Links</p>
        </Link>
        <Link href="/admin/blocklist" className="rounded-md border px-3 py-2 text-sm hover:bg-accent">
          <p className="font-semibold">Blocklist</p>
        </Link>
      </nav>
    </div>
  );
}
