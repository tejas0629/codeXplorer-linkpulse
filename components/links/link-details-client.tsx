
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Eye,
  KeyRound,
  Link2,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import type { LinkDetailResponse } from "@/types/api";
import { LinkStatusBadge } from "@/components/links/link-status-badge";
import { PerLinkAnalytics } from "@/components/analytics/per-link-analytics";
import { QrDialog } from "@/components/qr/qr-dialog";

function formatDate(value: string | null) {
  if (!value) return "No expiry set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getShortUrl(code: string) {
  if (typeof window === "undefined") return `/${code}`;
  return `${window.location.origin}/${code}`;
}

export function LinkDetailsClient({ id }: { id: string }) {
  const [link, setLink] = useState<LinkDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const loadLink = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiClient<LinkDetailResponse>(
        `/api/links/${encodeURIComponent(id)}`
      );

      setLink(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load link details."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
  let cancelled = false;

  async function fetchLink() {
    try {
      const result = await apiClient<LinkDetailResponse>(
        `/api/links/${encodeURIComponent(id)}`
      );

      if (!cancelled) {
        setLink(result);
        setError("");
      }
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load link details."
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void fetchLink();

  return () => {
    cancelled = true;
  };
}, [id]);

  async function copyShortLink() {
    if (!link) return;

    try {
      await navigator.clipboard.writeText(getShortUrl(link.code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the link. Please copy it from the address shown.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-live="polite">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="h-36 animate-pulse rounded-xl border bg-muted/40" />
        <div className="h-48 animate-pulse rounded-xl border bg-muted/40" />
        <p className="text-sm text-muted-foreground">Loading link details...</p>
      </div>
    );
  }

  if (error || !link) {
    return (
      <section className="space-y-4 rounded-xl border p-6">
        <h1 className="text-xl font-semibold">Unable to load link</h1>
        <p role="alert" className="text-sm text-destructive">
          {error || "This link could not be found."}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadLink()}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent"
          >
            <RefreshCw className="size-4" />
            Try again
          </button>
          <Link
            href="/links"
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            Back to links
          </Link>
        </div>
      </section>
    );
  }

  const shortUrl = getShortUrl(link.code);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/links"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to links
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Link details</h1>
          <p className="text-sm text-muted-foreground">
            View the destination, settings, and activity for this link.
          </p>
        </div>

        <Link
          href={`/links/${encodeURIComponent(link.id)}/edit`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Edit link
        </Link>
      </div>

      <section className="space-y-5 rounded-xl border p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link2 className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Short link</h2>
          </div>
          <LinkStatusBadge status={link.status} />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="min-w-0 flex-1 rounded-lg bg-muted/50 p-3">
            <a
              href={shortUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm font-medium text-primary hover:underline"
            >
              {shortUrl}
            </a>
          </div>

          <button
            type="button"
            onClick={() => void copyShortLink()}
            className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied ? "Copied" : "Copy link"}
          </button>

          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <QrCode className="size-4" />
            QR code
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Destination URL</p>
          <a
            href={link.destinationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-start gap-2 break-all text-sm text-muted-foreground hover:text-primary"
          >
            <span>{link.destinationUrl}</span>
            <ExternalLink className="mt-0.5 size-4 shrink-0" />
          </a>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Overview</h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="size-4" />
              Total clicks
            </div>
            <p className="mt-3 text-2xl font-bold">{link.clickCount}</p>
          </div>

          <div className="rounded-xl border p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="size-4" />
              Created
            </div>
            <p className="mt-3 text-sm font-semibold">
              {formatDate(link.createdAt)}
            </p>
          </div>

          <div className="rounded-xl border p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="size-4" />
              Expiration
            </div>
            <p className="mt-3 text-sm font-semibold">
              {formatDate(link.expiresAt)}
            </p>
          </div>

          <div className="rounded-xl border p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <KeyRound className="size-4" />
              Password protection
            </div>
            <p className="mt-3 text-sm font-semibold">
              {link.hasPassword ? "Enabled" : "Not enabled"}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Link rules and settings</h2>

        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Click limit</dt>
            <dd className="mt-1 font-medium">
              {link.maxClicks == null
                ? "No limit set"
                : `${link.maxClicks} clicks`}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-muted-foreground">Campaign</dt>
            <dd className="mt-1 break-all font-medium">
              {link.campaignId || "No campaign assigned"}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-muted-foreground">Mobile destination</dt>
            <dd className="mt-1 break-all font-medium">
              {link.mobileUrl || "No separate mobile destination"}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-muted-foreground">Last updated</dt>
            <dd className="mt-1 font-medium">{formatDate(link.updatedAt)}</dd>
          </div>
        </dl>

        <div>
          <h3 className="text-sm font-medium">Tags</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {link.tags?.length ? (
              link.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-3 py-1 text-xs"
                >
                  {tag}
                </span>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No tags assigned.</p>
            )}
          </div>
        </div>
      </section>

      <PerLinkAnalytics linkId={link.id} />

      <QrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        code={link.code}
      />
    </div>
  );
}
