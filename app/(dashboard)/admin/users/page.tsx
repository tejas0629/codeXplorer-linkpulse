// Owner: Samriddhi | Task: SAM-P2-4 | Priority: P2
import { UsersTable } from "@/components/admin/users-table";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Users</h1><p className="mt-1 text-sm text-muted-foreground">Platform accounts and link creation totals.</p></div>
      <UsersTable />
    </div>
  );
}
