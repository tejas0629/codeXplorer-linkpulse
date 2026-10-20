
import Link from "next/link";
import { LinksTable } from "@/components/links/links-table";

export default function LinksPage() {
  return (
    <main className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Links</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your short links, monitor clicks, and update link settings.
          </p>
        </div>

        <Link
          href="/links/new"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Create Link
        </Link>
      </div>

      <LinksTable />
    </main>
  );
}
