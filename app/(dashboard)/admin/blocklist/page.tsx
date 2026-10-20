// Owner: Samriddhi | Task: SAM-P2-4 | Priority: P2
import { BlocklistManager } from "@/components/admin/blocklist-manager";

export default function AdminBlocklistPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Domain blocklist</h1><p className="mt-1 text-sm text-muted-foreground">Prevent links from being created for blocked domains.</p></div>
      <BlocklistManager />
    </div>
  );
}
