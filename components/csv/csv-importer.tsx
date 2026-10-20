// Owner: Samriddhi | Task: SAM-P2-3 | Priority: P2
"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Papa from "papaparse";
import { Download, FileUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ImportPreviewTable, type ImportIssue, type ImportPreview, type ImportValidRow } from "@/components/csv/import-preview-table";

const sampleCsv = "destinationUrl,code\nhttps://example.com/launch,launch-demo\nnot-a-valid-url,bad-url\nhttps://example.com/duplicate,launch-demo\nhttps://example.com/seasonal,seasonal-demo\n";
const maxFileBytes = 1_000_000;

function previewLocally(csvText: string): ImportPreview {
  const parsed = Papa.parse<Record<string, string>>(csvText.replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: "greedy", transformHeader: (header) => header.trim().toLowerCase() });
  const rows = parsed.data;
  const seenCodes = new Set<string>();
  const seenUrls = new Set<string>();
  const validRows: ImportValidRow[] = [];
  const issues: ImportIssue[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const destinationUrl = row.destinationurl?.trim() ?? "";
    const code = row.code?.trim() || undefined;
    let error = "";
    if (!/^https?:\/\//i.test(destinationUrl)) error = "Invalid URL format; expected http or https";
    else if (code && seenCodes.has(code.toLowerCase())) error = "Duplicate alias in file";
    else if (!code && seenUrls.has(destinationUrl)) error = "Duplicate row in file";
    if (error) issues.push({ rowNumber, code, error });
    else {
      validRows.push({ rowNumber, destinationUrl, code });
      if (code) seenCodes.add(code.toLowerCase());
      seenUrls.add(destinationUrl);
    }
  });

  const duplicateCount = issues.filter((issue) => /duplicate|already taken/i.test(issue.error)).length;
  return { totalRows: rows.length, validCount: validRows.length, errorCount: issues.length - duplicateCount, duplicateCount, validRows, issues };
}

export function CsvImporter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<ImportPreview>();
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    setError("");
    setNotice("");
    setPreview(undefined);
    setUsingFallback(false);
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a CSV file.");
      event.target.value = "";
      return;
    }
    if (selected.size > maxFileBytes) {
      setError("CSV files must be 1 MB or smaller.");
      event.target.value = "";
      return;
    }
    setFile(selected);
    setLoadingPreview(true);
    try {
      const csvText = await selected.text();
      const response = await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: csvText,
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message || "CSV preview failed.");
      setPreview(body.data as ImportPreview);
    } catch (cause) {
      try {
        setPreview(previewLocally(await selected.text()));
        setUsingFallback(true);
        setNotice(cause instanceof Error ? `Preview API unavailable: ${cause.message}` : "Preview API unavailable.");
      } catch (parseError) {
        setError(parseError instanceof Error ? parseError.message : "Could not parse this CSV.");
      }
    } finally {
      setLoadingPreview(false);
    }
  }

  async function commit() {
    if (!preview || preview.validRows.length === 0) return;
    setCommitting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview.validRows.map(({ destinationUrl, code }) => ({ destinationUrl, code })) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message || "Import could not be committed.");
      setNotice(`Imported ${body.data.importedCount} link${body.data.importedCount === 1 ? "" : "s"}.`);
      setPreview(undefined);
      setFile(undefined);
      if (inputRef.current) inputRef.current.value = "";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import could not be committed.");
    } finally {
      setCommitting(false);
    }
  }

  function downloadSample() {
    const url = URL.createObjectURL(new Blob([sampleCsv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "linkpulse-demo-import.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setFile(undefined);
    setPreview(undefined);
    setError("");
    setNotice("");
    setUsingFallback(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Bulk CSV import</h1><p className="mt-1 text-sm text-muted-foreground">Validate destination URLs and aliases before creating links.</p></div>
      <Card className="rounded-lg shadow-none">
        <CardHeader><CardTitle className="text-base">Upload links</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input ref={inputRef} type="file" accept=".csv,text/csv" onChange={selectFile} aria-label="Choose CSV file" />
          <p className="text-xs text-muted-foreground">CSV columns: destinationUrl and optional code. Maximum size: 1 MB. Maximum rows: 500.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={downloadSample}><Download aria-hidden="true" />Download demo CSV</Button>
            {file && <Button type="button" variant="ghost" onClick={reset}><RotateCcw aria-hidden="true" />Clear file</Button>}
            {file && <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><FileUp aria-hidden="true" className="size-4" />{file.name}</span>}
          </div>
        </CardContent>
      </Card>
      {error && <p role="alert" className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="rounded-md border px-3 py-2 text-sm text-muted-foreground">{notice}</p>}
      {usingFallback && <p role="status" className="text-xs text-muted-foreground">Preview is local only. Server validation is required before import.</p>}
      {loadingPreview && <div className="space-y-3 rounded-lg border p-4" aria-label="Validating CSV"><div className="h-5 w-40 animate-pulse rounded bg-muted" />{[0, 1, 2].map((item) => <div key={item} className="h-10 animate-pulse rounded bg-muted/50" />)}</div>}
      <ImportPreviewTable preview={preview} />
      {preview && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Only validated rows are sent to the server.</p><Button type="button" disabled={committing || preview.validCount === 0 || usingFallback} onClick={commit}>{committing ? "Importing..." : `Import ${preview.validCount} valid rows`}</Button></div>}
    </div>
  );
}
