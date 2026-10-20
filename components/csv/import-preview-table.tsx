// Owner: Samriddhi | Task: SAM-P2-3 | Priority: P2
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface ImportValidRow {
  rowNumber: number;
  destinationUrl: string;
  code?: string;
}

export interface ImportIssue {
  rowNumber: number;
  code?: string;
  error: string;
}

export interface ImportPreview {
  totalRows: number;
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  validRows: ImportValidRow[];
  issues: ImportIssue[];
}

export function ImportPreviewTable({ preview }: { preview?: ImportPreview }) {
  if (!preview) return null;

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Preview rows</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{preview.validCount} valid</Badge>
          <Badge variant="destructive">{preview.errorCount} errors</Badge>
          <Badge variant="outline">{preview.duplicateCount} duplicates</Badge>
        </div>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Row</TableHead><TableHead>Code</TableHead><TableHead>Destination URL</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {preview.validRows.map((row) => <TableRow key={`valid-${row.rowNumber}`} className="bg-emerald-500/[0.035]"><TableCell>{row.rowNumber}</TableCell><TableCell>{row.code || "Auto-generated"}</TableCell><TableCell className="max-w-sm truncate">{row.destinationUrl}</TableCell><TableCell><Badge variant="secondary">Valid</Badge></TableCell></TableRow>)}
          {preview.issues.map((issue) => {
            const duplicate = /duplicate|already taken/i.test(issue.error);
            return <TableRow key={`issue-${issue.rowNumber}`} className={duplicate ? "bg-amber-500/[0.035]" : "bg-destructive/[0.035]"}><TableCell>{issue.rowNumber}</TableCell><TableCell>{issue.code || "-"}</TableCell><TableCell className="max-w-sm truncate text-muted-foreground">{issue.error}</TableCell><TableCell><Badge variant={duplicate ? "outline" : "destructive"}>{duplicate ? "Duplicate" : "Error"}</Badge></TableCell></TableRow>;
          })}
          {preview.totalRows === 0 && <TableRow><TableCell colSpan={4} className="h-20 text-center text-muted-foreground">No rows to preview.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </section>
  );
}
