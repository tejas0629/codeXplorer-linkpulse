// Owner: Megha | Task: MEG-P1-1 | Priority: P1

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto max-w-md space-y-4">
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          404 Not Found
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Page Not Found
        </h1>
        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="pt-2">
          <Button asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
