// Owner: Megha | Task: MEG-P2-1 | Priority: P2

"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LinkDetailResponse } from "@/types/api";

export default function EditLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [code, setCode] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "DISABLED">("ACTIVE");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxClicks, setMaxClicks] = useState("");
  const [password, setPassword] = useState("");
  const [mobileUrl, setMobileUrl] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadLink() {
      try {
        const data = await apiClient<LinkDetailResponse>(
          `/api/links/${encodeURIComponent(id)}`
        );
        if (!cancelled) {
          setCode(data.code);
          setDestinationUrl(data.destinationUrl);
          setStatus(data.status === "DISABLED" ? "DISABLED" : "ACTIVE");
          setExpiresAt(data.expiresAt ? data.expiresAt.slice(0, 16) : "");
          setMaxClicks(data.maxClicks != null ? String(data.maxClicks) : "");
          setMobileUrl(data.mobileUrl || "");
          setTags(data.tags ? data.tags.join(", ") : "");
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load link.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLink();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const tagNames = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        destinationUrl: destinationUrl.trim(),
        status,
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : { expiresAt: null }),
        ...(maxClicks ? { maxClicks: Number(maxClicks) } : { maxClicks: null }),
        ...(password ? { password } : {}),
        ...(mobileUrl.trim() ? { mobileUrl: mobileUrl.trim() } : { mobileUrl: null }),
        tagNames,
      };

      await apiClient(`/api/links/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      toast.success("Link updated successfully");
      router.push(`/links/${encodeURIComponent(id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update link.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this link? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      await apiClient(`/api/links/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      toast.success("Link deleted successfully");
      router.push("/links");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete link.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
        <Loader2 className="size-4 animate-spin" />
        Loading link details...
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            href={`/links/${encodeURIComponent(id)}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to link details
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Edit Link</h1>
          <p className="text-sm text-muted-foreground">
            Update settings and rules for <span className="font-semibold text-foreground">/{code}</span>
          </p>
        </div>

        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => void handleDelete()}
          disabled={deleting}
          className="gap-1.5"
        >
          <Trash2 className="size-4" />
          {deleting ? "Deleting..." : "Delete link"}
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <label htmlFor="edit-destination" className="text-sm font-medium">
            Destination URL
          </label>
          <Input
            id="edit-destination"
            type="url"
            required
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            placeholder="https://example.com/target"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="edit-status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="edit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as "ACTIVE" | "DISABLED")}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="DISABLED">DISABLED</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="edit-expiry" className="text-sm font-medium">
              Expiration Date
            </label>
            <Input
              id="edit-expiry"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="edit-clicks" className="text-sm font-medium">
              Click Limit
            </label>
            <Input
              id="edit-clicks"
              type="number"
              min="1"
              value={maxClicks}
              onChange={(e) => setMaxClicks(e.target.value)}
              placeholder="No limit"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="edit-mobile" className="text-sm font-medium">
            Mobile Destination URL (optional)
          </label>
          <Input
            id="edit-mobile"
            type="url"
            value={mobileUrl}
            onChange={(e) => setMobileUrl(e.target.value)}
            placeholder="https://m.example.com"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="edit-password" className="text-sm font-medium">
            Update Password Protection (leave empty to keep current)
          </label>
          <Input
            id="edit-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="edit-tags" className="text-sm font-medium">
            Tags (comma-separated)
          </label>
          <Input
            id="edit-tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="marketing, summer, promo"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            asChild
          >
            <Link href={`/links/${encodeURIComponent(id)}`}>Cancel</Link>
          </Button>

          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="size-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
