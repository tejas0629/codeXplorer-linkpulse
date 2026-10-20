// Owner: Samriddhi | Task: SAM-P1-3 | Priority: P1
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface TopLink {
  id: string;
  code: string;
  destinationUrl: string;
  clicks: number;
  status: string;
}

interface TopLinksTableProps {
  data?: TopLink[];
  loading?: boolean;
}

export function TopLinksTable({ data = [], loading = false }: TopLinksTableProps) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Top links</h3>
      </div>
      {loading ? (
        <div className="space-y-3 p-4" aria-label="Loading top links">
          {[0, 1, 2].map((row) => <div key={row} className="h-8 animate-pulse rounded bg-muted/50" />)}
        </div>
      ) : data.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">No links have click activity yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Short link</TableHead>
                <TableHead className="hidden md:table-cell">Destination</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">
                    <Link className="text-primary hover:underline" href={`/${encodeURIComponent(link.code)}`} target="_blank" rel="noreferrer">/{link.code}</Link>
                  </TableCell>
                  <TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">{link.destinationUrl}</TableCell>
                  <TableCell className="text-right tabular-nums">{link.clicks.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
