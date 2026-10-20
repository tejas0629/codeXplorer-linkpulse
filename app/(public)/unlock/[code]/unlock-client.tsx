"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function UnlockClient({ code }: { code: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      setError("Please enter the password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/unlock/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error?.message || "Incorrect password. Please try again.");
      }

      router.push(`/${encodeURIComponent(code)}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlock failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="size-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Password Protected Link</h1>
          <p className="text-sm text-muted-foreground">
            This link is protected. Enter the password for <span className="font-semibold text-foreground">/{code}</span> to continue.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="unlock-password" className="text-xs font-medium text-foreground">
              Password
            </label>
            <Input
              id="unlock-password"
              type="password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter link password"
              disabled={loading}
              className="w-full"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full gap-2">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Unlocking...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
