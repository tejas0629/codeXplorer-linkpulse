// Owner: Samriddhi | Task: SAM-P2-6 | Priority: P2
"use client";

import { useState, type FormEvent } from "react";
import { Check, CircleX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TraceStep {
  rule: string;
  passed: boolean;
  detail: string;
}

interface TraceResult {
  code: string;
  steps: TraceStep[];
  outcome: string;
  targetUrl?: string;
}

function normalizeCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    const code = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
    return code.toLowerCase();
  } catch {
    return trimmed.replace(/^\/+|\/+$/g, "").split(/[?#]/, 1)[0].toLowerCase();
  }
}

export default function TracePage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<TraceResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function trace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = normalizeCode(code);
    if (normalizedCode.length < 3 || normalizedCode.length > 64 || !/^[a-z0-9-]+$/.test(normalizedCode)) {
      setError("Enter a valid short code or short URL (3 to 64 letters, numbers, or hyphens).");
      return;
    }
    setLoading(true);
    setError("");
    setResult(undefined);
    try {
      const response = await fetch(`/api/trace?code=${encodeURIComponent(normalizedCode)}`, { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || "Could not trace this link.");
      setResult(body.data as TraceResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not trace this link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Redirect trace</h1><p className="mt-1 text-sm text-muted-foreground">Inspect the redirect rules evaluated for a short code.</p></div>
      <form onSubmit={trace} className="flex max-w-xl gap-2"><Input required maxLength={2048} value={code} onChange={(event) => setCode(event.target.value)} placeholder="short-code or https://sho.rt/short-code" aria-label="Short code or short URL" /><Button type="submit" disabled={loading}><Search aria-hidden="true" />{loading ? "Tracing..." : "Trace link"}</Button></form>
      {error && <p role="alert" className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p>}
      {loading && <div className="space-y-3 rounded-lg border p-4" aria-label="Loading trace">{[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-10 animate-pulse rounded bg-muted" />)}</div>}
      {result && <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"><div><h2 className="font-semibold">/{result.code}</h2><p className="text-sm text-muted-foreground">Outcome: {result.outcome}</p></div>{result.targetUrl && <a className="max-w-full truncate text-sm text-primary hover:underline" href={result.targetUrl} target="_blank" rel="noreferrer">{result.targetUrl}</a>}</div>
        <ol className="divide-y">{result.steps.map((step, index) => <li key={`${step.rule}-${index}`} className="flex items-start gap-3 px-4 py-3"><span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${step.passed ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>{step.passed ? <Check className="size-4" aria-label="Passed" /> : <CircleX className="size-4" aria-label="Failed" />}</span><div className="min-w-0"><p className="text-sm font-medium">{step.rule.replaceAll("_", " ")}</p><p className="text-sm text-muted-foreground">{step.detail}</p></div><span className={`ml-auto text-xs font-medium ${step.passed ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>{step.passed ? "PASS" : "FAIL"}</span></li>)}</ol>
      </section>}
    </div>
  );
}
