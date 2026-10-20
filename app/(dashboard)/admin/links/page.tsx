// Owner: Samriddhi | Task: SAM-P2-4 | Priority: P2
import { AdminLinksTable } from "@/components/admin/admin-links-table";

export default function AdminLinksPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">All links</h1><p className="mt-1 text-sm text-muted-foreground">Search and manage links across the platform.</p></div>
      <AdminLinksTable />
    </div>
  );
}
