
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { LinkListItem, LinkListQuery } from "@/types/api";
import { apiClient } from "@/lib/api";
import { LinkStatusBadge } from "@/components/links/link-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LinksResponse {
  items?: LinkListItem[];
  links?: LinkListItem[];
  data?: LinkListItem[];
}

interface ApiListResult {
  items: LinkListItem[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 10;

export function LinksTable() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ApiListResult>({
    items: [],
    total: 0,
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLinks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params: LinkListQuery = {
        page,
        pageSize: PAGE_SIZE,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(status !== "ALL"
          ? { status: status as LinkListQuery["status"] }
          : {}),
      };

      const response = await apiClient<LinksResponse | LinkListItem[]>(
        "/api/links",
        { params: params as Record<string, string | number | undefined> }
      );

      const items = Array.isArray(response)
        ? response
        : response.items ?? response.links ?? response.data ?? [];

      setResult({
        items,
        total: items.length,
        page,
        pageSize: PAGE_SIZE,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load links. Please try again."
      );
      setResult({
        items: [],
        total: 0,
        page,
        pageSize: PAGE_SIZE,
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadLinks();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [loadLinks]);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Search links</span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by alias or destination..."
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-48" aria-label="Filter by status">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DISABLED">Disabled</SelectItem>
            <SelectItem value="ADMIN_DISABLED">Admin disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Short link</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Clicks</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                  Loading links...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <p className="font-medium">Could not load links</p>
                  <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                  <button
                    type="button"
                    onClick={() => void loadLinks()}
                    className="mt-3 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Try again
                  </button>
                </TableCell>
              </TableRow>
            ) : result.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                  {search || status !== "ALL"
                    ? "No links match your filters."
                    : "You haven't created any links yet."}
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/${encodeURIComponent(item.code)}`}
                      className="text-primary hover:underline"
                    >
                      /{item.code}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <span className="block truncate" title={item.destinationUrl}>
                      {item.destinationUrl}
                    </span>
                  </TableCell>
                  <TableCell>
                    <LinkStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>{item.clickCount}</TableCell>
                  <TableCell>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/links/${encodeURIComponent(item.id)}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Details
                      </Link>
                      <Link
                        href={`/links/${encodeURIComponent(item.id)}/edit`}
                        className="text-sm text-primary hover:underline"
                      >
                        Edit
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
        <p className="text-muted-foreground">
          {result.total} link{result.total === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-md border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-md border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
